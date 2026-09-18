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

  activeRoleFilter: "all",
  memberSearchQuery: "",
  currentManageWsCode: "MHENT-CORE-2026",
  manageSearchQuery: "",

  switchProfileTab(tabName) {
    const tabBtns = document.querySelectorAll(".profile-tab-btn");
    tabBtns.forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
    });

    const infoPane = document.getElementById("profile-pane-info");
    const createPane = document.getElementById("profile-pane-create");
    const wsManagePane = document.getElementById("profile-pane-ws-manage");

    if (infoPane) infoPane.style.display = tabName === "info" ? "block" : "none";
    if (createPane) createPane.style.display = tabName === "create" ? "block" : "none";
    if (wsManagePane) wsManagePane.style.display = tabName === "ws-manage" ? "block" : "none";
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

    const currentWsCode = (this.currentManageWsCode || (window.store.state.workspace ? window.store.state.workspace.code : "MHENT-CORE-2026")).toUpperCase();

    if (!this.initialized || !this.auth) {
      // Local Mode
      const newMember = {
        id: "user-" + Date.now(),
        name: fullName,
        email: fullEmail,
        role: role,
        avatar: role === "admin" ? "🛡️" : (role === "master" ? "👑" : (role === "guest" ? "👤" : "💻")),
        status: "online",
        workspaceCode: currentWsCode,
        joinedAt: new Date().toISOString()
      };
      window.store.addMemberToWorkspace(newMember, currentWsCode);

      if (window.CloudModule) {
        window.CloudModule.pushMemberToWorkspaceCloud(currentWsCode, newMember).catch(() => {});
      }

      window.UI.showToast("Cấp tài khoản nhân sự thành công! 🎉", `Email: ${fullEmail} - Đã gán vào Không Gian [${currentWsCode}]`, "success");
      const form = document.getElementById("form-master-create-member");
      if (form) form.reset();
      this.updateMembersBadge();
      this.renderSidebarMembers();
      this.openWorkspaceManage(currentWsCode);
      return;
    }

    try {
      // Dùng app phụ để không làm gián đoạn phiên đăng nhập của Master hiện tại
      const tempAppName = "AdminCreationApp_" + Date.now();
      const tempApp = firebase.initializeApp(window.MHENT_CONFIG.FIREBASE_CONFIG, tempAppName);

      const userCred = await tempApp.auth().createUserWithEmailAndPassword(fullEmail, password);
      const newUid = userCred.user.uid;
      const newMemberData = {
        id: newUid,
        name: fullName,
        email: fullEmail,
        role: role,
        avatar: role === "admin" ? "🛡️" : (role === "master" ? "👑" : (role === "guest" ? "👤" : "💻")),
        status: "online",
        workspaceCode: currentWsCode,
        joinedAt: new Date().toISOString()
      };

      // Lưu thông tin vào Firestore & Supabase qua CloudModule
      if (this.db) {
        await this.db.collection("users").doc(newUid).set({
          uid: newUid,
          displayName: fullName,
          email: fullEmail,
          role: role,
          avatar: newMemberData.avatar,
          workspaceCode: currentWsCode,
          createdBy: currentUser.id,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      if (window.CloudModule) {
        await window.CloudModule.pushMemberToWorkspaceCloud(currentWsCode, newMemberData);
      }

      window.store.addMemberToWorkspace(newMemberData, currentWsCode);

      await userCred.user.updateProfile({ displayName: fullName });
      await tempApp.delete(); // Dọn dẹp app phụ

      window.UI.showToast("Cấp tài khoản nhân sự thành công! 🚀", `Thành viên: ${fullName} (${fullEmail})`, "success");
      
      // Reset form & chuyển về tab xem thành viên
      const form = document.getElementById("form-master-create-member");
      if (form) form.reset();
      this.updateMembersBadge();
      this.renderSidebarMembers();
      this.switchProfileTab("members");
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

  getWorkspaceEmoji(icon) {
    const map = { planet: "🪐", code: "💻", media: "🎬", game: "🎮", art: "🎨", rocket: "🚀", building: "🏢" };
    return map[icon] || "🪐";
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

    const wsNameEls = document.querySelectorAll(".workspace-name");
    wsNameEls.forEach(el => el.textContent = ws.name || "MHEnt Universe HQ");

    const wsCodeEls = document.querySelectorAll(".workspace-code");
    wsCodeEls.forEach(el => {
      if (el.tagName === "INPUT") el.value = ws.code || "MHENT-CORE-2026";
      else el.textContent = ws.code || "MHENT-CORE-2026";
    });

    const wsIconEmoji = this.getWorkspaceEmoji(ws.icon || "planet");
    const wsIconEls = document.querySelectorAll(".workspace-icon");
    wsIconEls.forEach(el => el.textContent = wsIconEmoji);

    // Quyền cấp tài khoản & Quyền quản trị (Dành riêng cho Master/Admin)
    const isMaster = (user.role === "master");
    const isMasterOrAdmin = (user.role === "master" || user.role === "admin");

    const masterTabBtn = document.getElementById("tab-btn-master-create-acc");
    if (masterTabBtn) {
      masterTabBtn.style.display = isMasterOrAdmin ? "block" : "none";
    }

    const sidebarToolbar = document.getElementById("sidebar-master-toolbar");
    if (sidebarToolbar) {
      sidebarToolbar.style.display = isMaster ? "block" : "none";
    }

    this.updateMembersBadge();
    this.renderSidebarMembers();
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
    const currentUser = window.store.state.currentUser || {};

    listEl.innerHTML = workspaces.map(ws => {
      const isActive = ws.code === currentCode;
      const roleLabel = (ws.role || "member").toUpperCase();
      const roleBadgeClass = ws.role === "master" ? "badge-primary" : (ws.role === "admin" ? "badge-warning" : "badge-purple");
      const iconEmoji = this.getWorkspaceEmoji(ws.icon || "planet");

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; background: ${isActive ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-surface-elevated)'}; border: 1px solid ${isActive ? 'var(--primary)' : 'var(--border-subtle)'}; border-radius: var(--radius-sm); padding: 10px 12px; transition: var(--transition-fast);">
          <!-- Nhấp vào thẻ để mở ngay giao diện Chỉnh Sửa & Cấp Quyền của Không Gian đó -->
          <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; cursor: pointer;" onclick="window.AuthModule.openWorkspaceManage('${ws.code}')" title="Bấm để Chỉnh Sửa & Cấp Quyền Không Gian này 👑">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">
              ${iconEmoji}
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-weight: 800; font-size: 13.5px; color: var(--text-high); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ws.name}</span>
                <span style="font-size: 11px; opacity: 0.7;">✏️</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                <span style="font-family: var(--font-mono); font-size: 10.5px; color: var(--text-muted);">${ws.code}</span>
                <span class="badge ${roleBadgeClass}" style="font-size: 9.5px; padding: 1px 5px;">${roleLabel}</span>
              </div>
            </div>
          </div>

          <!-- Các nút thao tác bên phải -->
          <div style="display: flex; align-items: center; gap: 6px; margin-left: 8px; flex-shrink: 0;">
            ${isActive ? `
              <span style="font-size: 11px; font-weight: 700; color: var(--status-online); display: flex; align-items: center; gap: 4px;">🟢 Đang dùng</span>
            ` : `
              <button type="button" class="btn btn-primary btn-sm" style="padding: 4px 10px; font-size: 11.5px;" onclick="window.AuthModule.selectWorkspace('${ws.code}')" title="Chuyển sang làm việc tại Không Gian này">Chuyển</button>
            `}
            <button type="button" class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 11px;" onclick="window.AuthModule.openWorkspaceManage('${ws.code}')" title="Chỉnh Sửa & Cấp Quyền Không Gian này">
              ⚙️ Quản Lý
            </button>
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
        window.CloudModule.saveWorkspaceToSupabase(newWs);
        window.CloudModule.bindWorkspace(newWs.code);
      }

      window.UI.showToast("Khởi tạo Không Gian thành công! 🎉", `Bạn hiện là Master 👑 của [${newWs.name}] (${newWs.code})`, "success");
    }
  },

  selectWorkspace(code) {
    const ws = window.store.switchWorkspace(code);
    this.updateUserUI();
    this.renderWorkspacesList();

    // Nếu đang ở màn hình quản trị workspace, cập nhật lại trạng thái nút kích hoạt
    if (this.currentManageWsCode) {
      this.openWorkspaceManage(this.currentManageWsCode);
    }

    // Refresh toàn bộ các mô-đun ứng dụng theo Không Gian mới
    if (window.ChatModule && typeof window.ChatModule.renderMessages === "function") {
      window.ChatModule.renderMessages();
    }
    if (window.TodoModule && typeof window.TodoModule.renderBoard === "function") {
      window.TodoModule.renderBoard();
    }
    if (window.DriveModule && typeof window.DriveModule.renderFiles === "function") {
      window.DriveModule.renderFiles();
    }
    if (window.CalendarModule && typeof window.CalendarModule.renderCalendar === "function") {
      window.CalendarModule.renderCalendar();
    }

    if (window.CloudModule) {
      window.CloudModule.bindWorkspace(code);
    }

    window.UI.showToast("Đã chuyển Không Gian! ⚡", `${ws.name} [${ws.code}] - Quyền: ${(ws.role || "MEMBER").toUpperCase()}`, "success");
  },

  handleDeleteWorkspace(code) {
    const ws = window.store.getUserWorkspaces().find(w => w.code === code);
    const wsName = ws ? ws.name : code;

    window.showConfirmPopup("Xóa Không Gian (Master)", `Bạn có chắc muốn XÓA không gian [${wsName}] (${code})? Toàn bộ kênh và dữ liệu của không gian này sẽ bị gỡ bỏ khỏi danh sách.`, () => {
      const ok = window.store.deleteWorkspace(code);
      if (ok) {
        if (window.CloudModule) {
          window.CloudModule.deleteWorkspaceFromSupabase(code);
        }
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
        if (window.CloudModule) {
          window.CloudModule.deleteWorkspaceFromSupabase(code);
        }
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
  },

  // ==========================================
  // WORKSPACE DRILL-DOWN: EDIT & MEMBERS MANAGEMENT
  // ==========================================

  openMembersModal() {
    const code = window.store.state.workspace ? window.store.state.workspace.code : "MHENT-CORE-2026";
    this.openWorkspaceManage(code);
  },

  openMembersModalFor(wsCode) {
    this.openWorkspaceManage(wsCode);
  },

  openWorkspaceManage(wsCode) {
    const code = (wsCode || (window.store.state.workspace ? window.store.state.workspace.code : "MHENT-CORE-2026")).toUpperCase();
    this.currentManageWsCode = code;

    const workspaces = window.store.getUserWorkspaces();
    const targetWs = workspaces.find(w => w.code === code) || {
      code: code,
      name: `Workspace [${code}]`,
      icon: "planet",
      role: "member"
    };

    // Đổ dữ liệu vào form Chỉnh Sửa Không Gian
    const nameInput = document.getElementById("ws-manage-name-input");
    if (nameInput) nameInput.value = targetWs.name;

    const iconSelect = document.getElementById("ws-manage-icon-select");
    if (iconSelect) iconSelect.value = targetWs.icon || "planet";

    const codeInput = document.getElementById("ws-manage-code-input");
    if (codeInput) codeInput.value = targetWs.code;

    const codeBadge = document.getElementById("ws-manage-code-badge");
    if (codeBadge) codeBadge.textContent = targetWs.code;

    const iconDisplay = document.getElementById("ws-manage-icon-display");
    if (iconDisplay) iconDisplay.textContent = this.getWorkspaceEmoji(targetWs.icon || "planet");

    // Hiển thị trạng thái kích hoạt
    const activeWs = window.store.state.workspace || {};
    const isActive = activeWs.code === targetWs.code;
    const activeStatusEl = document.getElementById("ws-manage-active-status");
    if (activeStatusEl) {
      if (isActive) {
        activeStatusEl.innerHTML = `<span class="badge badge-success" style="font-size: 11px; padding: 4px 9px; font-weight: 700;">🟢 Đang Làm Việc Tại Đây</span>`;
      } else {
        activeStatusEl.innerHTML = `<button type="button" class="btn btn-primary btn-sm" onclick="window.AuthModule.selectWorkspace('${targetWs.code}')" style="font-size: 11px; padding: 4px 10px; font-weight: 700;">⚡ Chọn Làm Việc Tại Đây</button>`;
      }
    }

    // Hiển thị nút Xóa / Rời Không Gian
    const currentUser = window.store.state.currentUser || {};
    const isMaster = targetWs.role === "master" || targetWs.isOwner || currentUser.role === "master";
    const deleteBtn = document.getElementById("btn-ws-manage-delete");
    if (deleteBtn) {
      if (isMaster) {
        deleteBtn.textContent = "🗑️ Xóa WS";
        deleteBtn.onclick = () => window.AuthModule.handleDeleteWorkspace(targetWs.code);
        deleteBtn.style.display = workspaces.length > 1 ? "block" : "none";
      } else {
        deleteBtn.textContent = "🚪 Rời WS";
        deleteBtn.onclick = () => window.AuthModule.handleLeaveWorkspace(targetWs.code);
        deleteBtn.style.display = "block";
      }
    }

    // Render danh sách thành viên của đúng Không Gian này
    this.renderManageWorkspaceMembers(code);

    // Mở pane và hiển thị Modal
    this.switchProfileTab("ws-manage");
    window.UI.openModal("modal-team-switcher");

    // Đồng bộ thêm dữ liệu mới từ Cloud
    if (window.CloudModule) {
      window.CloudModule.fetchWorkspaceMembers(code).then(() => {
        this.renderManageWorkspaceMembers(code);
      }).catch(() => {});
    }
  },

  backToWorkspacesList() {
    this.switchProfileTab("info");
    this.renderWorkspacesList();
  },

  handleSaveWorkspaceInfo() {
    const nameInput = document.getElementById("ws-manage-name-input");
    const iconSelect = document.getElementById("ws-manage-icon-select");
    if (!nameInput || !nameInput.value.trim()) {
      window.UI.showToast("Tên Không Gian không được để trống!", "", "warning");
      return;
    }

    const newName = nameInput.value.trim();
    const newIcon = iconSelect ? iconSelect.value : "planet";
    const code = this.currentManageWsCode;

    const updated = window.store.updateWorkspace(code, { name: newName, icon: newIcon });
    if (updated) {
      this.updateUserUI();
      this.renderWorkspacesList();

      const iconDisplay = document.getElementById("ws-manage-icon-display");
      if (iconDisplay) iconDisplay.textContent = this.getWorkspaceEmoji(newIcon);

      if (window.CloudModule) {
        window.CloudModule.saveWorkspaceToSupabase(updated);
      }

      window.UI.showToast("Đã lưu thay đổi Không Gian! ✨", `Tên mới: ${updated.name}`, "success");
    }
  },

  renderManageWorkspaceMembers(wsCode, filterQuery = null) {
    const listEl = document.getElementById("ws-manage-members-list");
    if (!listEl) return;

    const targetCode = (wsCode || this.currentManageWsCode || "MHENT-CORE-2026").toUpperCase();
    const currentUser = window.store.state.currentUser || {};
    const workspaces = window.store.getUserWorkspaces();
    const targetWs = workspaces.find(w => w.code === targetCode) || {};
    const isMasterUser = currentUser.role === "master" || targetWs.role === "master" || targetWs.isOwner;

    if (filterQuery !== null) {
      this.manageSearchQuery = filterQuery.toLowerCase().trim();
    }

    const members = window.store.getWorkspaceMembers(targetCode);

    const countEl = document.getElementById("ws-manage-members-count");
    if (countEl) countEl.textContent = members.length;

    let filtered = members;
    if (this.manageSearchQuery) {
      filtered = filtered.filter(m =>
        (m.name && m.name.toLowerCase().includes(this.manageSearchQuery)) ||
        (m.email && m.email.toLowerCase().includes(this.manageSearchQuery)) ||
        (m.role && m.role.toLowerCase().includes(this.manageSearchQuery))
      );
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 20px 10px; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border: 1px dashed var(--border-subtle); font-size: 12px;">
          Chưa có thành viên nào khác trong Không Gian này.
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(m => {
      const isSelf = m.id === currentUser.id;
      const roleLabel = (m.role || "member").toUpperCase();
      const roleBadgeClass = m.role === "master" ? "badge-primary" : (m.role === "admin" ? "badge-warning" : (m.role === "guest" ? "badge-secondary" : "badge-purple"));
      const statusDotColor = m.status === 'online' ? 'var(--status-online, #10b981)' : (m.status === 'away' ? '#f59e0b' : '#64748b');

      return `
        <div class="member-item-card" style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 10px; gap: 8px; transition: var(--transition-fast);">
          <div style="display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0;">
            <div style="position: relative; flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: 17px;">
              ${m.avatar || '👤'}
              <span style="position: absolute; bottom: 0; right: 0; width: 9px; height: 9px; border-radius: 50%; background: ${statusDotColor}; border: 2px solid var(--bg-surface-elevated);"></span>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="font-weight: 800; font-size: 12.5px; color: var(--text-high); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${m.name} ${isSelf ? '<span style="font-size: 10.5px; color: var(--text-muted); font-weight: 600;">(Bạn)</span>' : ''}
                </span>
                <span class="badge ${roleBadgeClass}" style="font-size: 9px; padding: 1px 4px;">${roleLabel}</span>
              </div>
              <div style="font-size: 10.5px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;">
                ${m.email || 'internal@mhentuniverse.internal'}
              </div>
            </div>
          </div>

          <!-- Phân quyền & Quản lý cho Master/Admin -->
          <div style="display: flex; align-items: center; gap: 5px; flex-shrink: 0;">
            ${isMasterUser ? `
              <select class="input-select" style="padding: 2px 4px; font-size: 10.5px; height: 26px; width: 88px; border-radius: 4px;" onchange="window.AuthModule.handleChangeMemberRoleInWs('${m.id}', this.value, '${targetCode}')" ${isSelf ? 'title="Bạn là Master chủ không gian"' : ''}>
                <option value="master" ${m.role === 'master' ? 'selected' : ''}>👑 Master</option>
                <option value="admin" ${m.role === 'admin' ? 'selected' : ''}>🛡️ Admin</option>
                <option value="member" ${m.role === 'member' ? 'selected' : ''}>💻 Member</option>
                <option value="guest" ${m.role === 'guest' ? 'selected' : ''}>👤 Guest</option>
              </select>

              ${!isSelf ? `
                <button type="button" class="btn btn-ghost btn-sm" style="padding: 3px 5px; color: #ef4444; font-size: 12px;" onclick="window.AuthModule.handleRemoveMemberFromWs('${m.id}', '${m.name.replace(/'/g, "\\'")}', '${targetCode}')" title="Gỡ thành viên">
                  🗑️
                </button>
              ` : `
                <span style="font-size: 12px; padding: 2px;" title="Chủ Không Gian">👑</span>
              `}
            ` : `
              <span class="badge ${roleBadgeClass}" style="font-size: 9.5px;">${roleLabel}</span>
            `}

            <button type="button" class="btn btn-ghost btn-sm" style="padding: 3px 5px; color: var(--text-muted); font-size: 12px;" onclick="navigator.clipboard.writeText('${m.email}'); window.UI.showToast('Đã sao chép email!', '${m.email}', 'info');" title="Sao chép email">
              📋
            </button>
          </div>
        </div>
      `;
    }).join("");
  },

  filterManageMembers(query) {
    this.renderManageWorkspaceMembers(this.currentManageWsCode, query);
  },

  async handleChangeMemberRoleInWs(userId, newRole, wsCode) {
    const targetCode = (wsCode || this.currentManageWsCode || "MHENT-CORE-2026").toUpperCase();
    window.store.updateMemberRole(userId, newRole, targetCode);
    this.renderManageWorkspaceMembers(targetCode);
    this.renderSidebarMembers();

    try {
      if (window.CloudModule) {
        await window.CloudModule.updateMemberRoleInCloud(targetCode, userId, newRole);
      }
      window.UI.showToast("Cập nhật phân quyền thành công! ✨", `Vai trò mới: ${newRole.toUpperCase()}`, "success");
    } catch (err) {
      console.warn("Lỗi cập nhật role Cloud:", err);
      window.UI.showToast("Không thể gửi yêu cầu lên máy chủ!", "Đã lưu tạm ở máy bạn.", "error");
    }
  },

  async handleRemoveMemberFromWs(userId, memberName, wsCode) {
    const targetCode = (wsCode || this.currentManageWsCode || "MHENT-CORE-2026").toUpperCase();

    window.showConfirmPopup("Gỡ Thành Viên", `Bạn có chắc muốn gỡ [${memberName}] khỏi Không Gian này?`, async () => {
      try {
        if (window.CloudModule) {
          await window.CloudModule.removeMemberFromWorkspaceInCloud(targetCode, userId);
        }
        window.store.removeMemberFromWorkspace(userId, targetCode);
        this.renderManageWorkspaceMembers(targetCode);
        this.renderSidebarMembers();
        this.updateMembersBadge();
        window.UI.showToast("Đã gỡ thành viên!", `Đã gỡ [${memberName}] khỏi Không Gian`, "info");
      } catch (err) {
        window.UI.showToast("Không thể gỡ thành viên!", err.message, "error");
      }
    });
  },

  openCreateAccountForCurrentWorkspace() {
    this.switchProfileTab("create");
  },

  updateMembersBadge() {
    const members = window.store.getWorkspaceMembers();
    const count = members.length;

    const badgeModal = document.getElementById("modal-members-count");
    if (badgeModal) badgeModal.textContent = count;

    const countAll = document.getElementById("count-all-members");
    if (countAll) countAll.textContent = count;

    const badgeSidebar = document.getElementById("sidebar-master-member-count");
    if (badgeSidebar) badgeSidebar.textContent = count;

    const pillSidebar = document.getElementById("sidebar-members-count-pill");
    if (pillSidebar) pillSidebar.textContent = `${count} người`;
  },

  renderSidebarMembers() {
    const container = document.getElementById("sidebar-members-list");
    if (!container) return;

    const members = window.store.getWorkspaceMembers();
    const aiBotsHtml = `
      <li class="sidebar-nav-item" onclick="window.AisaModule.setPersona('harmony')">
        <div class="item-left">
          <span class="item-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f472b6" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></span>
          <span>Harmony (AI)</span>
        </div>
        <span class="badge badge-success">Online</span>
      </li>
      <li class="sidebar-nav-item" onclick="window.AisaModule.setPersona('echo')">
        <div class="item-left">
          <span class="item-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#a855f7" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span>
          <span>Echo (AI)</span>
        </div>
        <span class="badge badge-purple">Online</span>
      </li>
    `;

    const membersHtml = members.map(m => {
      const statusClass = m.status === 'online' ? 'badge-success' : (m.status === 'away' ? 'badge-warning' : 'badge-secondary');
      const statusText = m.status === 'online' ? 'Online' : (m.status === 'away' ? 'Vắng' : 'Offline');
      const roleIcon = m.role === 'master' ? '👑' : (m.role === 'admin' ? '🛡️' : (m.role === 'guest' ? '👤' : '💻'));

      return `
        <li class="sidebar-nav-item" onclick="window.AuthModule.openMembersModal()" title="${m.name} (${m.role.toUpperCase()})">
          <div class="item-left">
            <span class="item-icon" style="font-size: 15px;">${m.avatar || roleIcon}</span>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">${m.name}</span>
          </div>
          <span class="badge ${statusClass}" style="font-size: 9px; padding: 1px 5px;">${statusText}</span>
        </li>
      `;
    }).join("");

    container.innerHTML = aiBotsHtml + membersHtml;
  },

  renderWorkspaceMembers(filterQuery = null, roleFilter = null) {
    const listEl = document.getElementById("workspace-members-list");
    if (!listEl) return;

    if (filterQuery !== null) this.memberSearchQuery = filterQuery.toLowerCase().trim();
    if (roleFilter !== null) this.activeRoleFilter = roleFilter;

    const currentUser = window.store.state.currentUser || {};
    const currentWs = window.store.state.workspace || {};
    const members = window.store.getWorkspaceMembers(currentWs.code);

    this.updateMembersBadge();

    let filtered = members;
    if (this.activeRoleFilter && this.activeRoleFilter !== "all") {
      filtered = filtered.filter(m => (m.role || "member") === this.activeRoleFilter);
    }

    if (this.memberSearchQuery) {
      filtered = filtered.filter(m => 
        (m.name && m.name.toLowerCase().includes(this.memberSearchQuery)) ||
        (m.email && m.email.toLowerCase().includes(this.memberSearchQuery)) ||
        (m.role && m.role.toLowerCase().includes(this.memberSearchQuery))
      );
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 32px 16px; color: var(--text-muted); background: var(--bg-surface-elevated); border-radius: var(--radius-sm); border: 1px dashed var(--border-subtle);">
          <div style="font-size: 28px; margin-bottom: 8px;">🔍</div>
          <div style="font-weight: 700; font-size: 13px; color: var(--text-high);">Không tìm thấy người dùng phù hợp</div>
          <div style="font-size: 11.5px; margin-top: 4px;">Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(m => {
      const isSelf = m.id === currentUser.id;
      const roleLabel = (m.role || "member").toUpperCase();
      const roleBadgeClass = m.role === "master" ? "badge-primary" : (m.role === "admin" ? "badge-warning" : (m.role === "guest" ? "badge-secondary" : "badge-purple"));
      const statusDotColor = m.status === 'online' ? 'var(--status-online, #10b981)' : (m.status === 'away' ? '#f59e0b' : '#64748b');
      const isMasterUser = currentUser.role === "master" || (currentWs.role === "master");
      const isSyncFailed = m.syncFailed === true;

      return `
        <div class="member-item-card ${isSyncFailed ? 'member-sync-failed' : ''}" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface-elevated); border: 1px solid ${isSyncFailed ? '#ef4444' : 'var(--border-subtle)'}; border-radius: var(--radius-sm); padding: 10px 12px; gap: 10px; transition: var(--transition-fast);">
          <div style="display: flex; align-items: center; gap: 11px; flex: 1; min-width: 0;">
            <div style="position: relative; flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: 20px;">
              ${m.avatar || '👤'}
              <span style="position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; border-radius: 50%; background: ${statusDotColor}; border: 2px solid var(--bg-surface-elevated);"></span>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-weight: 800; font-size: 13.5px; color: var(--text-high); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${m.name} ${isSelf ? '<span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">(Bạn)</span>' : ''}
                </span>
                <span class="badge ${roleBadgeClass}" style="font-size: 9.5px; padding: 1px 5px;">${roleLabel}</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">
                ${m.email || 'internal@mhentuniverse.internal'}
              </div>
              ${isSyncFailed ? `
                <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
                  <span style="font-size: 10.5px; color: #ef4444; font-weight: 700;">⚠️ Chưa lưu lên máy chủ</span>
                  <button type="button" class="btn btn-ghost btn-sm" style="font-size: 10.5px; padding: 1px 6px; color: var(--primary); text-decoration: underline; font-weight: 700;" onclick="window.AuthModule.retryMemberSync('${m.id}')">🔄 Thử lại</button>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Actions for Master -->
          <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
            ${isMasterUser ? `
              <select class="input-select" style="padding: 3px 6px; font-size: 11px; height: 28px; width: 92px; border-radius: 4px;" onchange="window.AuthModule.handleChangeMemberRole('${m.id}', this.value, '${m.role}')" ${isSelf ? 'title="Bạn là Master chủ không gian"' : ''}>
                <option value="master" ${m.role === 'master' ? 'selected' : ''}>👑 Master</option>
                <option value="admin" ${m.role === 'admin' ? 'selected' : ''}>🛡️ Admin</option>
                <option value="member" ${m.role === 'member' ? 'selected' : ''}>💻 Member</option>
                <option value="guest" ${m.role === 'guest' ? 'selected' : ''}>👤 Guest</option>
              </select>

              ${!isSelf ? `
                <button type="button" class="btn btn-ghost btn-sm" style="padding: 4px 6px; color: #ef4444;" onclick="window.AuthModule.handleRemoveMember('${m.id}', '${m.name.replace(/'/g, "\\'")}')" title="Gỡ thành viên khỏi Workspace">
                  🗑️
                </button>
              ` : `
                <span style="font-size: 13px; padding: 4px;" title="Chủ Không Gian">👑</span>
              `}
            ` : `
              <span class="badge ${roleBadgeClass}" style="font-size: 10px;">${roleLabel}</span>
            `}

            <button type="button" class="btn btn-ghost btn-sm" style="padding: 4px 6px; color: var(--text-muted);" onclick="navigator.clipboard.writeText('${m.email}'); window.UI.showToast('Đã sao chép email!', '${m.email}', 'info');" title="Sao chép email">
              📋
            </button>
          </div>
        </div>
      `;
    }).join("");
  },

  filterMembers(query) {
    this.renderWorkspaceMembers(query, null);
  },

  setMemberRoleFilter(role, btn) {
    const pills = document.querySelectorAll("#member-role-filter-pills .btn");
    pills.forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    this.renderWorkspaceMembers(null, role);
  },

  async handleChangeMemberRole(userId, newRole, oldRole) {
    const currentWsCode = (window.store.state.workspace ? window.store.state.workspace.code : "MHENT-CORE-2026").toUpperCase();
    
    // 1. Optimistic Local update
    window.store.updateMemberRole(userId, newRole, currentWsCode);
    this.renderWorkspaceMembers();
    this.renderSidebarMembers();

    // 2. Gửi Cloud
    try {
      if (window.CloudModule) {
        await window.CloudModule.updateMemberRoleInCloud(currentWsCode, userId, newRole);
      }
      // Xóa cờ lỗi nếu có
      const mem = window.store.getWorkspaceMembers(currentWsCode).find(m => m.id === userId);
      if (mem) delete mem.syncFailed;
      this.renderWorkspaceMembers();
      window.UI.showToast("Cập nhật phân quyền thành công! ✨", `Vai trò mới: ${newRole.toUpperCase()}`, "success");
    } catch (err) {
      console.warn("Lỗi cập nhật role Cloud:", err);
      // Gắn cờ syncFailed và hiện nút thử lại
      const mem = window.store.getWorkspaceMembers(currentWsCode).find(m => m.id === userId);
      if (mem) mem.syncFailed = true;
      this.renderWorkspaceMembers();
      window.UI.showToast("Không thể gửi yêu cầu lên máy chủ!", "Đã lưu tạm ở máy bạn. Bấm 'Thử lại' trên thẻ thành viên để gửi lại.", "error");
    }
  },

  async handleRemoveMember(userId, memberName) {
    const currentWsCode = (window.store.state.workspace ? window.store.state.workspace.code : "MHENT-CORE-2026").toUpperCase();

    window.showConfirmPopup("Gỡ Thành Viên", `Bạn có chắc muốn gỡ [${memberName}] khỏi Không Gian này? Thành viên sẽ không thể truy cập các kênh của Không Gian này nữa.`, async () => {
      try {
        if (window.CloudModule) {
          await window.CloudModule.removeMemberFromWorkspaceInCloud(currentWsCode, userId);
        }
        window.store.removeMemberFromWorkspace(userId, currentWsCode);
        this.renderWorkspaceMembers();
        this.renderSidebarMembers();
        this.updateMembersBadge();
        window.UI.showToast("Đã gỡ thành viên!", `Đã gỡ [${memberName}] khỏi Workspace`, "info");
      } catch (err) {
        window.UI.showToast("Không thể gỡ thành viên!", "Lỗi máy chủ đám mây: " + err.message, "error");
      }
    });
  },

  async retryMemberSync(userId) {
    const currentWsCode = (window.store.state.workspace ? window.store.state.workspace.code : "MHENT-CORE-2026").toUpperCase();
    const mem = window.store.getWorkspaceMembers(currentWsCode).find(m => m.id === userId);
    if (!mem) return;

    window.UI.showToast("Đang thử gửi lại lên máy chủ...", "", "info");
    try {
      if (window.CloudModule) {
        await window.CloudModule.updateMemberRoleInCloud(currentWsCode, userId, mem.role);
      }
      delete mem.syncFailed;
      this.renderWorkspaceMembers();
      window.UI.showToast("Đồng bộ thành công! 🚀", `Thành viên [${mem.name}] đã được lưu trên Cloud`, "success");
    } catch (err) {
      window.UI.showToast("Vẫn không thể gửi!", "Vui lòng kiểm tra kết nối mạng và thử lại.", "error");
    }
  },

  copyWorkspaceCode() {
    const code = window.store.state.workspace ? window.store.state.workspace.code : "MHENT-CORE-2026";
    navigator.clipboard.writeText(code);
    window.UI.showToast("Đã sao chép mã Không Gian! 📋", code, "success");
  },

  async refreshMembersFromCloud() {
    const currentWsCode = (window.store.state.workspace ? window.store.state.workspace.code : "MHENT-CORE-2026").toUpperCase();
    window.UI.showToast("Đang đồng bộ từ máy chủ đám mây...", "", "info");
    try {
      if (window.CloudModule) {
        await window.CloudModule.fetchWorkspaceMembers(currentWsCode);
      }
      this.renderWorkspaceMembers();
      this.renderSidebarMembers();
      this.updateMembersBadge();
      window.UI.showToast("Đã cập nhật danh sách thành viên mới nhất! ⚡", "", "success");
    } catch (e) {
      window.UI.showToast("Lỗi đồng bộ Cloud!", e.message, "error");
    }
  }
};
