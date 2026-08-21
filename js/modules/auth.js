/**
 * MHENT WORKSPACE - FIREBASE AUTH & ORG ACCOUNT MODULE (AUTH.JS)
 * Quản lý phiên đăng nhập Firebase, Hồ sơ Firestore & Kích hoạt Gatekeeper
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
    const isAuth = (this.auth && this.auth.currentUser) || window.store.state.isLoggedIn;
    
    if (gatekeeper) {
      if (!isAuth) {
        gatekeeper.style.display = "flex";
      } else {
        gatekeeper.style.display = "none";
      }
    }
  },

  bindEvents() {
    // Form Login
    const loginForm = document.getElementById("form-firebase-login");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("login-username").value.trim();
        const pass = document.getElementById("login-password").value;
        this.login(username, pass);
      });
    }

    // Google Login
    const googleBtn = document.getElementById("btn-google-login");
    if (googleBtn) {
      googleBtn.addEventListener("click", () => this.loginWithGoogle());
    }

    // Form Register / Create Account
    const regForm = document.getElementById("form-firebase-register");
    if (regForm) {
      regForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("reg-username").value.trim();
        const name = document.getElementById("reg-fullname").value.trim();
        const pass = document.getElementById("reg-password").value;
        const role = document.getElementById("reg-role") ? document.getElementById("reg-role").value : "member";
        this.register(username, name, pass, role);
      });
    }

    // Nút mở Modal Auth
    const openAuthBtn = document.getElementById("btn-open-auth-modal");
    if (openAuthBtn) {
      openAuthBtn.addEventListener("click", () => window.UI.openModal("modal-auth"));
    }

    // Nút Đăng xuất
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.logout());
    }

    // Chuyển qua lại giữa tab Login / Register
    const authTabBtns = document.querySelectorAll(".auth-tab-btn");
    authTabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        authTabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const mode = btn.getAttribute("data-mode");
        const loginPane = document.getElementById("auth-pane-login");
        const regPane = document.getElementById("auth-pane-register");
        if (loginPane && regPane) {
          loginPane.style.display = mode === "login" ? "block" : "none";
          regPane.style.display = mode === "register" ? "block" : "none";
        }
      });
    });
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
      window.UI.closeModal("modal-auth");
      window.UI.showToast("Đăng nhập thành công (Demo Mode)! 🎉", `Xin chào ${window.store.state.currentUser.name}`, "success");
      return;
    }

    try {
      await this.auth.signInWithEmailAndPassword(fullEmail, password);
      window.UI.closeModal("modal-auth");
      window.UI.showToast("Đăng nhập Firebase thành công! 🔐", `Email: ${fullEmail}`, "success");
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      let errMsg = "Vui lòng kiểm tra lại tên đăng nhập hoặc mật khẩu.";
      if (error.code === "auth/user-not-found") errMsg = "Tài khoản chưa tồn tại. Hãy bấm Tạo tài khoản mới.";
      if (error.code === "auth/wrong-password") errMsg = "Mật khẩu không chính xác.";
      window.UI.showToast("Đăng nhập thất bại!", errMsg, "error");
    }
  },

  async loginWithGoogle() {
    if (!this.auth) return;
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await this.auth.signInWithPopup(provider);
      window.UI.closeModal("modal-auth");
      window.UI.showToast("Đăng nhập Google thành công! 🚀", "Đã kết nối tài khoản", "success");
    } catch (error) {
      console.error("Lỗi Google Sign In:", error);
      window.UI.showToast("Đăng nhập Google thất bại", error.message, "error");
    }
  },

  async register(username, fullName, password, role = "member") {
    if (!username || !password || !fullName) return;
    const fullEmail = this.formatOrgEmail(username);

    window.UI.showToast("Đang khởi tạo tài khoản tổ chức...", `Đuôi: ${fullEmail}`, "info");

    if (!this.initialized || !this.auth) {
      window.store.setCurrentUser({
        id: "user-" + Date.now(),
        name: fullName,
        email: fullEmail,
        role: role,
        avatar: role === "master" ? "👑" : "💻",
        status: "online"
      }, true);
      
      this.checkGatekeeper();
      window.UI.closeModal("modal-auth");
      window.UI.showToast("Tạo tài khoản thành công! 🎉", fullEmail, "success");
      return;
    }

    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(fullEmail, password);
      const user = userCredential.user;

      // Lưu hồ sơ vào Firestore
      if (this.db) {
        await this.db.collection("users").doc(user.uid).set({
          uid: user.uid,
          displayName: fullName,
          email: fullEmail,
          role: role,
          avatar: role === "master" ? "👑" : (role === "admin" ? "🛡️" : "💻"),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      await user.updateProfile({
        displayName: fullName
      });

      window.UI.closeModal("modal-auth");
      window.UI.showToast("Cấp tài khoản tổ chức thành công! 🚀", fullEmail, "success");
    } catch (error) {
      console.error("Lỗi đăng ký:", error);
      let errMsg = error.message;
      if (error.code === "auth/email-already-in-use") errMsg = "Tên tài khoản này đã được sử dụng.";
      if (error.code === "auth/weak-password") errMsg = "Mật khẩu cần ít nhất 6 ký tự.";
      window.UI.showToast("Không thể tạo tài khoản!", errMsg, "error");
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
    window.UI.closeModal("modal-auth");
    window.UI.showToast("Đã vào Chế Độ Khách! 👀", "Dữ liệu được lưu trữ tạm trên mây", "info");
    
    if (window.CloudModule) {
      window.CloudModule.setUser(window.store.state.currentUser.id, window.store.state.currentUser);
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

    const wsCodeEl = document.querySelector(".workspace-code");
    if (wsCodeEl) wsCodeEl.textContent = ws.code || "MHENT-CORE-2026";
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
    window.UI.openModal("modal-team-switcher");
  },

  joinTeam(code) {
    if (!code) return;
    const cleanCode = code.trim().toUpperCase();
    window.store.state.workspace.code = cleanCode;
    window.store.state.workspace.name = `Workspace [${cleanCode}]`;
    window.store.save();
    this.updateUserUI();

    // Re-bind Cloud Realtime Stream to new Workspace
    if (window.CloudModule) {
      window.CloudModule.bindWorkspace(cleanCode);
    }

    window.UI.closeModal("modal-team-switcher");
    window.UI.showToast("Gia nhập Team Cloud thành công! ⚡", `Không gian làm việc: ${cleanCode}`, "success");
  }
};
