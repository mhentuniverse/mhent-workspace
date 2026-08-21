/**
 * MHENT WORKSPACE - FIRESTORE & SUPABASE HYBRID CLOUD ENGINE (CLOUD.JS)
 * Đồng bộ hóa dữ liệu thời gian thực theo Firebase UID & Supabase Cloud Storage
 */
window.CloudModule = {
  db: null,
  sb: null,
  activeListeners: [],
  currentWsCode: "MHENT-CORE-2026",
  currentUserId: null,
  isLive: false,

  init() {
    this.initSupabase();
    this.initFirestore();
  },

  initSupabase() {
    if (typeof supabase !== "undefined" && window.MHENT_CONFIG && window.MHENT_CONFIG.SUPABASE_CONFIG) {
      try {
        this.sb = supabase.createClient(
          window.MHENT_CONFIG.SUPABASE_CONFIG.URL,
          window.MHENT_CONFIG.SUPABASE_CONFIG.KEY
        );
        window.supabaseClient = this.sb;
        console.log("[Cloud Engine] ✅ Đã kết nối Supabase Cloud thành công!");
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi khởi tạo Supabase:", err);
      }
    }
  },

  initFirestore() {
    if (typeof firebase === "undefined" || !firebase.apps.length) {
      console.warn("[Cloud Engine] Firebase chưa sẵn sàng, chờ khởi tạo...");
      return;
    }

    try {
      this.db = firebase.firestore();
      this.isLive = true;
      console.log("[Cloud Engine] ✅ Đã kết nối Firebase Cloud Firestore thành công!");

      const wsCode = window.store.state.workspace.code || "MHENT-CORE-2026";
      this.bindWorkspace(wsCode);
    } catch (err) {
      console.error("[Cloud Engine] Lỗi kết nối Firestore:", err);
    }
  },

  setUser(uid, userData) {
    this.currentUserId = uid;
    console.log(`[Cloud Engine] 👤 Đã liên kết tài khoản Firebase UID: ${uid}`);
    
    // Tải danh sách Workspace & Dữ liệu riêng tư của User từ Supabase
    this.loadUserWorkspacesFromSupabase(uid);
    this.loadUserDataFromSupabase(uid);
  },

  async loadUserDataFromSupabase(uid) {
    if (!this.sb || !uid) return;

    try {
      // 1. Tải tasks riêng của user hoặc của workspace
      const { data: tasksData, error: taskErr } = await this.sb
        .from('workspace_tasks')
        .select('*')
        .or(`user_id.eq.${uid},workspace_code.eq.${this.currentWsCode}`);

      if (!taskErr && tasksData && tasksData.length > 0) {
        window.store.state.tasks = tasksData;
        if (window.TodoModule) window.TodoModule.renderBoard();
      }

      // 2. Tải mails của user
      const { data: mailsData, error: mailErr } = await this.sb
        .from('workspace_mails')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (!mailErr && mailsData && mailsData.length > 0) {
        window.store.state.mails = mailsData;
        if (window.MailModule) window.MailModule.renderMailList();
      }

      // 3. Tải files của user
      const { data: filesData, error: fileErr } = await this.sb
        .from('workspace_files')
        .select('*')
        .or(`user_id.eq.${uid},workspace_code.eq.${this.currentWsCode}`);

      if (!fileErr && filesData && filesData.length > 0) {
        window.store.state.files = filesData;
        if (window.DriveModule) window.DriveModule.renderFiles();
      }

      // 4. Tải notes của user
      const { data: notesData, error: noteErr } = await this.sb
        .from('workspace_notes')
        .select('*')
        .eq('user_id', uid);

      if (!noteErr && notesData && notesData.length > 0) {
        window.store.state.notes = notesData;
        if (window.ToolsModule && typeof window.ToolsModule.renderNotes === 'function') {
          window.ToolsModule.renderNotes();
        }
      }
    } catch (e) {
      console.warn("[Cloud Engine] Không thể tải dữ liệu Supabase (dùng cache local):", e);
    }
  },

  detachListeners() {
    this.activeListeners.forEach(unsubscribe => {
      if (typeof unsubscribe === "function") unsubscribe();
    });
    this.activeListeners = [];
  },

  bindWorkspace(wsCode) {
    if (!this.db) return;
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
        .limitToLast(60)
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
              isSelf: data.senderId === (this.currentUserId || window.store.state.currentUser.id),
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

    // 2. 📋 REALTIME TODO KANBAN
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
  },

  // ==========================================
  // CLOUD WRITE HELPERS (SUPABASE + FIRESTORE)
  // ==========================================

  async pushChatMessage(channelId, msg) {
    // 1. Lưu Local state
    window.store.addChatMessage(channelId, msg);

    // 2. Lưu Firestore
    if (this.db) {
      try {
        await this.db.collection("workspaces").doc(this.currentWsCode)
          .collection("channels").doc(channelId).collection("messages").add({
            sender: msg.sender,
            senderId: this.currentUserId || window.store.state.currentUser.id,
            avt: msg.avt,
            text: msg.text,
            isBot: msg.isBot || false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi gửi chat Firestore:", err);
      }
    }

    // 3. Lưu Supabase
    if (this.sb) {
      try {
        await this.sb.from('workspace_messages').insert([{
          id: msg.id,
          user_id: this.currentUserId || window.store.state.currentUser.id,
          workspace_code: this.currentWsCode,
          channel: channelId,
          sender: msg.sender,
          avt: msg.avt,
          text: msg.text,
          is_bot: !!msg.isBot
        }]);
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi gửi chat Supabase:", err);
      }
    }
  },

  async pushTask(task) {
    // 1. Lưu Local
    window.store.addTask(task);

    // 2. Lưu Firestore
    if (this.db) {
      try {
        await this.db.collection("workspaces").doc(this.currentWsCode)
          .collection("tasks").doc(task.id).set({
            ...task,
            userId: this.currentUserId || window.store.state.currentUser.id,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi lưu task Firestore:", err);
      }
    }

    // 3. Lưu Supabase
    if (this.sb) {
      try {
        await this.sb.from('workspace_tasks').upsert([{
          id: task.id,
          user_id: this.currentUserId || window.store.state.currentUser.id,
          workspace_code: this.currentWsCode,
          title: task.title,
          desc: task.desc || "",
          status: task.status || "todo",
          priority: task.priority || "normal",
          assignee: task.assignee || "",
          deadline: task.deadline || "",
          remark: task.remark || ""
        }]);
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi lưu task Supabase:", err);
      }
    }
  },

  async updateTaskStatus(taskId, newStatus) {
    window.store.updateTaskStatus(taskId, newStatus);

    if (this.db) {
      try {
        await this.db.collection("workspaces").doc(this.currentWsCode)
          .collection("tasks").doc(taskId).set({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi cập nhật task Firestore:", err);
      }
    }

    if (this.sb) {
      try {
        await this.sb.from('workspace_tasks').update({ status: newStatus }).eq('id', taskId);
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi cập nhật task Supabase:", err);
      }
    }
  },

  async deleteTask(taskId) {
    window.store.deleteTask(taskId);

    if (this.db) {
      try {
        await this.db.collection("workspaces").doc(this.currentWsCode)
          .collection("tasks").doc(taskId).delete();
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi xóa task Firestore:", err);
      }
    }

    if (this.sb) {
      try {
        await this.sb.from('workspace_tasks').delete().eq('id', taskId);
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi xóa task Supabase:", err);
      }
    }
  },

  async pushMail(mail) {
    window.store.addMail(mail);

    if (this.sb) {
      try {
        await this.sb.from('workspace_mails').insert([{
          id: mail.id,
          user_id: this.currentUserId || window.store.state.currentUser.id,
          workspace_code: this.currentWsCode,
          from_name: mail.from,
          from_email: mail.fromEmail,
          subject: mail.subject,
          body: mail.body,
          starred: !!mail.starred,
          read: !!mail.read
        }]);
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi lưu mail Supabase:", err);
      }
    }
  },

  async deleteMail(mailId) {
    window.store.deleteMail(mailId);

    if (this.sb) {
      try {
        await this.sb.from('workspace_mails').delete().eq('id', mailId);
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi xóa mail Supabase:", err);
      }
    }
  },

  async pushFile(file) {
    window.store.addFile(file);

    if (this.sb) {
      try {
        await this.sb.from('workspace_files').insert([{
          id: file.id,
          user_id: this.currentUserId || window.store.state.currentUser.id,
          workspace_code: this.currentWsCode,
          name: file.name,
          size: file.size,
          type: file.type,
          icon: file.icon
        }]);
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi lưu file Supabase:", err);
      }
    }
  },

  async deleteFile(fileId) {
    window.store.deleteFile(fileId);

    if (this.sb) {
      try {
        await this.sb.from('workspace_files').delete().eq('id', fileId);
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi xóa file Supabase:", err);
      }
    }
  },

  // ==========================================
  // WORKSPACE CLOUD PERSISTENCE (SUPABASE)
  // ==========================================

  async saveWorkspaceToSupabase(ws) {
    if (!this.sb || !ws) return;
    const uid = this.currentUserId || (window.store.state.currentUser ? window.store.state.currentUser.id : "guest");
    try {
      await this.sb.from('workspaces').upsert([{
        code: ws.code,
        name: ws.name,
        icon: ws.icon || 'planet',
        owner_id: uid,
        updated_at: new Date().toISOString()
      }]);

      await this.sb.from('workspace_members').upsert([{
        workspace_code: ws.code,
        user_id: uid,
        role: ws.role || 'master',
        joined_at: new Date().toISOString()
      }], { onConflict: 'workspace_code,user_id' });

      console.log(`[Cloud Engine] 🪐 Đã đồng bộ Không Gian [${ws.name}] (${ws.code}) lên Supabase!`);
    } catch (err) {
      console.warn("[Cloud Engine] Lỗi lưu workspace Supabase:", err);
    }
  },

  async loadUserWorkspacesFromSupabase(uid) {
    if (!this.sb || !uid) return;
    try {
      // 1. Lấy danh sách workspace do User làm chủ
      const { data: ownedWs, error: err1 } = await this.sb
        .from('workspaces')
        .select('*')
        .eq('owner_id', uid);

      // 2. Lấy danh sách workspace do User tham gia
      const { data: memberWs, error: err2 } = await this.sb
        .from('workspace_members')
        .select('workspace_code, role, workspaces(*)')
        .eq('user_id', uid);

      const currentList = window.store.getUserWorkspaces();
      const map = new Map();

      currentList.forEach(w => map.set(w.code, w));

      if (ownedWs && ownedWs.length > 0) {
        ownedWs.forEach(w => {
          map.set(w.code, {
            code: w.code,
            name: w.name,
            icon: w.icon || 'planet',
            role: 'master',
            isDefault: w.code === 'MHENT-CORE-2026'
          });
        });
      }

      if (memberWs && memberWs.length > 0) {
        memberWs.forEach(m => {
          const wInfo = m.workspaces;
          if (wInfo) {
            map.set(m.workspace_code, {
              code: m.workspace_code,
              name: wInfo.name || m.workspace_code,
              icon: wInfo.icon || 'planet',
              role: m.role || 'member',
              isDefault: false
            });
          }
        });
      }

      window.store.state.userWorkspaces = Array.from(map.values());
      window.store.save();

      if (window.AuthModule && typeof window.AuthModule.renderWorkspacesList === 'function') {
        window.AuthModule.renderWorkspacesList();
      }
    } catch (e) {
      console.warn("[Cloud Engine] Không thể tải danh sách workspace từ Supabase:", e);
    }
  },

  async deleteWorkspaceFromSupabase(code) {
    if (!this.sb || !code) return;
    try {
      await this.sb.from('workspaces').delete().eq('code', code);
      await this.sb.from('workspace_members').delete().eq('workspace_code', code);
      console.log(`[Cloud Engine] 🗑️ Đã xóa Không Gian [${code}] trên Supabase!`);
    } catch (e) {
      console.warn("[Cloud Engine] Lỗi xóa workspace Supabase:", e);
    }
  }
};
