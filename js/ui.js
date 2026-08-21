/**
 * MHENT WORKSPACE - UI CONTROLLER, URL ROUTER & COMMAND PALETTE (UI.JS)
 */
window.UI = {
  init() {
    this.bindRailNavigation();
    this.bindCommandPalette();
    this.bindModals();
    this.bindAisaDrawer();
    this.bindThemeToggle();
    this.bindResizers();
    this.updateTheme();
    this.initRouting();
  },

  initRouting() {
    const path = window.location.pathname.replace(/^\/+/, '').split('/')[0];
    const hash = window.location.hash.replace(/^#+/, '');
    const urlParams = new URLSearchParams(window.location.search);
    const queryApp = urlParams.get('app');

    const initialApp = queryApp || path || hash || window.store.state.activeApp || "chat";
    const validApps = ["chat", "mail", "meet", "todo", "drive", "calendar", "tools", "aisa"];

    if (validApps.includes(initialApp)) {
      if (initialApp === "aisa") {
        this.switchApp("chat", false);
        window.store.setAisaOpen(true);
        this.updateAisaDrawerState();
      } else {
        this.switchApp(initialApp, false);
      }
    } else {
      this.switchApp("chat", false);
    }

    // Lắng nghe nút Back/Forward của trình duyệt
    window.addEventListener("popstate", (event) => {
      const app = (event.state && event.state.app) || window.location.pathname.replace(/^\/+/, '') || window.location.hash.replace(/^#+/, '') || "chat";
      if (validApps.includes(app)) {
        this.switchApp(app, false);
      }
    });
  },

  bindRailNavigation() {
    const railBtns = document.querySelectorAll(".rail-btn[data-app]");
    railBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const appId = btn.getAttribute("data-app");
        this.switchApp(appId, true);
      });
    });

    const mobileBtns = document.querySelectorAll(".mobile-nav-btn[data-app]");
    mobileBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const appId = btn.getAttribute("data-app");
        this.switchApp(appId, true);
      });
    });
  },

  switchApp(appId, updateHistory = true) {
    const validApps = ["chat", "mail", "meet", "todo", "drive", "calendar", "tools", "aisa"];
    if (!validApps.includes(appId)) appId = "chat";

    if (appId === "aisa") {
      window.store.setAisaOpen(true);
      this.updateAisaDrawerState();
      return;
    }

    window.store.setActiveApp(appId);

    // URL ROUTING VIA HTML5 HISTORY API (Không làm reload trang)
    if (updateHistory) {
      const targetPath = `/${appId}`;
      if (window.location.pathname !== targetPath && window.location.hash !== `#${appId}`) {
        try {
          history.pushState({ app: appId }, "", targetPath);
        } catch (e) {
          window.location.hash = `#${appId}`;
        }
      }
    }

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
      { id: "chat", title: "Mở MHEnt Chat", meta: "Chuyển sang ứng dụng tin nhắn (/chat)", icon: "💬", action: () => this.switchApp("chat", true) },
      { id: "mail", title: "Mở MHEnt Mail", meta: "Kiểm tra hòm thư nội bộ (/mail)", icon: "✉️", action: () => this.switchApp("mail", true) },
      { id: "meet", title: "Tạo phòng họp Meet", meta: "Bắt đầu cuộc gọi video Jitsi (/meet)", icon: "📹", action: () => this.switchApp("meet", true) },
      { id: "todo", title: "Mở Bảng Todo", meta: "Xem tiến độ các công việc (/todo)", icon: "📋", action: () => this.switchApp("todo", true) },
      { id: "drive", title: "Mở MHEnt Drive", meta: "Duyệt kho lưu trữ tài liệu (/drive)", icon: "📁", action: () => this.switchApp("drive", true) },
      { id: "calendar", title: "Mở Lịch Workspace", meta: "Xem lịch trình sự kiện (/calendar)", icon: "📅", action: () => this.switchApp("calendar", true) },
      { id: "tools", title: "Mở Quick Tools", meta: "QR Check-in, Wiki & Media Tools (/tools)", icon: "🛠️", action: () => this.switchApp("tools", true) },
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
    let container = document.getElementById('mhent-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'mhent-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `mhent-toast ${type}`;

    let iconSvg = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="#3b82f6" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    if (type === 'success') {
      iconSvg = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="#10b981" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="#ef4444" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="#f59e0b" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    }

    toast.innerHTML = `
      <div class="mhent-toast-icon">${iconSvg}</div>
      <div class="mhent-toast-content">
        <div class="mhent-toast-title">${title}</div>
        ${desc ? `<div class="mhent-toast-desc">${desc}</div>` : ''}
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "toastFadeOut 0.35s forwards";
      setTimeout(() => toast.remove(), 350);
    }, 3800);
  },

  toggleMobileSidebar(forceState) {
    const sidebar = document.getElementById("context-sidebar");
    if (sidebar) {
      if (typeof forceState === "boolean") {
        sidebar.classList.toggle("open", forceState);
      } else {
        sidebar.classList.toggle("open");
      }
    }
  },

  bindResizers() {
    // 1. Sidebar Resizer
    const sidebarResizer = document.getElementById("resizer-sidebar");
    const sidebar = document.getElementById("context-sidebar");
    if (sidebarResizer && sidebar) {
      this.createDraggableResizer(sidebarResizer, (deltaX) => {
        const currentWidth = sidebar.getBoundingClientRect().width;
        const newWidth = Math.max(180, Math.min(480, currentWidth + deltaX));
        sidebar.style.width = `${newWidth}px`;
      });
    }

    // 2. Mail Split Resizer
    const mailResizer = document.getElementById("resizer-mail");
    const mailPane = document.getElementById("mail-list-pane");
    if (mailResizer && mailPane) {
      this.createDraggableResizer(mailResizer, (deltaX) => {
        const currentWidth = mailPane.getBoundingClientRect().width;
        const newWidth = Math.max(220, Math.min(650, currentWidth + deltaX));
        mailPane.style.width = `${newWidth}px`;
      });
    }

    // 3. AISA Drawer Resizer
    const aisaResizer = document.getElementById("resizer-aisa");
    const aisaDrawer = document.getElementById("aisa-drawer");
    if (aisaResizer && aisaDrawer) {
      this.createDraggableResizer(aisaResizer, (deltaX) => {
        const currentWidth = aisaDrawer.getBoundingClientRect().width;
        const newWidth = Math.max(260, Math.min(750, currentWidth - deltaX));
        aisaDrawer.style.width = `${newWidth}px`;
      });
    }
  },

  createDraggableResizer(resizerEl, onMoveCallback) {
    let isDragging = false;
    let startX = 0;

    const onMouseDown = (e) => {
      e.preventDefault();
      isDragging = true;
      startX = e.clientX;
      resizerEl.classList.add("resizing");
      document.body.classList.add("is-resizing");

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;
      startX = e.clientX;
      onMoveCallback(deltaX);
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      resizerEl.classList.remove("resizing");
      document.body.classList.remove("is-resizing");
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    resizerEl.addEventListener("mousedown", onMouseDown);

    // Support touch devices / tablets
    resizerEl.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX;
        resizerEl.classList.add("resizing");
        document.body.classList.add("is-resizing");
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - startX;
      startX = e.touches[0].clientX;
      onMoveCallback(deltaX);
    }, { passive: true });

    window.addEventListener("touchend", () => {
      if (isDragging) {
        isDragging = false;
        resizerEl.classList.remove("resizing");
        document.body.classList.remove("is-resizing");
      }
    });
  }
};

// Global shortcuts compatible with MHEnt Universe
window.showToast = function(title, message, type = 'info') {
  window.UI.showToast(title, message, type);
};

window.showPopup = function(message, isError = false) {
  const existing = document.querySelectorAll('.mhent-ui-overlay');
  existing.forEach(el => el.remove());

  const overlay = document.createElement('div');
  overlay.className = 'mhent-ui-overlay';
  overlay.id = 'mhent-active-popup';

  const svgSuccess = `<svg viewBox="0 0 24 24" width="44" height="44" stroke="#10b981" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
  const svgError = `<svg viewBox="0 0 24 24" width="44" height="44" stroke="#ef4444" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;

  overlay.innerHTML = `
    <div class="mhent-ui-box ${isError ? 'error' : 'success'}">
      <div class="mhent-ui-icon">${isError ? svgError : svgSuccess}</div>
      <h3 class="mhent-ui-title">${isError ? "Ối, Có Lỗi Xảy Ra!" : "Thông Báo"}</h3>
      <p class="mhent-ui-msg">${message}</p>
      <button class="mhent-ui-btn-primary" onclick="window.closePopup()">Tuyệt Vời</button>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('show'), 10);
};

window.showConfirmPopup = function(title, message, onConfirm) {
  const existing = document.querySelectorAll('.mhent-ui-overlay');
  existing.forEach(el => el.remove());

  const overlay = document.createElement('div');
  overlay.className = 'mhent-ui-overlay';
  overlay.id = 'mhent-active-confirm';

  const svgWarning = `<svg viewBox="0 0 24 24" width="44" height="44" stroke="#f59e0b" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

  overlay.innerHTML = `
    <div class="mhent-ui-box warning">
      <div class="mhent-ui-icon">${svgWarning}</div>
      <h3 class="mhent-ui-title">${title}</h3>
      <p class="mhent-ui-msg">${message}</p>
      <div class="mhent-ui-actions">
        <button class="mhent-ui-btn-outline" id="mhent-cancel">Hủy bỏ</button>
        <button class="mhent-ui-btn-primary" id="mhent-accept">Xác nhận</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('show'), 10);

  document.getElementById('mhent-cancel').onclick = () => window.closeConfirmPopup();
  document.getElementById('mhent-accept').onclick = () => {
    window.closeConfirmPopup();
    if (typeof onConfirm === 'function') onConfirm();
  };
};

window.closePopup = function() {
  const popup = document.getElementById('mhent-active-popup');
  if (popup) {
    popup.classList.remove('show');
    popup.classList.add('out');
    setTimeout(() => popup.remove(), 350);
  }
};

window.closeConfirmPopup = function() {
  const confirm = document.getElementById('mhent-active-confirm');
  if (confirm) {
    confirm.classList.remove('show');
    confirm.classList.add('out');
    setTimeout(() => confirm.remove(), 350);
  }
};

