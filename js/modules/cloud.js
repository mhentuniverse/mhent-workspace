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
    const wsCode = (window.store && window.store.state && window.store.state.workspace ? window.store.state.workspace.code : null) || "MHENT-CORE-2026";
    this.loadWorkspaceDataFromSupabase(wsCode);
    this.initSupabaseRealtime(wsCode);
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
    if (typeof firebase === "undefined") {
      console.warn("[Cloud Engine] Firebase SDK chưa được nạp, chờ khởi tạo...");
      return;
    }

    try {
      if (!firebase.apps.length && window.MHENT_CONFIG && window.MHENT_CONFIG.FIREBASE_CONFIG) {
        firebase.initializeApp(window.MHENT_CONFIG.FIREBASE_CONFIG);
      }
      this.db = firebase.firestore();
      this.isLive = true;
      console.log("[Cloud Engine] ✅ Đã kết nối Firebase Cloud Firestore thành công!");

      const wsCode = (window.store && window.store.state && window.store.state.workspace ? window.store.state.workspace.code : null) || "MHENT-CORE-2026";
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
      // 5. Tải events của user hoặc của workspace từ Supabase
      const { data: eventsData, error: eventErr } = await this.sb
        .from('workspace_events')
        .select('*')
        .or(`user_id.eq.${uid},workspace_code.eq.${this.currentWsCode}`);

      if (!eventErr && eventsData && eventsData.length > 0) {
        window.store.state.events = eventsData;
        if (window.CalendarModule && typeof window.CalendarModule.renderCalendar === 'function') {
          window.CalendarModule.renderCalendar();
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
    const wsName = (window.store && window.store.state && window.store.state.workspace && window.store.state.workspace.name) || "MHEnt Workspace";
    wsDocRef.set({
      code: this.currentWsCode,
      name: wsName,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch((err) => console.warn("[Cloud Engine] Lỗi cập nhật workspace Firestore:", err));

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
            if (!window.store.state.chatChannelsByWorkspace) {
              window.store.state.chatChannelsByWorkspace = {};
            }
            if (!window.store.state.chatChannelsByWorkspace[this.currentWsCode]) {
              window.store.state.chatChannelsByWorkspace[this.currentWsCode] = { general: [], media: [], dev: [] };
            }
            window.store.state.chatChannelsByWorkspace[this.currentWsCode][channelId] = messages;
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

    // 3. 👥 REALTIME WORKSPACE MEMBERS STREAM (MASTER FEATURE)
    const unsubMembers = wsDocRef.collection("members")
      .onSnapshot((snapshot) => {
        if (!snapshot.empty) {
          const cloudMembers = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            cloudMembers.push({
              id: doc.id,
              name: data.name || data.displayName || "Thành viên",
              email: data.email || "",
              avatar: data.avatar || "👤",
              role: data.role || "member",
              status: data.status || "online",
              workspaceCode: this.currentWsCode,
              joinedAt: data.joinedAt ? (data.joinedAt.toDate ? data.joinedAt.toDate().toISOString() : data.joinedAt) : new Date().toISOString()
            });
          });
          if (cloudMembers.length > 0) {
            window.store.setWorkspaceMembers(this.currentWsCode, cloudMembers);
            if (window.AuthModule) {
              window.AuthModule.renderManageWorkspaceMembers(this.currentWsCode);
              window.AuthModule.renderSidebarMembers();
            }
          }
        }
      }, (err) => console.warn("[Members Stream] Lỗi:", err));
    this.activeListeners.push(unsubMembers);

    // 4. 📅 REALTIME CALENDAR EVENTS STREAM
    const unsubEvents = wsDocRef.collection("events")
      .onSnapshot((snapshot) => {
        if (!snapshot) return;
        const cloudEvents = [];
        snapshot.forEach(doc => {
          if (!doc.id.startsWith("ev-demo-")) {
            cloudEvents.push({ id: doc.id, ...doc.data() });
          }
        });
        if (cloudEvents.length > 0) {
          window.store.state.events = cloudEvents;
          window.store.save();
          if (window.CalendarModule && typeof window.CalendarModule.renderCalendar === 'function') {
            window.CalendarModule.renderCalendar();
          }
        }
      }, (err) => console.warn("[Events Stream] Lỗi:", err));
    this.activeListeners.push(unsubEvents);

    // Tự động kéo dữ liệu thành viên mới nhất từ Supabase & Firestore
    this.fetchWorkspaceMembers(this.currentWsCode).catch(() => {});
    this.loadWorkspaceDataFromSupabase(this.currentWsCode);
    this.initSupabaseRealtime(this.currentWsCode);
  },

  // ==========================================
  // CLOUD WRITE HELPERS (SUPABASE + FIRESTORE)
  // ==========================================

  async pushChatMessage(channelId, msg) {
    // 1. Lưu Local state (optimistic)
    window.store.addChatMessage(channelId, msg);

    let firestoreOk = false;
    let supabaseOk = false;
    let lastError = null;

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
        firestoreOk = true;
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi gửi chat Firestore:", err);
        lastError = err;
      }
    }

    // 3. Lưu Supabase
    if (this.sb) {
      try {
        const { error } = await this.sb.from('workspace_messages').insert([{
          id: msg.id,
          user_id: this.currentUserId || window.store.state.currentUser.id,
          workspace_code: this.currentWsCode,
          channel: channelId,
          sender: msg.sender,
          avt: msg.avt,
          text: msg.text,
          is_bot: !!msg.isBot
        }]);
        if (error) throw error;
        supabaseOk = true;
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi gửi chat Supabase:", err);
        if (!lastError) lastError = err;
      }
    }

    if (!this.db && !this.sb) {
      // Local demo mode
      return { success: true, localOnly: true };
    }

    if (firestoreOk || supabaseOk) {
      return { success: true };
    } else {
      throw lastError || new Error("Mất kết nối máy chủ đám mây");
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

      const uName = window.store.state.currentUser ? window.store.state.currentUser.name : "Master Yurika";
      const uEmail = window.store.state.currentUser ? window.store.state.currentUser.email : "master@mhentuniverse.internal";
      const uAvatar = (ws.role === "master" || (window.store.state.currentUser && window.store.state.currentUser.role === "master")) ? "👑" : "💻";

      await this.sb.from('workspace_members').upsert([{
        workspace_code: ws.code,
        user_id: uid,
        user_name: uName,
        user_email: uEmail,
        avatar: uAvatar,
        role: ws.role || 'master',
        status: 'online',
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
  },

  // ==========================================
  // WORKSPACE MEMBERS CLOUD ENGINE (MASTER FEATURE)
  // ==========================================

  async fetchWorkspaceMembers(wsCode) {
    const targetCode = (wsCode || this.currentWsCode || (window.store.state.workspace ? window.store.state.workspace.code : "MHENT-CORE-2026")).toUpperCase();
    const membersMap = new Map();

    // 1. Tải từ Supabase
    if (this.sb) {
      try {
        const { data, error } = await this.sb
          .from('workspace_members')
          .select('*')
          .eq('workspace_code', targetCode);
        
        if (!error && data && data.length > 0) {
          data.forEach(m => {
            membersMap.set(m.user_id, {
              id: m.user_id,
              name: m.user_name || m.user_id,
              email: m.user_email || "",
              avatar: m.avatar || (m.role === 'master' ? '👑' : (m.role === 'admin' ? '🛡️' : '💻')),
              role: m.role || "member",
              status: m.status || "online",
              workspaceCode: targetCode,
              joinedAt: m.joined_at || new Date().toISOString()
            });
          });
        }
      } catch (e) {
        console.warn("[Cloud Engine] Lỗi tải thành viên từ Supabase:", e);
      }
    }

    // 2. Tải từ Firestore
    if (this.db) {
      try {
        const snap = await this.db.collection("workspaces").doc(targetCode).collection("members").get();
        if (!snap.empty) {
          snap.forEach(doc => {
            const d = doc.data();
            membersMap.set(doc.id, {
              id: doc.id,
              name: d.name || d.displayName || "Thành viên",
              email: d.email || "",
              avatar: d.avatar || (d.role === 'master' ? '👑' : (d.role === 'admin' ? '🛡️' : '💻')),
              role: d.role || "member",
              status: d.status || "online",
              workspaceCode: targetCode,
              joinedAt: d.joinedAt ? (d.joinedAt.toDate ? d.joinedAt.toDate().toISOString() : d.joinedAt) : new Date().toISOString()
            });
          });
        }
      } catch (e) {
        console.warn("[Cloud Engine] Lỗi tải thành viên từ Firestore:", e);
      }
    }

    if (membersMap.size > 0) {
      const cloudMembers = Array.from(membersMap.values());
      window.store.setWorkspaceMembers(targetCode, cloudMembers);
      return cloudMembers;
    }

    return window.store.getWorkspaceMembers(targetCode);
  },

  async pushMemberToWorkspaceCloud(wsCode, memberData) {
    const targetCode = (wsCode || this.currentWsCode || (window.store.state.workspace ? window.store.state.workspace.code : "MHENT-CORE-2026")).toUpperCase();
    let ok = false;
    let lastErr = null;

    // 1. Supabase
    if (this.sb) {
      try {
        const { error } = await this.sb.from('workspace_members').upsert([{
          workspace_code: targetCode,
          user_id: memberData.id,
          user_name: memberData.name || "",
          user_email: memberData.email || "",
          avatar: memberData.avatar || (memberData.role === 'master' ? '👑' : (memberData.role === 'admin' ? '🛡️' : '💻')),
          role: memberData.role || "member",
          status: memberData.status || "online",
          joined_at: memberData.joinedAt || new Date().toISOString()
        }], { onConflict: 'workspace_code,user_id' });
        if (error) throw error;
        ok = true;
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi lưu thành viên Supabase:", err);
        lastErr = err;
      }
    }

    // 2. Firestore
    if (this.db) {
      try {
        await this.db.collection("workspaces").doc(targetCode)
          .collection("members").doc(memberData.id).set({
            name: memberData.name || "",
            email: memberData.email || "",
            avatar: memberData.avatar || (memberData.role === 'master' ? '👑' : (memberData.role === 'admin' ? '🛡️' : '💻')),
            role: memberData.role || "member",
            status: memberData.status || "online",
            workspaceCode: targetCode,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        ok = true;
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi lưu thành viên Firestore:", err);
        if (!lastErr) lastErr = err;
      }
    }

    if (!this.db && !this.sb) return true; // Local mode
    if (ok) return true;
    throw lastErr || new Error("Không thể kết nối máy chủ");
  },

  async updateMemberRoleInCloud(wsCode, userId, newRole) {
    const targetCode = (wsCode || this.currentWsCode || (window.store.state.workspace ? window.store.state.workspace.code : "MHENT-CORE-2026")).toUpperCase();
    let ok = false;
    let lastErr = null;

    // 1. Supabase
    if (this.sb) {
      try {
        const { error } = await this.sb.from('workspace_members')
          .update({ role: newRole })
          .eq('workspace_code', targetCode)
          .eq('user_id', userId);
        if (error) throw error;
        ok = true;
      } catch (e) {
        lastErr = e;
      }
    }

    // 2. Firestore
    if (this.db) {
      try {
        await this.db.collection("workspaces").doc(targetCode)
          .collection("members").doc(userId).set({
            role: newRole,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        ok = true;
      } catch (e) {
        if (!lastErr) lastErr = e;
      }
    }

    if (!this.db && !this.sb) return true;
    if (ok) return true;
    throw lastErr || new Error("Không thể cập nhật phân quyền lên máy chủ");
  },

  async removeMemberFromWorkspaceInCloud(wsCode, userId) {
    const targetCode = (wsCode || this.currentWsCode || (window.store.state.workspace ? window.store.state.workspace.code : "MHENT-CORE-2026")).toUpperCase();
    let ok = false;
    let lastErr = null;

    // 1. Supabase
    if (this.sb) {
      try {
        const { error } = await this.sb.from('workspace_members')
          .delete()
          .eq('workspace_code', targetCode)
          .eq('user_id', userId);
        if (error) throw error;
        ok = true;
      } catch (e) {
        lastErr = e;
      }
    }

    // 2. Firestore
    if (this.db) {
      try {
        await this.db.collection("workspaces").doc(targetCode)
          .collection("members").doc(userId).delete();
        ok = true;
      } catch (e) {
        if (!lastErr) lastErr = e;
      }
    }

    if (!this.db && !this.sb) return true;
    if (ok) return true;
    throw lastErr || new Error("Không thể gỡ thành viên khỏi máy chủ");
  },

  // ==========================================
  // SYNERGY: MEET & CALENDAR CLOUD SYNC
  // ==========================================

  async broadcastMeeting(roomName, fullRoomUrl) {
    const senderName = (window.store && window.store.state && window.store.state.currentUser) ? window.store.state.currentUser.name : "Thành viên";
    const meetingMsg = {
      id: "meet-" + Date.now(),
      sender: `${senderName} (MHEnt Meet)`,
      avt: "📹",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `📹 Đang bắt đầu cuộc họp phòng [${roomName}]! Nhấp vào để tham gia ngay: ${fullRoomUrl || roomName}`,
      isBot: false,
      status: 'sent'
    };
    try {
      await this.pushChatMessage("general", meetingMsg);
    } catch (e) {
      console.warn("[Cloud Engine] Không thể phát sóng thông báo Meet:", e);
    }
  },

  // ==========================================
  // SUPABASE COMPREHENSIVE DATA LOADER & REALTIME
  // ==========================================

  async loadWorkspaceDataFromSupabase(wsCode) {
    if (!this.sb) return;
    const targetCode = (wsCode || this.currentWsCode || "MHENT-CORE-2026").toUpperCase();
    console.log(`[Cloud Engine] ⚡ Đang đồng bộ toàn bộ dữ liệu Không Gian [${targetCode}] từ Supabase...`);

    try {
      // 1. Members
      await this.fetchWorkspaceMembers(targetCode);

      // 2. Tasks
      const { data: tasks, error: tErr } = await this.sb
        .from('workspace_tasks')
        .select('*')
        .eq('workspace_code', targetCode);
      if (!tErr && tasks) {
        window.store.state.tasks = tasks;
        if (window.TodoModule) window.TodoModule.renderBoard();
      }

      // 3. Calendar Events
      const { data: events, error: eErr } = await this.sb
        .from('workspace_events')
        .select('*')
        .eq('workspace_code', targetCode);
      if (!eErr && events) {
        window.store.state.events = events;
        if (window.CalendarModule && typeof window.CalendarModule.renderCalendar === 'function') {
          window.CalendarModule.renderCalendar();
        }
      }

      // 4. Drive Files
      const { data: files, error: fErr } = await this.sb
        .from('workspace_files')
        .select('*')
        .eq('workspace_code', targetCode);
      if (!fErr && files) {
        window.store.state.files = files;
        if (window.DriveModule) window.DriveModule.renderFiles();
      }

      // 5. Messages for channels
      for (const ch of ["general", "media", "dev"]) {
        const { data: msgs, error: mErr } = await this.sb
          .from('workspace_messages')
          .select('*')
          .eq('workspace_code', targetCode)
          .eq('channel', ch)
          .order('created_at', { ascending: true })
          .limit(100);

        if (!mErr && msgs) {
          const formatted = msgs.map(m => {
            const now = m.created_at ? new Date(m.created_at) : new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            return {
              id: m.id,
              sender: m.sender || "Thành viên",
              senderId: m.user_id,
              avt: m.avt || "👤",
              time: timeStr,
              text: m.text || "",
              isSelf: m.user_id === (this.currentUserId || (window.store && window.store.state.currentUser ? window.store.state.currentUser.id : null)),
              isBot: m.is_bot || false
            };
          });
          window.store.state.chatChannels[ch] = formatted;
          if (!window.store.state.chatChannelsByWorkspace) {
            window.store.state.chatChannelsByWorkspace = {};
          }
          if (!window.store.state.chatChannelsByWorkspace[targetCode]) {
            window.store.state.chatChannelsByWorkspace[targetCode] = {};
          }
          window.store.state.chatChannelsByWorkspace[targetCode][ch] = formatted;
        }
      }
      if (window.ChatModule) window.ChatModule.renderMessages();

      // 6. Notes
      const uid = this.currentUserId || (window.store.state.currentUser ? window.store.state.currentUser.id : null);
      if (uid) {
        const { data: notes, error: nErr } = await this.sb
          .from('workspace_notes')
          .select('*')
          .eq('user_id', uid);
        if (!nErr && notes) {
          window.store.state.notes = notes;
          if (window.ToolsModule && typeof window.ToolsModule.renderNotes === 'function') {
            window.ToolsModule.renderNotes();
          }
        }
      }

      window.store.save();
    } catch (err) {
      console.warn("[Cloud Engine] Lỗi khi tải dữ liệu từ Supabase:", err);
    }
  },

  initSupabaseRealtime(wsCode) {
    if (!this.sb) return;
    const targetCode = (wsCode || this.currentWsCode || "MHENT-CORE-2026").toUpperCase();

    try {
      if (this.sbRealtimeChannel) {
        this.sbRealtimeChannel.unsubscribe();
      }

      this.sbRealtimeChannel = this.sb.channel(`mhent-ws-${targetCode}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_tasks', filter: `workspace_code=eq.${targetCode}` }, () => {
          this.loadWorkspaceDataFromSupabase(targetCode);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_events', filter: `workspace_code=eq.${targetCode}` }, () => {
          this.loadWorkspaceDataFromSupabase(targetCode);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_files', filter: `workspace_code=eq.${targetCode}` }, () => {
          this.loadWorkspaceDataFromSupabase(targetCode);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_messages', filter: `workspace_code=eq.${targetCode}` }, () => {
          this.loadWorkspaceDataFromSupabase(targetCode);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_members', filter: `workspace_code=eq.${targetCode}` }, () => {
          this.fetchWorkspaceMembers(targetCode);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Cloud Engine] ⚡ Supabase Realtime đã kết nối cho Không Gian [${targetCode}]!`);
          }
        });
    } catch (e) {
      console.warn("[Cloud Engine] Lỗi khởi tạo Supabase Realtime Channel:", e);
    }
  },

  async pushNote(note) {
    window.store.saveNote(note);
    if (this.sb) {
      try {
        await this.sb.from('workspace_notes').upsert([{
          id: note.id,
          user_id: this.currentUserId || (window.store && window.store.state && window.store.state.currentUser ? window.store.state.currentUser.id : "guest"),
          title: note.title || "",
          content: note.content || "",
          updated_at: new Date().toISOString()
        }]);
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi lưu note Supabase:", err);
      }
    }
  },

  async deleteNote(noteId) {
    window.store.deleteNote(noteId);
    if (this.sb) {
      try {
        await this.sb.from('workspace_notes').delete().eq('id', noteId);
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi xóa note Supabase:", err);
      }
    }
  },

  async createCalendarEvent(event) {
    const evId = event.id || ("ev-" + Date.now());
    const uid = this.currentUserId || (window.store && window.store.state && window.store.state.currentUser ? window.store.state.currentUser.id : "guest");

    // 1. Supabase (Primary Cloud Storage)
    if (this.sb) {
      try {
        await this.sb.from('workspace_events').upsert([{
          id: evId,
          user_id: uid,
          workspace_code: this.currentWsCode,
          title: event.title,
          date: event.date,
          time: event.time || 'Cả ngày',
          type: event.type || 'meeting',
          color: event.color || '#8b5cf6',
          location: event.location || '',
          updated_at: new Date().toISOString()
        }]);
        console.log(`[Cloud Engine] 📅 Đã lưu sự kiện [${event.title}] lên Supabase!`);
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi lưu sự kiện Calendar Supabase:", err);
      }
    }

    // 2. Firestore
    if (this.db) {
      try {
        await this.db.collection("workspaces").doc(this.currentWsCode)
          .collection("events").doc(evId).set({
            ...event,
            id: evId,
            userId: uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
      } catch (e) {
        console.warn("[Cloud Engine] Lỗi lưu sự kiện Calendar Firestore:", e);
      }
    }
  },

  async deleteCalendarEvent(eventId) {
    if (!eventId) return;

    // 1. Supabase
    if (this.sb) {
      try {
        await this.sb.from('workspace_events').delete().eq('id', eventId);
        console.log(`[Cloud Engine] 🗑️ Đã xóa sự kiện [${eventId}] trên Supabase!`);
      } catch (err) {
        console.warn("[Cloud Engine] Lỗi xóa sự kiện Calendar Supabase:", err);
      }
    }

    // 2. Firestore
    if (this.db) {
      try {
        await this.db.collection("workspaces").doc(this.currentWsCode)
          .collection("events").doc(eventId).delete();
      } catch (e) {
        console.warn("[Cloud Engine] Lỗi xóa sự kiện Calendar Firestore:", e);
      }
    }
  }
};

