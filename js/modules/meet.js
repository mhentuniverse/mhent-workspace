/**
 * MHENT WORKSPACE - MEET MODULE (JITSI INTEGRATION & CLOUD BROADCAST)
 */
window.MeetModule = {
  jitsiApi: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    const startBtn = document.getElementById("btn-start-meet");
    if (startBtn) {
      startBtn.addEventListener("click", () => this.startMeeting());
    }

    const leaveBtn = document.getElementById("btn-leave-meet");
    if (leaveBtn) {
      leaveBtn.addEventListener("click", () => this.leaveMeeting());
    }

    const copyBtn = document.getElementById("btn-copy-meet-link");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => this.copyMeetingLink());
    }
  },

  loadJitsiScript() {
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://meet.jit.si/external_api.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Không thể tải Jitsi Meet API"));
      document.body.appendChild(script);
    });
  },

  async startMeeting() {
    const roomInput = document.getElementById("meet-room-name");
    const roomName = (roomInput && roomInput.value.trim()) 
      ? roomInput.value.trim().toLowerCase().replace(/[^a-z0-9]/g, "-") 
      : "hq-conference";

    const wsCode = window.store.state.workspace.code.toLowerCase().replace(/[^a-z0-9]/g, "");
    const fullRoomName = `mhent-${wsCode}-${roomName}`;
    const fullRoomUrl = `https://meet.jit.si/${fullRoomName}`;

    window.UI.showToast("Đang khởi tạo phòng họp video...", "Kết nối máy chủ Jitsi Meet", "info");

    try {
      await this.loadJitsiScript();

      const lobby = document.getElementById("meet-lobby-screen");
      const container = document.getElementById("jitsi-container");
      const controls = document.getElementById("meet-active-controls");

      if (lobby) lobby.style.display = "none";
      if (container) {
        container.style.display = "block";
        container.innerHTML = "";
      }
      if (controls) controls.style.display = "flex";

      const domain = window.MHENT_CONFIG.JITSI_DOMAIN || "meet.jit.si";
      const user = window.store.state.currentUser;

      const options = {
        roomName: fullRoomName,
        width: "100%",
        height: "100%",
        parentNode: container,
        userInfo: {
          displayName: user.name
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          prejoinPageEnabled: false
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone'
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false
        }
      };

      this.jitsiApi = new window.JitsiMeetExternalAPI(domain, options);
      this.currentRoom = fullRoomName;

      // SYNERGY: Bắn thông báo mời họp vào kênh chat #general trên Cloud
      if (window.CloudModule && window.CloudModule.isLive) {
        await window.CloudModule.broadcastMeeting(roomName, fullRoomUrl);
      }

      this.jitsiApi.addEventListener("videoConferenceLeft", () => {
        this.leaveMeeting();
      });

      window.UI.showToast("Đã vào phòng họp MHEnt Meet! 📹", `Phòng: ${fullRoomName}`, "success");
    } catch (err) {
      console.error("Lỗi Jitsi:", err);
      window.UI.showToast("Lỗi kết nối Meet!", "Vui lòng kiểm tra kết nối mạng của bạn.", "error");
    }
  },

  leaveMeeting() {
    if (this.jitsiApi) {
      this.jitsiApi.dispose();
      this.jitsiApi = null;
    }

    const lobby = document.getElementById("meet-lobby-screen");
    const container = document.getElementById("jitsi-container");
    const controls = document.getElementById("meet-active-controls");

    if (container) {
      container.style.display = "none";
      container.innerHTML = "";
    }
    if (controls) controls.style.display = "none";
    if (lobby) lobby.style.display = "flex";

    window.UI.showToast("Đã rời phòng họp", "", "info");
  },

  copyMeetingLink() {
    if (!this.currentRoom) return;
    const url = `https://meet.jit.si/${this.currentRoom}`;
    navigator.clipboard.writeText(url).then(() => {
      window.UI.showToast("Đã sao chép liên kết phòng họp!", url, "success");
    });
  }
};
