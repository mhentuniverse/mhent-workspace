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

      return `
        <div class="chat-message-row ${m.isSelf ? 'self' : ''}">
          <div class="chat-avt ${isBotClass}">${m.avt || '👤'}</div>
          <div class="chat-bubble-wrap">
            <div class="chat-meta">
              <span class="chat-sender-name">${m.sender}</span>
              <span class="chat-time">${m.time}</span>
            </div>
            <div class="chat-bubble ${bubbleBotClass}">
              ${formattedText}
            </div>
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
      isSelf: true
    };

    // Gửi qua Cloud Engine (Supabase + Firestore)
    if (window.CloudModule) {
      await window.CloudModule.pushChatMessage(currentChannel, newMsg);
    } else {
      window.store.addChatMessage(currentChannel, newMsg);
    }

    this.renderMessages();

    // Check for AISA mentions
    if (/@(AISA|Harmony|Echo)/i.test(text)) {
      if (window.AisaModule) {
        window.AisaModule.handleChatMention(text, currentChannel);
      }
    }
  }
};
