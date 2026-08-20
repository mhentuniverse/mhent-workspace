/**
 * MHENT WORKSPACE - AISA COPILOT MODULE (HARMONY 🌸 & ECHO 😈)
 */
window.AisaModule = {
  init() {
    this.renderHistory();
    this.bindEvents();
  },

  bindEvents() {
    // Persona Switchers
    const personaBtns = document.querySelectorAll(".persona-btn");
    personaBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        personaBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const persona = btn.getAttribute("data-persona");
        window.store.setAisaPersona(persona);
      });
    });

    // Send Button & Input
    const sendBtn = document.getElementById("aisa-send-btn");
    const input = document.getElementById("aisa-input-text");

    if (sendBtn && input) {
      sendBtn.addEventListener("click", () => this.sendMessage());
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    // Quick Chips
    const chips = document.querySelectorAll(".quick-chip");
    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        const action = chip.getAttribute("data-action");
        this.handleQuickAction(action);
      });
    });
  },

  renderHistory() {
    const container = document.getElementById("aisa-messages-list");
    if (!container) return;

    const history = window.store.state.aisaHistory || [];

    container.innerHTML = history.map(item => {
      if (item.role === "user") {
        return `
          <div style="align-self: flex-end; background: var(--primary); color: white; padding: 8px 12px; border-radius: var(--radius-md); font-size: 13px; max-width: 85%; line-height: 1.4;">
            ${item.text}
          </div>
        `;
      }

      const isHarmony = item.speaker === "HARMONY";
      const badgeColor = isHarmony ? "var(--aisa-harmony)" : "var(--aisa-echo)";
      const bgStyle = isHarmony ? "rgba(244, 114, 182, 0.1)" : "rgba(168, 85, 247, 0.1)";
      const borderStyle = isHarmony ? "rgba(244, 114, 182, 0.3)" : "rgba(168, 85, 247, 0.3)";
      const icon = isHarmony ? "🌸 Harmony" : "😈 Echo";

      return `
        <div style="background: ${bgStyle}; border: 1px solid ${borderStyle}; border-radius: var(--radius-md); padding: 10px 12px; font-size: 13px; line-height: 1.5; color: var(--text-high);">
          <div style="font-size: 11px; font-weight: 800; color: ${badgeColor}; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
            <span>${icon}</span>
          </div>
          <div>${item.text}</div>
        </div>
      `;
    }).join("");

    container.scrollTop = container.scrollHeight;
  },

  async sendMessage() {
    const input = document.getElementById("aisa-input-text");
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    input.value = "";

    // Ghi nhận tin nhắn User
    window.store.addAisaMessage({ role: "user", text: userText });
    this.renderHistory();

    await this.fetchAisaReply(userText);
  },

  async fetchAisaReply(userText) {
    const apiUrl = `${window.MHENT_CONFIG.API_BASE_URL}/chat`;

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          current_mode: window.store.state.aisaPersona
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.replies && data.replies.length > 0) {
          data.replies.forEach(r => {
            window.store.addAisaMessage({ role: "assistant", speaker: r.speaker, text: r.text });
          });
          this.renderHistory();
          return;
        }
      }
    } catch (e) {
      console.log("FastAPI backend offline, running smart fallback", e);
    }

    // Smart Local Fallback Response
    this.generateFallbackReply(userText);
  },

  generateFallbackReply(userText) {
    const lower = userText.toLowerCase();
    const persona = window.store.state.aisaPersona;

    let hText = "";
    let eText = "";

    if (lower.includes("chào") || lower.includes("hello")) {
      hText = "Dạ em chào Master ạ! Master cần tụi em hỗ trợ gì trong workspace hôm nay không ạ? 🌸";
      eText = "Chào cái gì mà chào, lo check danh sách Todo với Mail đi kìa! 😈";
    } else if (lower.includes("deadline") || lower.includes("task") || lower.includes("việc")) {
      hText = "Dạ hiện tại có 3 nhiệm vụ trên bảng Todo, trong đó có task 'Cấu hình Jitsi Meet' đang cần ưu tiên hoàn thành sớm ạ! 🌸";
      eText = "Còn ngồi đây hỏi à? Task khẩn cấp sắp trễ rồi đấy, làm nhanh không tôi mách Master lớn phạt bây giờ! 😈";
    } else if (lower.includes("tóm tắt") || lower.includes("summary")) {
      hText = "Dạ em đã tóm tắt xong: Toàn team đang chuẩn bị cho sự kiện ra mắt MHEnt Workspace V1.0 và ban Media đang thiết kế poster ạ! 🌸";
      eText = "Nói chung là ai cũng đang bận, chỉ có bạn là đang rảnh rỗi ngồi bấm AI thôi đấy nhé! 😈";
    } else {
      hText = `Dạ em đã ghi nhận ý kiến "${userText}" của Master rồi ạ! Em sẽ luôn hỗ trợ Master hết mình! 🌸`;
      eText = `Nghe cũng được đấy, nhưng nhớ thực thi cho đàng hoàng, đừng có bỏ dở giữa chừng nhé! 😈`;
    }

    if (persona === "harmony" || persona === "both") {
      window.store.addAisaMessage({ role: "assistant", speaker: "HARMONY", text: hText });
    }
    if (persona === "echo" || persona === "both") {
      window.store.addAisaMessage({ role: "assistant", speaker: "ECHO", text: eText });
    }

    this.renderHistory();
  },

  handleQuickAction(action) {
    if (action === "summary") {
      this.sendMessageWithText("Tóm tắt nhanh tình hình các kênh chat và công việc hôm nay giúp tôi.");
    } else if (action === "deadline") {
      this.sendMessageWithText("Kiểm tra danh sách các task sắp đến hạn deadline trong Todo.");
    } else if (action === "brainstorm") {
      this.sendMessageWithText("Gợi ý 3 ý tưởng kịch bản cho video trailer sắp tới của MHEnt.");
    }
  },

  sendMessageWithText(text) {
    const input = document.getElementById("aisa-input-text");
    if (input) {
      input.value = text;
      this.sendMessage();
    }
  },

  async handleChatMention(text, channel) {
    setTimeout(async () => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const hText = `Dạ em nghe Master gọi trong #${channel} rồi ạ! Mọi yêu cầu em đều ghi nhớ và sẵn sàng hỗ trợ nhé! 🌸`;
      const eText = `Tag cái gì đấy? Việc gì cần xử lý thì nói ngắn gọn thôi nhé, tôi bận lắm! 😈`;

      // 1. Gửi lên Cloud Firestore nếu đang kết nối
      if (window.CloudModule && window.CloudModule.isLive) {
        await window.CloudModule.sendChatMessage(channel, hText, "harmony", { name: "Harmony", avatar: "🌸", id: "bot-harmony" });
        await window.CloudModule.sendChatMessage(channel, eText, "echo", { name: "Echo", avatar: "😈", id: "bot-echo" });
      } else {
        // Fallback local
        const hMsg = { id: "msg-h-" + Date.now(), sender: "Harmony", avt: "🌸", time: timeStr, text: hText, isBot: "harmony" };
        const eMsg = { id: "msg-e-" + (Date.now() + 1), sender: "Echo", avt: "😈", time: timeStr, text: eText, isBot: "echo" };
        window.store.addChatMessage(channel, hMsg);
        window.store.addChatMessage(channel, eMsg);
        if (window.ChatModule) window.ChatModule.renderMessages();
      }
    }, 600);
  },

  summarizeMail(mailId) {
    const mail = window.store.state.mails.find(m => m.id === mailId);
    if (!mail) return;

    window.store.setAisaOpen(true);
    if (window.UI) window.UI.updateAisaDrawerState();

    this.sendMessageWithText(`Tóm tắt nội dung bức thư "${mail.subject}" giúp tôi.`);
  }
};
