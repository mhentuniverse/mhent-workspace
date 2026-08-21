/**
 * MHENT WORKSPACE - CENTRAL STATE MANAGEMENT (STATE.JS)
 */
class WorkspaceStore {
  constructor() {
    this.state = this.loadInitialState();
    this.listeners = [];
  }

  loadInitialState() {
    const STORAGE_KEY = "mhent_workspace_v3_clean";
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
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
      
      workspace: window.MHENT_CONFIG.DEFAULT_WORKSPACE,
      currentUser: window.MHENT_CONFIG.CURRENT_USER,
      userWorkspaces: [
        { code: "MHENT-CORE-2026", name: "MHEnt Universe HQ", role: "master", isDefault: true, icon: "planet" }
      ],
      members: [],

      // 1. Chat Messages (Trống để người dùng tự tạo)
      chatChannels: {
        general: [],
        media: [],
        dev: []
      },

      // 2. Mails (Trống)
      mails: [],

      // 3. Todo Tasks (Trống)
      tasks: [],

      // 4. Drive Files (Trống)
      files: [],

      // 5. Calendar Events (Trống)
      events: [],

      // 6. AISA Chat Stream
      aisaHistory: []
    };
  }

  save() {
    try {
      localStorage.setItem("mhent_workspace_v3_clean", JSON.stringify(this.state));
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
    if (!this.state.chatChannels[channel]) {
      this.state.chatChannels[channel] = [];
    }
    this.state.chatChannels[channel].push(msg);
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
      this.save();
    }

    this.switchWorkspace(cleanCode);
    return ws;
  }

  switchWorkspace(code) {
    const workspaces = this.getUserWorkspaces();
    const targetWs = workspaces.find(w => w.code === code) || {
      code: code,
      name: `Workspace [${code}]`,
      role: "member",
      icon: "🏢"
    };

    this.state.workspace = targetWs;
    if (this.state.currentUser) {
      this.state.currentUser.role = targetWs.role || "member";
      if (targetWs.role === "master") this.state.currentUser.avatar = "👑";
      else if (targetWs.role === "admin") this.state.currentUser.avatar = "🛡️";
      else this.state.currentUser.avatar = "💻";
    }
    this.save();
  }

  deleteWorkspace(code) {
    let workspaces = this.getUserWorkspaces();
    if (workspaces.length <= 1) return false; // Giữ ít nhất 1 workspace
    workspaces = workspaces.filter(w => w.code !== code);
    this.state.userWorkspaces = workspaces;

    if (this.state.workspace && this.state.workspace.code === code) {
      this.switchWorkspace(workspaces[0].code);
    } else {
      this.save();
    }
    return true;
  }
}

window.store = new WorkspaceStore();
