/**
 * MHENT WORKSPACE - CHAT MODULE (FIREBASE & SUPABASE CLOUD ENABLED)
 */
window.ChatModule = {
  init() {
    this.renderChannels();
    this.renderMessages();
    this.bindEvents();
  },

  bindEvents() {
    const form = document.getElementById("chat-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }

    const input = document.getElementById("chat-input-text");
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
  },

  renderChannels() {
    const listEl = document.getElementById("chat-channel-list");
    if (!listEl) return;

    const channels = [
      { id: "general", name: "# tổng-quan", icon: "💬" },
      { id: "media", name: "# ban-media", icon: "🎨" },
      { id: "dev", name: "# dev-team", icon: "💻" }
    ];

    listEl.innerHTML = channels.map(ch => `
      <li class="sidebar-nav-item ${window.store.state.activeChannel === ch.id ? 'active' : ''}" 
          onclick="window.ChatModule.selectChannel('${ch.id}')">
        <div class="item-left">
          <span class="item-icon">${ch.icon}</span>
          <span>${ch.name}</span>
        </div>
      </li>
    `).join("");
  },

  selectChannel(channelId) {
    window.store.state.activeChannel = channelId;
    window.store.save();
    this.renderChannels();
    this.renderMessages();
  },

  renderMessages() {
    const container = document.getElementById("chat-messages-wrap");
    if (!container) return;

    const currentChannel = window.store.state.activeChannel || "general";
    const messages = window.store.state.chatChannels[currentChannel] || [];

    if (messages.length === 0) {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); text-align: center; padding: 40px 20px;">
          <div style="font-size: 40px; margin-bottom: 12px; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));">💬</div>
          <div style="font-weight: 800; font-size: 16px; color: var(--text-high); margin-bottom: 6px;">Kênh #${currentChannel} chưa có tin nhắn</div>
          <div style="font-size: 13px; max-width: 320px; line-height: 1.5; color: var(--text-muted);">Gửi tin nhắn đầu tiên ở ô bên dưới hoặc gõ @AISA để gọi trợ lý AI! 🚀</div>
        </div>
      `;
      return;
    }

    container.innerHTML = messages.map(m => {
      let isBotClass = "";
      if (m.isBot === "harmony") isBotClass = "harmony";
      if (m.isBot === "echo") isBotClass = "echo";

      let bubbleBotClass = "";
      if (m.isBot === "harmony") bubbleBotClass = "harmony-bot";
      if (m.isBot === "echo") bubbleBotClass = "echo-bot";

      const formattedText = this.formatMentions(m.text);

      const statusIcon = m.status === 'sending'
        ? '<span class="chat-status-indicator sending" title="Đang gửi lên máy chủ...">⏳</span>'
        : (m.status === 'failed' ? '<span class="chat-status-indicator failed" title="Chưa gửi được lên máy chủ">⚠️</span>' : '');

      const retryControl = m.status === 'failed' ? `
        <div class="chat-retry-bar">
          <span class="chat-failed-label">Chưa gửi được</span>
          <button type="button" class="btn-chat-resend" onclick="window.ChatModule.resendMessage('${currentChannel}', '${m.id}')">
            🔄 Gửi lại
          </button>
        </div>
      ` : '';

      return `
        <div class="chat-message-row ${m.isSelf ? 'self' : ''} ${m.status === 'failed' ? 'msg-failed' : ''}">
          <div class="chat-avt ${isBotClass}">${m.avt || '👤'}</div>
          <div class="chat-bubble-wrap">
            <div class="chat-meta">
              <span class="chat-sender-name">${m.sender}</span>
              <span class="chat-time">${m.time}</span>
              ${statusIcon}
            </div>
            <div class="chat-bubble ${bubbleBotClass}">
              ${formattedText}
            </div>
            ${retryControl}
          </div>
        </div>
      `;
    }).join("");

    container.scrollTop = container.scrollHeight;
  },

  formatMentions(text) {
    if (!text) return "";
    return text
      .replace(/(@AISA|@Harmony|@Echo)/gi, '<span class="chat-mention">$1</span>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color: var(--primary); font-weight: 800; text-decoration: underline;">$1</a>');
  },

  async sendMessage() {
    const input = document.getElementById("chat-input-text");
    if (!input || !input.value.trim()) return;

    const text = input.value.trim();
    input.value = "";

    const user = window.store.state.currentUser;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentChannel = window.store.state.activeChannel || "general";

    const newMsg = {
      id: "msg-" + Date.now(),
      sender: user.name,
      avt: user.avatar || "👤",
      time: timeStr,
      text: text,
      isSelf: true,
      status: "sending"
    };

    // 1. Optimistic Local Render: Hiện ngay trên màn hình như Messenger
    this.renderMessages();

    // 2. Gửi qua Cloud Engine (Supabase + Firestore)
    try {
      if (window.CloudModule) {
        await window.CloudModule.pushChatMessage(currentChannel, newMsg);
      } else {
        window.store.addChatMessage(currentChannel, newMsg);
      }
      window.store.updateChatMessageStatus(currentChannel, newMsg.id, "sent");
      this.renderMessages();
    } catch (err) {
      console.warn("Lỗi gửi tin nhắn Cloud, chuyển sang trạng thái chờ gửi lại:", err);
      window.store.updateChatMessageStatus(currentChannel, newMsg.id, "failed");
      this.renderMessages();
      window.UI.showToast("Không thể gửi tin nhắn!", "Tin nhắn đang lưu tạm ở máy bạn. Bấm 'Gửi lại' để thử lại.", "error");
    }

    // Check for AISA mentions
    if (/@(AISA|Harmony|Echo)/i.test(text)) {
      if (window.AisaModule) {
        window.AisaModule.handleChatMention(text, currentChannel);
      }
    }
  },

  async resendMessage(channel, msgId) {
    const channelMsgs = window.store.state.chatChannels[channel] || [];
    const msg = channelMsgs.find(m => m.id === msgId);
    if (!msg) return;

    msg.status = "sending";
    this.renderMessages();

    try {
      if (window.CloudModule) {
        await window.CloudModule.pushChatMessage(channel, msg);
      }
      window.store.updateChatMessageStatus(channel, msgId, "sent");
      this.renderMessages();
      window.UI.showToast("Đã gửi tin nhắn thành công! 🚀", "", "success");
    } catch (err) {
      window.store.updateChatMessageStatus(channel, msgId, "failed");
      this.renderMessages();
      window.UI.showToast("Vẫn không thể gửi!", "Vui lòng kiểm tra kết nối mạng rồi thử lại.", "error");
    }
  }
};
