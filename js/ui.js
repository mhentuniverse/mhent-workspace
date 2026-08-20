/**
 * MHENT WORKSPACE - UI CONTROLLER & COMMAND PALETTE (UI.JS)
 */
window.UI = {
  init() {
    this.bindRailNavigation();
    this.bindCommandPalette();
    this.bindModals();
    this.bindAisaDrawer();
    this.bindThemeToggle();
    this.updateTheme();
    this.switchApp(window.store.state.activeApp || "chat");
  },

  bindRailNavigation() {
    const railBtns = document.querySelectorAll(".rail-btn[data-app]");
    railBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const appId = btn.getAttribute("data-app");
        this.switchApp(appId);
      });
    });

    const mobileBtns = document.querySelectorAll(".mobile-nav-btn[data-app]");
    mobileBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const appId = btn.getAttribute("data-app");
        this.switchApp(appId);
      });
    });
  },

  switchApp(appId) {
    window.store.setActiveApp(appId);

    // Update rail active states
    document.querySelectorAll(".rail-btn[data-app]").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-app") === appId);
    });

    document.querySelectorAll(".mobile-nav-btn[data-app]").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-app") === appId);
    });

    // Update Stage views
    document.querySelectorAll(".app-stage-view").forEach(view => {
      view.style.display = view.id === `view-${appId}` ? "flex" : "none";
    });

    // Update Context Sidebar sections
    document.querySelectorAll(".sidebar-app-section").forEach(sec => {
      sec.style.display = sec.id === `sidebar-sec-${appId}` ? "block" : "none";
    });

    // Update Topbar Title & App Theme
    this.updateTopbar(appId);

    // Trigger Module Inits
    if (appId === "chat" && window.ChatModule) window.ChatModule.init();
    if (appId === "mail" && window.MailModule) window.MailModule.init();
    if (appId === "meet" && window.MeetModule) window.MeetModule.init();
    if (appId === "todo" && window.TodoModule) window.TodoModule.init();
    if (appId === "drive" && window.DriveModule) window.DriveModule.init();
    if (appId === "calendar" && window.CalendarModule) window.CalendarModule.init();
    if (appId === "tools" && window.ToolsModule) window.ToolsModule.init();
  },

  updateTopbar(appId) {
    const titleEl = document.getElementById("stage-title");
    const descEl = document.getElementById("stage-desc");

    const titles = {
      chat: { title: "MHEnt Chat", desc: "Kênh giao tiếp thời gian thực nội bộ" },
      mail: { title: "MHEnt Mail", desc: "Hộp thư điện tử nội bộ" },
      meet: { title: "MHEnt Meet", desc: "Hội nghị truyền hình bảo mật không giới hạn" },
      todo: { title: "MHEnt Todo", desc: "Bảng quản lý công việc Kanban" },
      drive: { title: "MHEnt Drive", desc: "Kho lưu trữ tài nguyên đa phương tiện" },
      calendar: { title: "MHEnt Calendar", desc: "Lịch sự kiện & Tìm thời gian rảnh" },
      tools: { title: "Phân Khu Đặc Nhiệm", desc: "QR Check-in, Wiki & Media Tools" }
    };

    if (titles[appId]) {
      if (titleEl) titleEl.textContent = titles[appId].title;
      if (descEl) descEl.textContent = titles[appId].desc;
    }
  },

  bindAisaDrawer() {
    const toggleBtn = document.getElementById("btn-toggle-aisa");
    const drawer = document.getElementById("aisa-drawer");
    const closeBtn = document.getElementById("btn-close-aisa-drawer");

    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const nextState = !window.store.state.aisaOpen;
        window.store.setAisaOpen(nextState);
        this.updateAisaDrawerState();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        window.store.setAisaOpen(false);
        this.updateAisaDrawerState();
      });
    }

    this.updateAisaDrawerState();
  },

  updateAisaDrawerState() {
    const drawer = document.getElementById("aisa-drawer");
    const toggleBtn = document.getElementById("btn-toggle-aisa");
    const isOpen = window.store.state.aisaOpen;

    if (drawer) {
      drawer.classList.toggle("collapsed", !isOpen);
    }
    if (toggleBtn) {
      toggleBtn.classList.toggle("active", isOpen);
    }
  },

  bindThemeToggle() {
    const themeBtn = document.getElementById("btn-toggle-theme");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        const newTheme = window.store.state.theme === "dark" ? "light" : "dark";
        window.store.setTheme(newTheme);
        this.updateTheme();
      });
    }
  },

  updateTheme() {
    const isDark = window.store.state.theme === "dark";
    document.body.classList.toggle("light-mode", !isDark);

    const icon = document.getElementById("theme-icon-text");
    if (icon) icon.textContent = isDark ? "🌙" : "☀️";
  },

  bindCommandPalette() {
    const overlay = document.getElementById("command-palette-overlay");
    const openBtn = document.getElementById("btn-open-command-palette");
    const input = document.getElementById("command-search-input");
    const resultsContainer = document.getElementById("command-results-list");

    const openPalette = () => {
      if (overlay) overlay.classList.add("open");
      if (input) {
        input.value = "";
        input.focus();
      }
      this.renderCommandResults("");
    };

    const closePalette = () => {
      if (overlay) overlay.classList.remove("open");
    };

    if (openBtn) openBtn.addEventListener("click", openPalette);

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        overlay.classList.contains("open") ? closePalette() : openPalette();
      }
      if (e.key === "Escape" && overlay && overlay.classList.contains("open")) {
        closePalette();
      }
    });

    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closePalette();
      });
    }

    if (input) {
      input.addEventListener("input", (e) => {
        this.renderCommandResults(e.target.value.toLowerCase());
      });
    }
  },

  renderCommandResults(query) {
    const resultsContainer = document.getElementById("command-results-list");
    if (!resultsContainer) return;

    const commands = [
      { id: "chat", title: "Mở MHEnt Chat", meta: "Chuyển sang ứng dụng tin nhắn", icon: "💬", action: () => this.switchApp("chat") },
      { id: "mail", title: "Mở MHEnt Mail", meta: "Kiểm tra hòm thư nội bộ", icon: "✉️", action: () => this.switchApp("mail") },
      { id: "meet", title: "Tạo phòng họp Meet", meta: "Bắt đầu cuộc gọi video Jitsi", icon: "📹", action: () => this.switchApp("meet") },
      { id: "todo", title: "Mở Bảng Todo", meta: "Xem tiến độ các công việc", icon: "📋", action: () => this.switchApp("todo") },
      { id: "drive", title: "Mở MHEnt Drive", meta: "Duyệt kho lưu trữ tài liệu", icon: "📁", action: () => this.switchApp("drive") },
      { id: "calendar", title: "Mở Lịch Workspace", meta: "Xem lịch trình sự kiện", icon: "📅", action: () => this.switchApp("calendar") },
      { id: "tools", title: "Mở Quick Tools", meta: "QR Check-in, Wiki & Media Tools", icon: "🛠️", action: () => this.switchApp("tools") },
      { id: "aisa", title: "Bật/Tắt AISA Copilot", meta: "Trợ lý AI Harmony & Echo", icon: "🌸", action: () => {
        window.store.setAisaOpen(!window.store.state.aisaOpen);
        this.updateAisaDrawerState();
      }},
      { id: "new-task", title: "Tạo Task Mới", meta: "Thêm công việc vào Kanban", icon: "➕", action: () => this.openModal("modal-add-task") },
      { id: "compose", title: "Soạn Thư Mới", meta: "Gửi email nội bộ", icon: "✏️", action: () => this.openModal("modal-compose-mail") }
    ];

    const filtered = commands.filter(c => c.title.toLowerCase().includes(query) || c.meta.toLowerCase().includes(query));

    resultsContainer.innerHTML = filtered.map(c => `
      <div class="command-item" onclick="window.UI.executeCommand('${c.id}')">
        <div class="command-item-left">
          <span class="command-item-icon">${c.icon}</span>
          <div>
            <div class="command-item-title">${c.title}</div>
            <div class="command-item-meta">${c.meta}</div>
          </div>
        </div>
        <span style="font-size: 11px; color: var(--text-muted);">↵ Chọn</span>
      </div>
    `).join("");

    this._currentCommands = filtered;
  },

  executeCommand(id) {
    const cmd = (this._currentCommands || []).find(c => c.id === id);
    if (cmd && cmd.action) {
      cmd.action();
    }
    const overlay = document.getElementById("command-palette-overlay");
    if (overlay) overlay.classList.remove("open");
  },

  bindModals() {
    document.querySelectorAll(".modal-close-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const modal = btn.closest(".modal-overlay");
        if (modal) modal.classList.remove("open");
      });
    });

    document.querySelectorAll(".modal-overlay").forEach(overlay => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.classList.remove("open");
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open"));
      }
    });
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("open");
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("open");
  },

  showToast(title, desc = "", type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `workspace-toast ${type}`;

    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "⚠️";
    if (type === "warning") icon = "🔔";

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${desc ? `<div class="toast-desc">${desc}</div>` : ""}
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-10px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};
