/**
 * MHENT WORKSPACE - CENTRAL STATE MANAGEMENT (STATE.JS)
 */
class WorkspaceStore {
  constructor() {
    this.state = this.loadInitialState();
    this.listeners = [];
  }

  getDefaultMembers() {
    const u = (window.MHENT_CONFIG && window.MHENT_CONFIG.CURRENT_USER) || {
      id: "user-master-01",
      name: "Master Yurika",
      email: "yurika@mhentuniverse.internal",
      role: "master",
      avatar: "👑",
      status: "online"
    };
    return [{
      ...u,
      workspaceCode: "MHENT-CORE-2026",
      joinedAt: "2026-01-01T00:00:00.000Z"
    }];
  }

  loadInitialState() {
    const STORAGE_KEY = "mhent_workspace_v4_clean";
    // Clear out any old legacy mock/virtual data
    try {
      localStorage.removeItem("mhent_workspace_v3_clean");
      localStorage.removeItem("mhent_workspace_v2");
      localStorage.removeItem("mhent_workspace_state");
    } catch (e) {}

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Purge mock members
        if (Array.isArray(parsed.members)) {
          parsed.members = parsed.members.filter(m => !["user-dev-02", "user-media-03", "user-event-04"].includes(m.id));
          if (parsed.members.length === 0) parsed.members = this.getDefaultMembers();
        }
        // Purge any demo events
        if (Array.isArray(parsed.events)) {
          parsed.events = parsed.events.filter(e => !String(e.id).startsWith("ev-demo-"));
        }
        if (!parsed.chatChannelsByWorkspace) {
          parsed.chatChannelsByWorkspace = {
            "MHENT-CORE-2026": parsed.chatChannels || { general: [], media: [], dev: [] }
          };
        }
        return parsed;
      } catch (e) {
        console.warn("Error parsing stored state, resetting to clean defaults", e);
      }
    }

    return {
      activeApp: "chat", // 'chat' | 'mail' | 'meet' | 'todo' | 'drive' | 'calendar' | 'tools'
      activeChannel: "general",
      activeMailId: null,
      activeToolTab: "qr",
      aisaOpen: true,
      aisaPersona: "both", // 'harmony' | 'echo' | 'both'
      theme: "dark",
      
      workspace: (window.MHENT_CONFIG && window.MHENT_CONFIG.DEFAULT_WORKSPACE) || {
        id: "mhent-core",
        name: "MHEnt Universe HQ",
        code: "MHENT-CORE-2026",
        role: "master"
      },
      currentUser: (window.MHENT_CONFIG && window.MHENT_CONFIG.CURRENT_USER) || {
        id: "user-master-01",
        name: "Master Yurika",
        email: "yurika@mhentuniverse.internal",
        role: "master",
        avatar: "👑",
        status: "online"
      },
      userWorkspaces: [
        { code: "MHENT-CORE-2026", name: "MHEnt Universe HQ", role: "master", isDefault: true, icon: "planet" }
      ],
      members: this.getDefaultMembers(),

      // 1. Chat Messages (Trống - Đồng bộ từ Supabase)
      chatChannelsByWorkspace: {
        "MHENT-CORE-2026": {
          general: [],
          media: [],
          dev: []
        }
      },
      chatChannels: {
        general: [],
        media: [],
        dev: []
      },

      // 2. Mails (Trống - Đồng bộ từ Supabase)
      mails: [],

      // 3. Todo Tasks (Trống - Đồng bộ từ Supabase)
      tasks: [],

      // 4. Drive Files (Trống - Đồng bộ từ Supabase)
      files: [],

      // 5. Calendar Events (Trống - Đồng bộ từ Supabase)
      events: [],

      // 6. AISA Chat Stream
      aisaHistory: [],

      // 7. Notes
      notes: []
    };
  }

  save() {
    try {
      localStorage.setItem("mhent_workspace_v4_clean", JSON.stringify(this.state));
    } catch (e) {
      console.warn("Could not save state to localStorage", e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.state));
  }

  setActiveApp(appId) {
    this.state.activeApp = appId;
    this.save();
  }

  setAisaOpen(isOpen) {
    this.state.aisaOpen = isOpen;
    this.save();
  }

  setAisaPersona(persona) {
    this.state.aisaPersona = persona;
    this.save();
  }

  setTheme(theme) {
    this.state.theme = theme;
    this.save();
  }

  addChatMessage(channel, msg) {
    const wsCode = (this.state.workspace ? this.state.workspace.code : "MHENT-CORE-2026").toUpperCase();
    if (!this.state.chatChannelsByWorkspace) {
      this.state.chatChannelsByWorkspace = {};
    }
    if (!this.state.chatChannelsByWorkspace[wsCode]) {
      this.state.chatChannelsByWorkspace[wsCode] = { general: [], media: [], dev: [] };
    }
    if (!this.state.chatChannelsByWorkspace[wsCode][channel]) {
      this.state.chatChannelsByWorkspace[wsCode][channel] = [];
    }
    this.state.chatChannelsByWorkspace[wsCode][channel].push(msg);
    this.state.chatChannels = this.state.chatChannelsByWorkspace[wsCode];
    this.save();
  }

  addTask(task) {
    this.state.tasks.push(task);
    this.save();
  }

  updateTaskStatus(taskId, newStatus) {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = newStatus;
      this.save();
    }
  }

  deleteTask(taskId) {
    this.state.tasks = this.state.tasks.filter(t => t.id !== taskId);
    this.save();
  }

  addMail(mail) {
    this.state.mails.unshift(mail);
    this.save();
  }

  deleteMail(mailId) {
    this.state.mails = this.state.mails.filter(m => m.id !== mailId);
    this.save();
  }

  toggleStarMail(mailId) {
    const mail = this.state.mails.find(m => m.id === mailId);
    if (mail) {
      mail.starred = !mail.starred;
      this.save();
    }
  }

  addFile(file) {
    if (!this.state.files) this.state.files = [];
    this.state.files.unshift(file);
    this.save();
  }

  deleteFile(fileId) {
    if (!this.state.files) return;
    this.state.files = this.state.files.filter(f => f.id !== fileId);
    this.save();
  }

  addEvent(event) {
    if (!this.state.events) this.state.events = [];
    this.state.events.push(event);
    this.save();
  }

  deleteEvent(eventId) {
    if (!this.state.events) return;
    this.state.events = this.state.events.filter(e => e.id !== eventId);
    this.save();
  }

  saveNote(note) {
    if (!this.state.notes) this.state.notes = [];
    const idx = this.state.notes.findIndex(n => n.id === note.id);
    if (idx >= 0) {
      this.state.notes[idx] = note;
    } else {
      this.state.notes.unshift(note);
    }
    this.save();
  }

  deleteNote(noteId) {
    if (!this.state.notes) return;
    this.state.notes = this.state.notes.filter(n => n.id !== noteId);
    this.save();
  }

  addAisaMessage(msg) {
    if (!this.state.aisaHistory) this.state.aisaHistory = [];
    this.state.aisaHistory.push(msg);
    this.save();
  }

  setCurrentUser(user, isAuth = true) {
    this.state.currentUser = user;
    this.state.isLoggedIn = isAuth;
    this.save();
  }

  setWorkspace(ws) {
    this.state.workspace = ws;
    this.save();
  }

  getUserWorkspaces() {
    if (!this.state.userWorkspaces || !Array.isArray(this.state.userWorkspaces) || this.state.userWorkspaces.length === 0) {
      this.state.userWorkspaces = [
        { code: "MHENT-CORE-2026", name: "MHEnt Universe HQ", role: "master", isDefault: true, icon: "planet" }
      ];
      this.save();
    }
    return this.state.userWorkspaces;
  }

  createWorkspace(name, icon = "planet", customCode = "") {
    if (!name || !name.trim()) return null;
    const workspaces = this.getUserWorkspaces();

    let cleanCode = customCode ? customCode.trim().toUpperCase() : "";
    if (!cleanCode) {
      const slug = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "TEAM";
      const rand = Math.floor(1000 + Math.random() * 9000);
      cleanCode = `MHENT-${slug}-${rand}`;
    }

    // Kiểm tra xem đã tồn tại chưa
    const existing = workspaces.find(w => w.code === cleanCode);
    if (existing) {
      this.switchWorkspace(cleanCode);
      return existing;
    }

    const newWs = {
      code: cleanCode,
      name: name.trim(),
      icon: icon || "planet",
      role: "master",
      isOwner: true,
      createdAt: new Date().toISOString()
    };

    workspaces.push(newWs);
    this.state.userWorkspaces = workspaces;

    // Đăng ký Creator là Master của Workspace mới trong state.members
    if (this.state.currentUser) {
      this.addMemberToWorkspace({
        id: this.state.currentUser.id || "user-master-01",
        name: this.state.currentUser.name || "Master Yurika",
        email: this.state.currentUser.email || "yurika@mhentuniverse.internal",
        role: "master",
        avatar: "👑",
        status: "online",
        workspaceCode: cleanCode,
        joinedAt: new Date().toISOString()
      }, cleanCode);
    }

    this.save();
    this.switchWorkspace(cleanCode);
    return newWs;
  }

  joinWorkspace(code, name = "") {
    if (!code || !code.trim()) return null;
    const cleanCode = code.trim().toUpperCase();
    const workspaces = this.getUserWorkspaces();

    let ws = workspaces.find(w => w.code === cleanCode);
    if (!ws) {
      ws = {
        code: cleanCode,
        name: name || `Workspace [${cleanCode}]`,
        icon: "rocket",
        role: "member",
        isOwner: false,
        createdAt: new Date().toISOString()
      };
      workspaces.push(ws);
      this.state.userWorkspaces = workspaces;
    }

    // Ghi nhận thành viên vào Workspace nếu chưa có
    if (this.state.currentUser) {
      this.addMemberToWorkspace({
        id: this.state.currentUser.id || ("user-" + Date.now()),
        name: this.state.currentUser.name || "Thành Viên",
        email: this.state.currentUser.email || "member@mhentuniverse.internal",
        role: ws.role || "member",
        avatar: this.state.currentUser.avatar || "💻",
        status: "online",
        workspaceCode: cleanCode,
        joinedAt: new Date().toISOString()
      }, cleanCode);
    }

    this.save();
    this.switchWorkspace(cleanCode);
    return ws;
  }

  switchWorkspace(code) {
    const cleanCode = (code || "MHENT-CORE-2026").toUpperCase();
    const workspaces = this.getUserWorkspaces();
    const targetWs = workspaces.find(w => w.code === cleanCode) || {
      code: cleanCode,
      name: `Workspace [${cleanCode}]`,
      role: "member",
      icon: "planet"
    };

    this.state.workspace = targetWs;
    if (this.state.currentUser) {
      this.state.currentUser.role = targetWs.role || "member";
      if (targetWs.role === "master") this.state.currentUser.avatar = "👑";
      else if (targetWs.role === "admin") this.state.currentUser.avatar = "🛡️";
      else this.state.currentUser.avatar = "💻";
    }

    // Tách biệt tin nhắn chat theo Workspace
    if (!this.state.chatChannelsByWorkspace) {
      this.state.chatChannelsByWorkspace = {};
    }
    if (!this.state.chatChannelsByWorkspace[cleanCode]) {
      this.state.chatChannelsByWorkspace[cleanCode] = {
        general: [],
        media: [],
        dev: []
      };
    }
    this.state.chatChannels = this.state.chatChannelsByWorkspace[cleanCode];

    this.save();
    return targetWs;
  }

  updateWorkspace(code, updates = {}) {
    const cleanCode = (code || "").toUpperCase();
    const workspaces = this.getUserWorkspaces();
    const idx = workspaces.findIndex(w => w.code === cleanCode);
    if (idx >= 0) {
      if (updates.name && updates.name.trim()) {
        workspaces[idx].name = updates.name.trim();
      }
      if (updates.icon) {
        workspaces[idx].icon = updates.icon;
      }
      this.state.userWorkspaces = workspaces;

      if (this.state.workspace && this.state.workspace.code === cleanCode) {
        this.state.workspace = { ...this.state.workspace, ...workspaces[idx] };
      }
      this.save();
      return workspaces[idx];
    }
    return null;
  }

  deleteWorkspace(code) {
    let workspaces = this.getUserWorkspaces();
    if (workspaces.length <= 1) return false; // Giữ ít nhất 1 workspace
    workspaces = workspaces.filter(w => w.code !== code);
    this.state.userWorkspaces = workspaces;

    // Đồng thời gỡ các thành viên gắn với workspace đó
    if (this.state.members) {
      this.state.members = this.state.members.filter(m => m.workspaceCode !== code);
    }

    if (this.state.workspace && this.state.workspace.code === code) {
      this.switchWorkspace(workspaces[0].code);
    } else {
      this.save();
    }
    return true;
  }

  // ==========================================
  // WORKSPACE MEMBERS MANAGEMENT (MASTER FEATURE)
  // ==========================================

  getWorkspaceMembers(wsCode) {
    const targetCode = wsCode || (this.state.workspace ? this.state.workspace.code : "MHENT-CORE-2026");
    if (!this.state.members || !Array.isArray(this.state.members)) {
      this.state.members = this.getDefaultMembers();
      this.save();
    }
    return this.state.members.filter(m => (m.workspaceCode || "MHENT-CORE-2026") === targetCode);
  }

  setWorkspaceMembers(wsCode, membersList) {
    const targetCode = wsCode || (this.state.workspace ? this.state.workspace.code : "MHENT-CORE-2026");
    if (!this.state.members || !Array.isArray(this.state.members)) {
      this.state.members = [];
    }
    // Giữ lại các thành viên thuộc workspace khác
    const otherMembers = this.state.members.filter(m => (m.workspaceCode || "MHENT-CORE-2026") !== targetCode);
    const normalizedNew = membersList.map(m => ({
      ...m,
      workspaceCode: targetCode
    }));
    this.state.members = [...otherMembers, ...normalizedNew];
    this.save();
  }

  addMemberToWorkspace(member, wsCode) {
    const targetCode = wsCode || (this.state.workspace ? this.state.workspace.code : "MHENT-CORE-2026");
    if (!this.state.members) this.state.members = [];
    const idx = this.state.members.findIndex(m => m.id === member.id && (m.workspaceCode || "MHENT-CORE-2026") === targetCode);
    const item = {
      ...member,
      workspaceCode: targetCode,
      status: member.status || "online",
      joinedAt: member.joinedAt || new Date().toISOString()
    };
    if (idx >= 0) {
      this.state.members[idx] = { ...this.state.members[idx], ...item };
    } else {
      this.state.members.push(item);
    }
    this.save();
  }

  updateMemberRole(userId, newRole, wsCode) {
    const targetCode = wsCode || (this.state.workspace ? this.state.workspace.code : "MHENT-CORE-2026");
    if (!this.state.members) return false;
    const member = this.state.members.find(m => m.id === userId && (m.workspaceCode || "MHENT-CORE-2026") === targetCode);
    if (member) {
      member.role = newRole;
      if (newRole === "master") member.avatar = "👑";
      else if (newRole === "admin") member.avatar = "🛡️";
      else if (newRole === "guest") member.avatar = "👤";
      else member.avatar = "💻";
      this.save();
      return true;
    }
    return false;
  }

  removeMemberFromWorkspace(userId, wsCode) {
    const targetCode = wsCode || (this.state.workspace ? this.state.workspace.code : "MHENT-CORE-2026");
    if (!this.state.members) return false;
    this.state.members = this.state.members.filter(m => !(m.id === userId && (m.workspaceCode || "MHENT-CORE-2026") === targetCode));
    this.save();
    return true;
  }

  // ==========================================
  // OPTIMISTIC CHAT STATUS (MESSENGER RETRY STYLE)
  // ==========================================

  updateChatMessageStatus(channel, msgId, status) {
    const wsCode = (this.state.workspace ? this.state.workspace.code : "MHENT-CORE-2026").toUpperCase();
    if (this.state.chatChannels && this.state.chatChannels[channel]) {
      const msg = this.state.chatChannels[channel].find(m => m.id === msgId);
      if (msg) msg.status = status;
    }
    if (this.state.chatChannelsByWorkspace && this.state.chatChannelsByWorkspace[wsCode] && this.state.chatChannelsByWorkspace[wsCode][channel]) {
      const msg2 = this.state.chatChannelsByWorkspace[wsCode][channel].find(m => m.id === msgId);
      if (msg2) msg2.status = status;
    }
    this.save();
  }
}

window.store = new WorkspaceStore();
