/**
 * MHENT WORKSPACE - FIRESTORE CLOUD REALTIME SYNC ENGINE (CLOUD.JS)
 * Đồng bộ hóa thời gian thực 100% qua Firebase Cloud Firestore
 */
window.CloudModule = {
  db: null,
  activeListeners: [],
  currentWsCode: null,
  isLive: false,

  init() {
    if (typeof firebase === "undefined" || !firebase.apps.length) {
      console.warn("[Cloud Engine] Firebase chưa sẵn sàng, chờ khởi tạo...");
      return;
    }

    try {
      this.db = firebase.firestore();
      this.isLive = true;
      console.log("[Cloud Engine] ✅ Đã kết nối Firebase Cloud Firestore thành công!");

      // Bắt đầu lắng nghe dữ liệu theo mã Workspace hiện tại
      const wsCode = window.store.state.workspace.code || "MHENT-CORE-2026";
      this.bindWorkspace(wsCode);
    } catch (err) {
      console.error("[Cloud Engine] Lỗi kết nối Firestore:", err);
    }
  },

  // Hủy các listener cũ khi chuyển Workspace
  detachListeners() {
    this.activeListeners.forEach(unsubscribe => {
      if (typeof unsubscribe === "function") unsubscribe();
    });
    this.activeListeners = [];
  },

  bindWorkspace(wsCode) {
    if (!this.isLive || !this.db) return;
    this.detachListeners();
    this.currentWsCode = wsCode.toUpperCase();

    const wsDocRef = this.db.collection("workspaces").doc(this.currentWsCode);

    // Đảm bảo document workspace tồn tại trên Firestore
    wsDocRef.set({
      code: this.currentWsCode,
      name: window.store.state.workspace.name,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 1. 💬 REALTIME CHAT STREAM (Đa Kênh)
    ["general", "media", "dev"].forEach(channelId => {
      const unsubChat = wsDocRef.collection("channels").doc(channelId).collection("messages")
        .orderBy("createdAt", "asc")
        .limitToLast(50)
        .onSnapshot((snapshot) => {
          const messages = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            const now = data.createdAt ? data.createdAt.toDate() : new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            messages.push({
              id: doc.id,
              sender: data.sender || "Thành viên",
              avt: data.avt || "👤",
              time: timeStr,
              text: data.text || "",
              isSelf: data.senderId === window.store.state.currentUser.id,
              isBot: data.isBot || false
            });
          });

          if (messages.length > 0) {
            window.store.state.chatChannels[channelId] = messages;
            if (window.store.state.activeChannel === channelId && window.ChatModule) {
              window.ChatModule.renderMessages();
            }
          }
        }, (err) => console.warn(`[Chat Stream ${channelId}] Lỗi:`, err));

      this.activeListeners.push(unsubChat);
    });

    // 2. 📋 REALTIME TODO KANBAN (Đồng bộ mọi thiết bị)
    const unsubTasks = wsDocRef.collection("tasks")
      .onSnapshot((snapshot) => {
        const tasks = [];
        snapshot.forEach(doc => {
          tasks.push({ id: doc.id, ...doc.data() });
        });

        if (tasks.length > 0) {
          window.store.state.tasks = tasks;
          if (window.TodoModule) window.TodoModule.renderBoard();
        }
      }, (err) => console.warn("[Tasks Stream] Lỗi:", err));
    this.activeListeners.push(unsubTasks);

    // 3. ✉️ REALTIME EMAILS NỘI BỘ
    const unsubMails = wsDocRef.collection("emails")
      .orderBy("createdAt", "desc")
      .onSnapshot((snapshot) => {
        const mails = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          mails.push({
            id: doc.id,
            from: data.from,
            fromEmail: data.fromEmail,
            subject: data.subject,
            time: data.time || "Vừa xong",
            starred: data.starred || false,
            read: data.read || true,
            body: data.body || ""
          });
        });

        if (mails.length > 0) {
          window.store.state.mails = mails;
          if (window.MailModule) {
            window.MailModule.renderMailList();
            window.MailModule.renderActiveMail();
          }
        }
      }, (err) => console.warn("[Emails Stream] Lỗi:", err));
    this.activeListeners.push(unsubMails);

    // 4. 📅 REALTIME CALENDAR EVENTS
    const unsubEvents = wsDocRef.collection("events")
      .onSnapshot((snapshot) => {
        const events = [];
        snapshot.forEach(doc => {
          events.push({ id: doc.id, ...doc.data() });
        });

        if (events.length > 0) {
          window.store.state.events = events;
          if (window.CalendarModule) window.CalendarModule.renderCalendar();
        }
      }, (err) => console.warn("[Events Stream] Lỗi:", err));
    this.activeListeners.push(unsubEvents);

    console.log(`[Cloud Engine] ⚡ Đã bật Radar Cloud Realtime cho Workspace: [${this.currentWsCode}]`);
  },

  // ==========================================
  // CLOUD WRITE ACTIONS (GHI DỮ LIỆU LÊN CLOUD)
  // ==========================================

  // Gửi tin nhắn Chat lên Cloud
  async sendChatMessage(channelId, text, isBot = false, customSender = null) {
    if (!this.isLive || !this.db) return false;

    const user = customSender || window.store.state.currentUser;
    const wsCode = this.currentWsCode || "MHENT-CORE-2026";

    try {
      await this.db.collection("workspaces").doc(wsCode)
        .collection("channels").doc(channelId)
        .collection("messages").add({
          sender: user.name,
          senderId: user.id || "guest",
          avt: user.avatar || "👤",
          text: text,
          isBot: isBot,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      return true;
    } catch (err) {
      console.error("[Cloud Chat] Lỗi gửi:", err);
      return false;
    }
  },

  // Tạo Task lên Cloud & Tự động đồng bộ Lịch + Bắn thông báo Chat
  async createTask(taskData) {
    if (!this.isLive || !this.db) return false;

    const wsCode = this.currentWsCode || "MHENT-CORE-2026";
    try {
      // 1. Thêm Task vào Firestore
      const docRef = await this.db.collection("workspaces").doc(wsCode)
        .collection("tasks").add({
          ...taskData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      // 2. SYNERGY: Tự động thêm sự kiện Deadline vào Calendar Cloud
      if (taskData.deadline) {
        await this.db.collection("workspaces").doc(wsCode)
          .collection("events").add({
            title: `Deadline: ${taskData.title}`,
            date: taskData.deadline,
            time: "23:59",
            type: "deadline",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
      }

      // 3. SYNERGY: Tự động bắn thông báo vào kênh Chat #general
      await this.sendChatMessage("general", `📋 **[Todo Bot]** ${window.store.state.currentUser.name} vừa giao việc mới: **${taskData.title}** (Phụ trách: ${taskData.assignee} • Hạn: ${taskData.deadline})`, "harmony", {
        name: "Todo System",
        avatar: "📋",
        id: "bot-todo"
      });

      return docRef.id;
    } catch (err) {
      console.error("[Cloud Task] Lỗi tạo task:", err);
      return false;
    }
  },

  // Cập nhật trạng thái Task (Kéo thả Kanban) lên Cloud
  async updateTaskStatus(taskId, newStatus) {
    if (!this.isLive || !this.db) return false;

    const wsCode = this.currentWsCode || "MHENT-CORE-2026";
    try {
      await this.db.collection("workspaces").doc(wsCode)
        .collection("tasks").doc(taskId).update({
          status: newStatus,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      return true;
    } catch (err) {
      console.error("[Cloud Task Status] Lỗi cập nhật:", err);
      return false;
    }
  },

  // Gửi Email nội bộ lên Cloud
  async sendEmail(mailData) {
    if (!this.isLive || !this.db) return false;

    const wsCode = this.currentWsCode || "MHENT-CORE-2026";
    try {
      await this.db.collection("workspaces").doc(wsCode)
        .collection("emails").add({
          ...mailData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      // SYNERGY: Thông báo có thư mới vào kênh chat #general
      await this.sendChatMessage("general", `✉️ **[Mail Bot]** Thư mới từ **${mailData.from}**: *"${mailData.subject}"*`, "echo", {
        name: "Mail System",
        avatar: "✉️",
        id: "bot-mail"
      });

      return true;
    } catch (err) {
      console.error("[Cloud Email] Lỗi gửi email:", err);
      return false;
    }
  },

  // Thêm sự kiện Lịch lên Cloud
  async createCalendarEvent(eventData) {
    if (!this.isLive || !this.db) return false;

    const wsCode = this.currentWsCode || "MHENT-CORE-2026";
    try {
      await this.db.collection("workspaces").doc(wsCode)
        .collection("events").add({
          ...eventData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      return true;
    } catch (err) {
      console.error("[Cloud Event] Lỗi tạo sự kiện:", err);
      return false;
    }
  },

  // Thông báo phòng họp Meet vào kênh chat
  async broadcastMeeting(roomName, fullRoomUrl) {
    if (!this.isLive || !this.db) return false;

    const user = window.store.state.currentUser;
    await this.sendChatMessage("general", `📹 **[Meet Bot]** ${user.name} vừa mở phòng họp **#${roomName}**! [Bấm vào đây để tham gia ngay](${fullRoomUrl})`, "harmony", {
      name: "Meet System",
      avatar: "📹",
      id: "bot-meet"
    });
  }
};
