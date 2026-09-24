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
    const apiUrl = `${window.MHENT_CONFIG.API_BASE_URL}/api/chat`;
    const persona = window.store.state.aisaPersona || 'both';
    const mode = (persona === 'both') ? 'duo' : persona;

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          mode: mode,
          scope: 'workspace'
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
      console.log("AISA API connection note, running local fallback", e);
    }

    // Smart Dual-Persona Engine Response (Fallback)
    this.generateFallbackReply(userText);
  },

  generateFallbackReply(userText) {
    const lower = userText.toLowerCase();
    const persona = window.store.state.aisaPersona;

    let hText = "";
    let eText = "";

    if (lower.includes("chào") || lower.includes("hello") || lower.includes("hi")) {
      hText = "Chào cậu nha! Cậu cần tụi em hỗ trợ gì trong workspace hôm nay không nè? 🌸";
      eText = "Chào cái gì mà chào, lo check danh sách Todo với Mail đi kìa! 😈";
    } else if (lower.includes("deadline") || lower.includes("task") || lower.includes("việc")) {
      const pendingCount = (window.store.state.tasks || []).filter(t => t.status !== "done").length;
      hText = `Dạ hiện tại có ${pendingCount} nhiệm vụ đang cần hoàn thiện trên bảng Todo nè! Em tin cậu và team sẽ làm thật tốt! 🌸`;
      eText = `Còn ngồi đây hỏi à? ${pendingCount} task chưa xong kìa, làm nhanh kẻo trễ deadline bây giờ! 😈`;
    } else if (lower.includes("lịch") || lower.includes("calendar") || lower.includes("sự kiện") || lower.includes("event")) {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayEvents = (window.store.state.events || []).filter(e => e.date === todayStr);
      if (todayEvents.length > 0) {
        hText = `Dạ hôm nay cậu có ${todayEvents.length} sự kiện trên lịch: ${todayEvents.map(e => e.title + ' (' + (e.time || 'Cả ngày') + ')').join(', ')} nè! 🌸`;
        eText = `Lịch hôm nay có ${todayEvents.length} việc kìa, căn giờ giấc cho đúng, đừng có trễ giờ đấy! 😈`;
      } else {
        hText = `Dạ theo lịch Workspace hôm nay không có sự kiện nào được lên lịch ạ! Cậu có thể tập trung hoàn thành các task trên Todo nhé! 🌸`;
        eText = `Hôm nay trống lịch à? Thế thì lo dọn sạch mấy cái task trên Todo đi, đừng có ngồi rung đùi lướt web! 😈`;
      }
    } else if (lower.includes("tóm tắt") || lower.includes("summary")) {
      hText = "Em đã tóm tắt xong: Toàn team đang chuẩn bị cho các dự án MHEnt Universe và ban Media đang thiết kế poster ạ! 🌸";
      eText = "Nói chung là ai cũng đang bận, chỉ có bạn là đang rảnh rỗi ngồi bấm AI thôi đấy nhé! 😈";
    } else {
      hText = `Em đã ghi nhận yêu cầu "${userText}" của cậu rồi nà! Em sẽ luôn đồng hành hỗ trợ cậu hết mình! 🌸`;
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
    } else if (action === "calendar") {
      this.sendMessageWithText("Check lịch trình calendar hôm nay và tuần này giúp tớ với.");
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

      const hText = `Dạ em nghe cậu gọi trong #${channel} rồi ạ! Mọi yêu cầu em đều ghi nhớ và sẵn sàng hỗ trợ nhé! 🌸`;
      const eText = `Tag cái gì đấy? Việc gì cần xử lý thì nói ngắn gọn thôi nhé, tôi bận lắm! 😈`;

      const hMsg = { id: "msg-h-" + Date.now(), sender: "Harmony", avt: "🌸", time: timeStr, text: hText, isBot: "harmony" };
      const eMsg = { id: "msg-e-" + (Date.now() + 1), sender: "Echo", avt: "😈", time: timeStr, text: eText, isBot: "echo" };

      if (window.CloudModule) {
        await window.CloudModule.pushChatMessage(channel, hMsg);
        await window.CloudModule.pushChatMessage(channel, eMsg);
      } else {
        window.store.addChatMessage(channel, hMsg);
        window.store.addChatMessage(channel, eMsg);
      }

      if (window.ChatModule) window.ChatModule.renderMessages();
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
