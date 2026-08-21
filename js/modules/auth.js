/**
 * MHENT WORKSPACE - FIREBASE AUTH & ORG ACCOUNT MODULE (AUTH.JS)
 * Quản lý phiên đăng nhập Firebase, Cổng xác thực đơn & Cấp tài khoản quản trị
 */
window.AuthModule = {
  auth: null,
  db: null,
  initialized: false,

  init() {
    this.initFirebase();
    this.bindEvents();
    this.updateUserUI();
  },

  initFirebase() {
    if (typeof firebase === "undefined") {
      console.warn("Firebase SDK chưa được tải, sử dụng chế độ Local Demo.");
      this.checkGatekeeper();
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.MHENT_CONFIG.FIREBASE_CONFIG);
      }
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      this.initialized = true;

      // Lắng nghe trạng thái đăng nhập Firebase
      this.auth.onAuthStateChanged((user) => {
        if (user) {
          this.handleFirebaseUserLogin(user);
        } else {
          this.checkGatekeeper();
        }
      });
    } catch (err) {
      console.warn("Lỗi khởi tạo Firebase Auth:", err);
      this.checkGatekeeper();
    }
  },

  checkGatekeeper() {
    const gatekeeper = document.getElementById("auth-gatekeeper-overlay");
    const isAuth = (this.auth && this.auth.currentUser) || (window.store && window.store.state && window.store.state.isLoggedIn);
    
    if (gatekeeper) {
      if (!isAuth) {
        gatekeeper.style.display = "flex";
      } else {
        gatekeeper.style.display = "none";
      }
    }
  },

  switchProfileTab(tabName) {
    const tabBtns = document.querySelectorAll(".profile-tab-btn");
    tabBtns.forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
    });

    const infoPane = document.getElementById("profile-pane-info");
    const createPane = document.getElementById("profile-pane-create");
    if (infoPane && createPane) {
      infoPane.style.display = tabName === "info" ? "block" : "none";
      createPane.style.display = tabName === "create" ? "block" : "none";
    }
  },

  bindEvents() {
    // Nút mở Modal Profile & Team Switcher từ Avatar
    const openAuthBtn = document.getElementById("btn-open-auth-modal");
    if (openAuthBtn) {
      openAuthBtn.addEventListener("click", () => this.openTeamModal());
    }

    // Nút Đăng xuất
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.logout());
    }
  },

  formatOrgEmail(input) {
    input = input.toLowerCase().replace(/\s+/g, "");
    if (input.includes("@")) {
      return input;
    }
    const domain = window.MHENT_CONFIG.ORG_DOMAIN || "@mhentuniverse.internal";
    return `${input}${domain}`;
  },

  async login(usernameOrEmail, password) {
    if (!usernameOrEmail || !password) return;
    const fullEmail = this.formatOrgEmail(usernameOrEmail);

    window.UI.showToast("Đang xác thực căn cước...", `Email: ${fullEmail}`, "info");

    if (!this.initialized || !this.auth) {
      // Fallback Local Mock Login
      window.store.setCurrentUser({
        id: "user-" + Date.now(),
        name: usernameOrEmail.split("@")[0].toUpperCase(),
        email: fullEmail,
        role: "master",
        avatar: "👑",
        status: "online"
      }, true);
      
      this.checkGatekeeper();
      window.UI.showToast("Đăng nhập thành công (Demo Mode)! 🎉", `Xin chào ${window.store.state.currentUser.name}`, "success");
      return;
    }

    try {
      await this.auth.signInWithEmailAndPassword(fullEmail, password);
      this.checkGatekeeper();
      window.UI.showToast("Đăng nhập Firebase thành công! 🔐", `Email: ${fullEmail}`, "success");
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      let errMsg = "Vui lòng kiểm tra lại tên đăng nhập hoặc mật khẩu.";
      if (error.code === "auth/user-not-found") errMsg = "Tài khoản không tồn tại. Hãy liên hệ Master để cấp tài khoản.";
      if (error.code === "auth/wrong-password") errMsg = "Mật khẩu không chính xác.";
      window.UI.showToast("Đăng nhập thất bại!", errMsg, "error");
    }
  },

  async loginWithGoogle() {
    if (!this.auth) {
      this.useDemoGuest();
      return;
    }
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await this.auth.signInWithPopup(provider);
      this.checkGatekeeper();
      window.UI.showToast("Đăng nhập Google thành công! 🚀", "Đã kết nối tài khoản", "success");
    } catch (error) {
      console.error("Lỗi Google Sign In:", error);
      window.UI.showToast("Đăng nhập Google thất bại", error.message, "error");
    }
  },

  useDemoGuest() {
    window.store.setCurrentUser({
      id: "guest-" + Date.now().toString().slice(-4),
      name: "Khách Trải Nghiệm",
      email: "guest@mhentuniverse.internal",
      role: "guest",
      avatar: "👤",
      status: "online"
    }, true);
    
    this.checkGatekeeper();
    window.UI.showToast("Đã vào Chế Độ Khách! 👀", "Dữ liệu lưu trữ tạm thời", "info");
    
    if (window.CloudModule) {
      window.CloudModule.setUser(window.store.state.currentUser.id, window.store.state.currentUser);
    }
  },

  /**
   * 👑 CẤP TÀI KHOẢN MỚI CHO THÀNH VIÊN (CHỈ DÀNH CHO MASTER / ADMIN)
   * Sử dụng Secondary Firebase App để Master không bị đăng xuất!
   */
  async createMemberAccount(username, fullName, password, role = "member") {
    const currentUser = window.store.state.currentUser;
    if (!currentUser || (currentUser.role !== "master" && currentUser.role !== "admin")) {
      window.UI.showToast("Không đủ thẩm quyền!", "Chỉ Master hoặc Admin mới có quyền cấp tài khoản nhân sự.", "error");
      return;
    }

    if (!username || !fullName || !password) {
      window.UI.showToast("Vui lòng điền đủ thông tin!", "", "warning");
      return;
    }

    const fullEmail = this.formatOrgEmail(username);
    window.UI.showToast("Đang khởi tạo tài khoản nhân sự...", `Email: ${fullEmail}`, "info");

    if (!this.initialized || !this.auth) {
      // Local Mode
      const newMember = {
        id: "user-" + Date.now(),
        name: fullName,
        email: fullEmail,
        role: role,
        avatar: role === "admin" ? "🛡️" : (role === "master" ? "👑" : "💻"),
        status: "offline"
      };
      if (!window.store.state.members) window.store.state.members = [];
      window.store.state.members.push(newMember);
      window.store.save();

      window.UI.showToast("Đã cấp tài khoản thành công! 🎉", `${fullName} (${role.toUpperCase()})`, "success");
      this.switchProfileTab("info");
      return;
    }

    try {
      // Dùng app phụ để không làm gián đoạn phiên đăng nhập của Master hiện tại
      const tempAppName = "AdminCreationApp_" + Date.now();
      const tempApp = firebase.initializeApp(window.MHENT_CONFIG.FIREBASE_CONFIG, tempAppName);

      const userCred = await tempApp.auth().createUserWithEmailAndPassword(fullEmail, password);
      const newUid = userCred.user.uid;

      // Lưu thông tin vào Firestore
      if (this.db) {
        await this.db.collection("users").doc(newUid).set({
          uid: newUid,
          displayName: fullName,
          email: fullEmail,
          role: role,
          avatar: role === "admin" ? "🛡️" : (role === "master" ? "👑" : "💻"),
          workspaceCode: window.store.state.workspace.code || "MHENT-CORE-2026",
          createdBy: currentUser.id,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      await userCred.user.updateProfile({ displayName: fullName });
      await tempApp.delete(); // Dọn dẹp app phụ

      window.UI.showToast("Cấp tài khoản nhân sự thành công! 🚀", `Thành viên: ${fullName} (${fullEmail})`, "success");
      
      // Reset form & chuyển về tab info
      const form = document.getElementById("form-master-create-member");
      if (form) form.reset();
      this.switchProfileTab("info");
    } catch (error) {
      console.error("Lỗi cấp tài khoản:", error);
      let errMsg = error.message;
      if (error.code === "auth/email-already-in-use") errMsg = "Tên đăng nhập / Email này đã tồn tại.";
      if (error.code === "auth/weak-password") errMsg = "Mật khẩu cần ít nhất 6 ký tự.";
      window.UI.showToast("Không thể tạo tài khoản!", errMsg, "error");
    }
  },

  async handleFirebaseUserLogin(firebaseUser) {
    let userData = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
      email: firebaseUser.email,
      role: "member",
      avatar: "👤",
      status: "online"
    };

    // Đọc thông tin chi tiết từ Firestore nếu có
    if (this.db) {
      try {
        const doc = await this.db.collection("users").doc(firebaseUser.uid).get();
        if (doc.exists) {
          const d = doc.data();
          userData.name = d.displayName || userData.name;
          userData.role = d.role || "member";
          userData.avatar = d.avatar || (userData.role.includes("admin") || userData.role.includes("master") ? "👑" : "💻");
        }
      } catch (e) {
        console.warn("Không thể tải Firestore user profile, dùng mặc định:", e);
      }
    }

    window.store.setCurrentUser(userData, true);
    this.updateUserUI();
    this.checkGatekeeper();

    // Đồng bộ sang Supabase & Firestore Cloud theo UID của user
    if (window.CloudModule) {
      window.CloudModule.setUser(firebaseUser.uid, userData);
    }
  },

  async logout() {
    if (this.auth) {
      await this.auth.signOut();
    }
    window.store.setCurrentUser({
      id: "guest",
      name: "Khách Vãng Lai",
      email: "guest@mhentuniverse.internal",
      role: "guest",
      avatar: "👤",
      status: "offline"
    }, false);
    
    window.UI.closeModal("modal-team-switcher");
    this.updateUserUI();
    this.checkGatekeeper();
    window.UI.showToast("Đã đăng xuất!", "Vui lòng đăng nhập lại để sử dụng workspace.", "info");
  },

  updateUserUI() {
    const user = window.store.state.currentUser || {};
    const ws = window.store.state.workspace || {};

    const nameEls = document.querySelectorAll(".user-display-name");
    nameEls.forEach(el => el.textContent = user.name || "Master");

    const emailEls = document.querySelectorAll(".user-display-email");
    emailEls.forEach(el => el.textContent = user.email || "");

    const roleEls = document.querySelectorAll(".user-display-role");
    roleEls.forEach(el => {
      el.textContent = (user.role || "MEMBER").toUpperCase();
      el.className = `badge ${user.role === 'master' || user.role === 'admin' ? 'badge-primary' : 'badge-purple'} user-display-role`;
    });

    const avtEls = document.querySelectorAll(".user-display-avatar");
    avtEls.forEach(el => el.textContent = user.avatar || "👤");

    const wsNameEl = document.querySelector(".workspace-name");
    if (wsNameEl) wsNameEl.textContent = ws.name || "MHEnt Universe HQ";

    const wsCodeEls = document.querySelectorAll(".workspace-code");
    wsCodeEls.forEach(el => {
      if (el.tagName === "INPUT") el.value = ws.code || "MHENT-CORE-2026";
      else el.textContent = ws.code || "MHENT-CORE-2026";
    });

    // Quyền cấp tài khoản: Chỉ hiển thị Tab cấp tài khoản nếu là Master hoặc Admin
    const masterTabBtn = document.getElementById("tab-btn-master-create-acc");
    if (masterTabBtn) {
      const isMasterOrAdmin = (user.role === "master" || user.role === "admin");
      masterTabBtn.style.display = isMasterOrAdmin ? "block" : "none";
    }
  },

  toggleRole() {
    const current = window.store.state.currentUser.role;
    const newRole = current === "master" ? "member" : "master";
    window.store.state.currentUser.role = newRole;
    window.store.state.currentUser.avatar = newRole === "master" ? "👑" : "💻";
    window.store.save();
    this.updateUserUI();
    window.UI.showToast("Chuyển quyền thành công!", `Bạn hiện đang ở quyền: ${newRole.toUpperCase()}`, "info");
  },

  openTeamModal() {
    this.switchProfileTab("info");
    this.renderWorkspacesList();
    window.UI.openModal("modal-team-switcher");
  },

  // Vector SVG Map for Workspaces
  getWorkspaceIconSvg(iconKey) {
    const icons = {
      planet: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8"/></svg>`,
      code: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
      media: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ec4899" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect width="15" height="14" x="1" y="5" rx="2" ry="2"/></svg>`,
      game: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>`,
      art: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
      rocket: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>`,
      building: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/></svg>`
    };
    return icons[iconKey] || icons.planet;
  },

  suggestWorkspaceCode(name) {
    const codeInput = document.getElementById("new-ws-code");
    if (!codeInput) return;
    if (!name || !name.trim()) {
      codeInput.value = "";
      return;
    }
    const cleanSlug = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "TEAM";
    codeInput.value = `MHENT-${cleanSlug}`;
  },

  renderWorkspacesList() {
    const listEl = document.getElementById("my-workspaces-list");
    if (!listEl) return;

    const workspaces = window.store.getUserWorkspaces();
    const currentCode = window.store.state.workspace ? window.store.state.workspace.code : "MHENT-CORE-2026";

    listEl.innerHTML = workspaces.map(ws => {
      const isActive = ws.code === currentCode;
      const roleLabel = (ws.role || "member").toUpperCase();
      const roleBadgeClass = ws.role === "master" ? "badge-primary" : (ws.role === "admin" ? "badge-warning" : "badge-purple");
      const iconSvg = this.getWorkspaceIconSvg(ws.icon || "planet");
      const isMasterOrOwner = ws.role === "master" || ws.isOwner;

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; background: ${isActive ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-surface-elevated)'}; border: 1px solid ${isActive ? 'var(--primary)' : 'var(--border-subtle)'}; border-radius: var(--radius-sm); padding: 10px 12px; transition: var(--transition-fast);">
          <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
            <div style="width: 34px; height: 34px; border-radius: 8px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${iconSvg}
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 800; font-size: 13.5px; color: var(--text-high); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ws.name}</div>
              <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                <span style="font-family: var(--font-mono); font-size: 10.5px; color: var(--text-muted);">${ws.code}</span>
                <span class="badge ${roleBadgeClass}" style="font-size: 9.5px; padding: 1px 5px;">${roleLabel}</span>
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-left: 8px;">
            ${isActive ? `
              <span style="font-size: 11px; font-weight: 700; color: var(--status-online); display: flex; align-items: center; gap: 4px;">🟢 Đang dùng</span>
              <button class="btn btn-secondary btn-sm" style="padding: 4px 7px; font-size: 11px;" onclick="navigator.clipboard.writeText('${ws.code}'); window.UI.showToast('Đã copy mã!', '${ws.code}', 'success');" title="Sao chép mã">📋</button>
            ` : `
              <button class="btn btn-primary btn-sm" style="padding: 4px 10px; font-size: 11.5px;" onclick="window.AuthModule.selectWorkspace('${ws.code}')">Chuyển</button>
            `}
            ${isMasterOrOwner ? `
              <button class="btn btn-ghost btn-sm" style="padding: 4px 6px; color: #ef4444;" onclick="window.AuthModule.handleDeleteWorkspace('${ws.code}')" title="Xóa Không Gian (Quyền Master)">🗑️</button>
            ` : `
              <button class="btn btn-ghost btn-sm" style="padding: 4px 6px; color: #f59e0b;" onclick="window.AuthModule.handleLeaveWorkspace('${ws.code}')" title="Rời Khỏi Không Gian">🚪</button>
            `}
          </div>
        </div>
      `;
    }).join("");
  },

  toggleCreateWorkspaceBox() {
    const box = document.getElementById("box-create-workspace");
    const joinBox = document.getElementById("box-join-workspace");
    if (joinBox) joinBox.style.display = "none";
    if (box) {
      box.style.display = box.style.display === "none" ? "block" : "none";
      if (box.style.display === "block") {
        const input = document.getElementById("new-ws-name");
        if (input) input.focus();
      }
    }
  },

  toggleJoinWorkspaceBox() {
    const joinBox = document.getElementById("box-join-workspace");
    const box = document.getElementById("box-create-workspace");
    if (box) box.style.display = "none";
    if (joinBox) {
      joinBox.style.display = joinBox.style.display === "none" ? "block" : "none";
      if (joinBox.style.display === "block") {
        const input = document.getElementById("join-team-code-input");
        if (input) input.focus();
      }
    }
  },

  handleCreateWorkspace() {
    const nameInput = document.getElementById("new-ws-name");
    const codeInput = document.getElementById("new-ws-code");
    const iconInput = document.getElementById("new-ws-icon");

    if (!nameInput || !nameInput.value.trim()) {
      window.UI.showToast("Vui lòng nhập tên Không Gian!", "Ví dụ: Game Dev Studio", "warning");
      return;
    }

    const name = nameInput.value.trim();
    const customCode = codeInput ? codeInput.value.trim() : "";
    const icon = iconInput ? iconInput.value : "planet";

    const newWs = window.store.createWorkspace(name, icon, customCode);

    if (newWs) {
      nameInput.value = "";
      if (codeInput) codeInput.value = "";
      document.getElementById("box-create-workspace").style.display = "none";
      this.updateUserUI();
      this.renderWorkspacesList();

      if (window.CloudModule) {
        window.CloudModule.bindWorkspace(newWs.code);
      }

      window.UI.showToast("Khởi tạo Không Gian thành công! 🎉", `Bạn hiện là Master 👑 của [${newWs.name}] (${newWs.code})`, "success");
    }
  },

  selectWorkspace(code) {
    window.store.switchWorkspace(code);
    this.updateUserUI();
    this.renderWorkspacesList();

    if (window.CloudModule) {
      window.CloudModule.bindWorkspace(code);
    }

    const ws = window.store.state.workspace;
    window.UI.showToast("Đã chuyển Không Gian! ⚡", `${ws.name} [${ws.code}] - Quyền: ${ws.role.toUpperCase()}`, "success");
  },

  handleDeleteWorkspace(code) {
    const ws = window.store.getUserWorkspaces().find(w => w.code === code);
    const wsName = ws ? ws.name : code;

    window.showConfirmPopup("Xóa Không Gian (Master)", `Bạn có chắc muốn XÓA không gian [${wsName}] (${code})? Toàn bộ kênh và dữ liệu của không gian này sẽ bị gỡ bỏ khỏi danh sách.`, () => {
      const ok = window.store.deleteWorkspace(code);
      if (ok) {
        this.updateUserUI();
        this.renderWorkspacesList();
        if (window.CloudModule && window.store.state.workspace) {
          window.CloudModule.bindWorkspace(window.store.state.workspace.code);
        }
        window.UI.showToast("Đã xóa Không Gian thành công!", `Đã gỡ bỏ [${wsName}]`, "info");
      }
    });
  },

  handleLeaveWorkspace(code) {
    const ws = window.store.getUserWorkspaces().find(w => w.code === code);
    const wsName = ws ? ws.name : code;

    window.showConfirmPopup("Rời Khỏi Không Gian", `Bạn có chắc muốn RỜI KHỎI không gian [${wsName}] (${code})?`, () => {
      const ok = window.store.deleteWorkspace(code);
      if (ok) {
        this.updateUserUI();
        this.renderWorkspacesList();
        if (window.CloudModule && window.store.state.workspace) {
          window.CloudModule.bindWorkspace(window.store.state.workspace.code);
        }
        window.UI.showToast("Đã rời Không Gian!", `Bạn đã rời [${wsName}]`, "info");
      }
    });
  },

  joinTeam(code) {
    if (!code || !code.trim()) {
      window.UI.showToast("Vui lòng nhập mã Không Gian!", "Ví dụ: MHENT-MEDIA-2026", "warning");
      return;
    }

    const ws = window.store.joinWorkspace(code);
    if (ws) {
      const input = document.getElementById("join-team-code-input");
      if (input) input.value = "";
      const joinBox = document.getElementById("box-join-workspace");
      if (joinBox) joinBox.style.display = "none";

      this.updateUserUI();
      this.renderWorkspacesList();

      if (window.CloudModule) {
        window.CloudModule.bindWorkspace(ws.code);
      }

      window.UI.showToast("Gia nhập Không Gian thành công! ⚡", `Không gian làm việc: ${ws.code}`, "success");
    }
  }
};
