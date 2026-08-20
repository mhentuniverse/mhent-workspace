/**
 * MHENT WORKSPACE - CENTRAL STATE MANAGEMENT (STATE.JS)
 */
class WorkspaceStore {
  constructor() {
    this.state = this.loadInitialState();
    this.listeners = [];
  }

  loadInitialState() {
    const saved = localStorage.getItem("mhent_workspace_state");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Error parsing stored state, resetting to defaults", e);
      }
    }

    return {
      activeApp: "chat", // 'chat' | 'mail' | 'meet' | 'todo' | 'drive' | 'calendar' | 'tools'
      activeChannel: "general",
      activeMailId: "mail-1",
      activeToolTab: "qr",
      aisaOpen: true,
      aisaPersona: "both", // 'harmony' | 'echo' | 'both'
      theme: "dark",
      
      workspace: window.MHENT_CONFIG.DEFAULT_WORKSPACE,
      currentUser: window.MHENT_CONFIG.CURRENT_USER,
      members: window.MHENT_CONFIG.TEAM_MEMBERS,

      // 1. Chat Messages
      chatChannels: {
        general: [
          { id: "msg-1", sender: "Master Yurika", avt: "👑", time: "10:30", text: "Chào mừng toàn thể anh em đến với căn cứ MHEnt Workspace mới! 🚀", isSelf: true },
          { id: "msg-2", sender: "Kaelen (Dev Lead)", avt: "💻", time: "10:32", text: "Giao diện mượt mà quá Master ơi! Sẵn sàng chiến đấu cho dự án lớn!", isSelf: false },
          { id: "msg-3", sender: "Sara (Media Dir)", avt: "🎨", time: "10:35", text: "@AISA Tóm tắt nhanh nhiệm vụ tuần này cho ban Media với!", isSelf: false },
          { id: "msg-4", sender: "Harmony", avt: "🌸", time: "10:35", text: "Dạ em chào chị Sara! Ban Media tuần này có 2 việc chính: 1. Hoàn thiện poster sự kiện và 2. Chuẩn bị trailer tập 3 ạ! 🌸", isBot: "harmony" },
          { id: "msg-5", sender: "Echo", avt: "😈", time: "10:36", text: "Nói thêm là deadline poster là trưa mai đấy nhé, đừng có mà lười biếng trễ hẹn đấy!", isBot: "echo" }
        ],
        media: [
          { id: "msg-m1", sender: "Sara (Media Dir)", avt: "🎨", time: "09:15", text: "Team media kiểm tra file render MKV sang MP4 trong Quick Tools nhé.", isSelf: false }
        ],
        dev: [
          { id: "msg-d1", sender: "Kaelen (Dev Lead)", avt: "💻", time: "08:45", text: "Đã tối ưu xong PWA và Service Worker, tốc độ tải app dưới 0.5s.", isSelf: false }
        ]
      },

      // 2. Mails
      mails: [
        {
          id: "mail-1",
          from: "HQ Operations",
          fromEmail: "hq@mhentuniverse.internal",
          subject: "🌟 Kế hoạch triển khai Subdomain MHEnt Workspace V1.0",
          time: "10:00 AM",
          starred: true,
          read: true,
          body: `Thân gửi toàn thể đội ngũ MHEnt Universe,

Chúng ta chính thức kích hoạt phân khu MHEnt Workspace – Trạm chỉ huy số tích hợp toàn diện:
- MHEnt Chat & Mail: Trao đổi nội bộ siêu tốc, bảo mật tuyệt đối.
- MHEnt Meet: Họp video trực tiếp không giới hạn thời gian qua Jitsi.
- MHEnt Todo & Drive: Quản lý công việc và kho lưu trữ tài nguyên media.
- AISA Copilot (Harmony & Echo): Trợ lý AI đồng hành 24/7.

Chúc toàn team một tuần làm việc bùng nổ và hiệu quả!
Trân trọng,
Master Yurika.`
        },
        {
          id: "mail-2",
          from: "Ban Truyền Thông & Media",
          fromEmail: "media@mhentuniverse.internal",
          subject: "🎨 Báo cáo duyệt kịch bản sự kiện tháng tới",
          time: "Hôm qua",
          starred: false,
          read: true,
          body: `Gửi Master,

Ban Media đã cập nhật bản nháp kịch bản và thiết kế infographic mới nhất trên Noticeboard. Master xem qua và phản hồi sớm giúp chúng em nhé!`
        }
      ],

      // 3. Todo Tasks
      tasks: [
        { id: "task-1", title: "Thiết kế Poster Sự kiện Tháng 9", desc: "Xuất file chuẩn 4K, hỗ trợ responsive cho app", status: "todo", priority: "high", assignee: "Sara", deadline: "2026-08-25", remark: "Harmony: Cố lên nha chị Sara!" },
        { id: "task-2", title: "Cấu hình Jitsi Meet bảo mật phòng", desc: "Tự sinh room ID theo mã team nội bộ", status: "in-progress", priority: "urgent", assignee: "Kaelen", deadline: "2026-08-22", remark: "Echo: Làm cho cẩn thận đấy, đừng để lộ link!" },
        { id: "task-3", title: "Khởi tạo luồng AI AISA Copilot", desc: "Kết nối FastAPI Groq Llama-3.3 hai tính cách", status: "done", priority: "urgent", assignee: "Master Yurika", deadline: "2026-08-20", remark: "Harmony: Master tuyệt vời nhất!" }
      ],

      // 4. Drive Files
      files: [
        { id: "f-1", name: "MHEnt-Universe-Brand-Guidelines.pdf", size: "4.8 MB", date: "2026-08-18", type: "pdf", icon: "📄" },
        { id: "f-2", name: "Poster-Happiness-Precure-4K.webp", size: "12.4 MB", date: "2026-08-19", type: "image", icon: "🖼️" },
        { id: "f-3", name: "Theme-Soundtrack-Master-Remix.wav", size: "45.1 MB", date: "2026-08-15", type: "audio", icon: "🎵" },
        { id: "f-4", name: "Worldbuilding-Lore-Doc.docx", size: "1.2 MB", date: "2026-08-20", type: "doc", icon: "📝" }
      ],

      // 5. Calendar Events
      events: [
        { id: "ev-1", title: "Họp Toàn Ban Chỉ Huy MHEnt", date: "2026-08-21", time: "14:00 - 15:30", type: "meeting" },
        { id: "ev-2", title: "Deadline Render Video Trailer", date: "2026-08-24", time: "23:59", type: "deadline" },
        { id: "ev-3", title: "Ra Mắt Tính Năng AISA Copilot", date: "2026-08-28", time: "09:00", type: "launch" }
      ],

      // 6. AISA Chat Stream
      aisaHistory: [
        { role: "assistant", speaker: "HARMONY", text: "Em chào Master ạ! Chúc Master một ngày làm việc thật vui vẻ và tràn đầy năng lượng! 🌸" },
        { role: "assistant", speaker: "ECHO", text: "Hừm, lại vào bàn làm việc rồi à? Hôm nay nhớ xử lý cho xong cái task Jitsi Meet đấy nhé, đừng có lướt linh tinh! 😈" }
      ]
    };
  }

  save() {
    try {
      localStorage.setItem("mhent_workspace_state", JSON.stringify(this.state));
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

  addMail(mail) {
    this.state.mails.unshift(mail);
    this.save();
  }

  addEvent(event) {
    this.state.events.push(event);
    this.save();
  }

  addAisaMessage(msg) {
    this.state.aisaHistory.push(msg);
    this.save();
  }
}

window.store = new WorkspaceStore();
