/**
 * MHENT WORKSPACE - MAIL MODULE (SUPABASE & CLOUD ENABLED)
 */
window.MailModule = {
  init() {
    this.renderMailList();
    this.renderActiveMail();
    this.bindEvents();
  },

  bindEvents() {
    const composeBtn = document.getElementById("btn-compose-mail");
    if (composeBtn) {
      composeBtn.addEventListener("click", () => {
        window.UI.openModal("modal-compose-mail");
      });
    }

    const aiDraftBtn = document.getElementById("btn-ai-draft-mail");
    if (aiDraftBtn) {
      aiDraftBtn.addEventListener("click", () => this.generateAiDraft());
    }

    const sendForm = document.getElementById("form-compose-mail");
    if (sendForm) {
      sendForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.sendMail();
      });
    }
  },

  renderMailList() {
    const listEl = document.getElementById("mail-items-list");
    if (!listEl) return;

    const mails = window.store.state.mails || [];
    const activeId = window.store.state.activeMailId;

    if (mails.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 36px 16px; text-align: center; color: var(--text-muted); font-size: 13px;">
          <div style="margin-bottom: 8px;">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          </div>
          Hộp thư trống
        </div>
      `;
      return;
    }

    listEl.innerHTML = mails.map(m => `
      <div class="mail-item-row ${m.id === activeId ? 'active' : ''}" onclick="window.MailModule.selectMail('${m.id}')">
        <div class="mail-item-top">
          <span class="mail-from">${m.from}</span>
          <span class="mail-time">${m.time}</span>
        </div>
        <div class="mail-subject">${m.subject}</div>
        <div class="mail-snippet">${(m.body || '').replace(/\n/g, ' ')}</div>
      </div>
    `).join("");
  },

  selectMail(mailId) {
    window.store.state.activeMailId = mailId;
    window.store.save();
    this.renderMailList();
    this.renderActiveMail();
  },

  renderActiveMail() {
    const readerEl = document.getElementById("mail-reader-content");
    if (!readerEl) return;

    const activeId = window.store.state.activeMailId;
    const mail = window.store.state.mails.find(m => m.id === activeId) || window.store.state.mails[0];

    if (!mail) {
      readerEl.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); text-align: center; padding: 40px;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--bg-surface); display: flex; align-items: center; justify-content: center; margin-bottom: 12px; border: 1px solid var(--border-subtle);">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          </div>
          <div style="font-weight: 800; font-size: 15px; color: var(--text-high); margin-bottom: 4px;">Chưa chọn thư nào</div>
          <div style="font-size: 13px; max-width: 280px; line-height: 1.5;">Chọn một email từ danh sách bên trái hoặc bấm "Soạn Thư Mới" để gửi email nội bộ.</div>
        </div>
      `;
      return;
    }

    readerEl.innerHTML = `
      <div class="mail-reader-header">
        <div>
          <h2 class="mail-reader-subject">${mail.subject}</h2>
          <div style="font-size: 13px; color: var(--text-muted); display: flex; gap: 10px; align-items: center; margin-top: 4px;">
            <span style="font-weight: 800; color: var(--text-high);">${mail.from}</span>
            <span>&lt;${mail.fromEmail}&gt;</span>
            <span>•</span>
            <span>${mail.time}</span>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-icon" title="${mail.starred ? 'Bỏ gắn sao' : 'Gắn dấu sao'}" onclick="window.MailModule.toggleStar('${mail.id}')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="${mail.starred ? '#f59e0b' : 'none'}" stroke="${mail.starred ? '#f59e0b' : 'currentColor'}" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
          <button class="btn btn-secondary btn-icon" title="Tóm tắt bằng AISA" onclick="window.AisaModule.summarizeMail('${mail.id}')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#f472b6" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/></svg>
          </button>
          <button class="btn btn-secondary btn-icon" title="Tạo Task từ thư này" onclick="window.MailModule.convertMailToTask('${mail.id}')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </button>
          <button class="btn btn-secondary btn-icon" title="Xóa thư" onclick="window.MailModule.deleteMail('${mail.id}')" style="color: #ef4444;">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div class="mail-reader-body">
        ${(mail.body || '').replace(/\n/g, '<br>')}
      </div>
    `;
  },

  toggleStar(mailId) {
    window.store.toggleStarMail(mailId);
    this.renderMailList();
    this.renderActiveMail();
  },

  async deleteMail(mailId) {
    const ok = await window.showConfirmPopup(
      "Xác Nhận Xóa Thư ✉️",
      "Cậu có chắc chắn muốn xóa thư này không?"
    );
    if (!ok) return;

    if (window.CloudModule) {
      await window.CloudModule.deleteMail(mailId);
    } else {
      window.store.deleteMail(mailId);
    }
    this.renderMailList();
    this.renderActiveMail();
    window.UI.showToast("Đã xóa thư! 🗑️", "", "info");
  },

  generateAiDraft() {
    const subjectInput = document.getElementById("mail-to-subject");
    const bodyInput = document.getElementById("mail-to-body");
    
    const subject = subjectInput ? subjectInput.value : "";
    if (subject.toLowerCase().includes("họp") || subject.toLowerCase().includes("meet")) {
      bodyInput.value = `Kính gửi các thành viên trong Ban Chỉ Huy,\n\nEm xin thông báo lịch họp bàn chiến lược triển khai phân khu mới vào 14:00 ngày mai tại phòng MHEnt Meet.\nNội dung trọng tâm:\n1. Phân bổ nhân sự và phân quyền Master/Member.\n2. Lên timeline kiểm thử PWA và tích hợp AISA.\n\nRất mong mọi người có mặt đúng giờ.\nTrân trọng!`;
    } else {
      bodyInput.value = `Thân gửi Master và toàn thể thành viên,\n\nEm xin gửi bản báo cáo tiến độ các công việc trong tuần qua của phân khu. Mọi hạng mục đều đang vận hành đúng kế hoạch và sẵn sàng cho đợt triển khai sắp tới.\n\nMọi người vui lòng kiểm tra và đóng góp ý kiến nếu cần nhé!\nTrân trọng.`;
    }

    window.UI.showToast("AISA đã soạn xong bản nháp!", "Bạn có thể chỉnh sửa lại trước khi gửi.", "info");
  },

  async sendMail() {
    const toInput = document.getElementById("mail-to-recipient");
    const subjectInput = document.getElementById("mail-to-subject");
    const bodyInput = document.getElementById("mail-to-body");

    if (!toInput || !subjectInput || !bodyInput) return;

    const newMail = {
      id: "mail-" + Date.now(),
      from: window.store.state.currentUser.name,
      fromEmail: window.store.state.currentUser.email,
      toEmail: toInput.value,
      subject: subjectInput.value || "(Không có chủ đề)",
      time: "Vừa xong",
      starred: false,
      read: true,
      body: bodyInput.value
    };

    if (window.CloudModule) {
      await window.CloudModule.pushMail(newMail);
    } else {
      window.store.addMail(newMail);
    }

    window.store.state.activeMailId = newMail.id;
    window.store.save();

    window.UI.closeModal("modal-compose-mail");
    this.renderMailList();
    this.renderActiveMail();

    toInput.value = "";
    subjectInput.value = "";
    bodyInput.value = "";

    window.UI.showToast("Đã gửi thư lên Cloud Supabase! ✉️", newMail.subject, "success");
  },

  convertMailToTask(mailId) {
    const mail = window.store.state.mails.find(m => m.id === mailId);
    if (!mail) return;

    const taskTitle = document.getElementById("task-title");
    const taskDesc = document.getElementById("task-desc");

    if (taskTitle) taskTitle.value = `Xử lý thư: ${mail.subject}`;
    if (taskDesc) taskDesc.value = `Nội dung từ ${mail.from}:\n${mail.body.slice(0, 150)}...`;

    window.UI.openModal("modal-add-task");
    window.UI.showToast("Đã chuyển thư thành Task!", "Vui lòng chọn người phụ trách và deadline.", "info");
  }
};
