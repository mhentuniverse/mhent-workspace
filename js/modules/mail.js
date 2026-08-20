/**
 * MHENT WORKSPACE - MAIL MODULE (CLOUD ENABLED)
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
      readerEl.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-muted);">Không có thư nào được chọn</div>`;
      return;
    }

    readerEl.innerHTML = `
      <div class="mail-reader-header">
        <div>
          <h2 class="mail-reader-subject">${mail.subject}</h2>
          <div style="font-size: 13px; color: var(--text-muted); display: flex; gap: 10px; align-items: center;">
            <span style="font-weight: 800; color: var(--text-high);">${mail.from}</span>
            <span>&lt;${mail.fromEmail}&gt;</span>
            <span>•</span>
            <span>${mail.time}</span>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-icon" title="Tóm tắt bằng AISA" onclick="window.AisaModule.summarizeMail('${mail.id}')">
            ✨
          </button>
          <button class="btn btn-secondary btn-icon" title="Tạo Task từ thư này" onclick="window.MailModule.convertMailToTask('${mail.id}')">
            📋
          </button>
        </div>
      </div>
      <div class="mail-reader-body">
        ${(mail.body || '').replace(/\n/g, '<br>')}
      </div>
    `;
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
      from: window.store.state.currentUser.name,
      fromEmail: window.store.state.currentUser.email,
      subject: subjectInput.value || "(Không có chủ đề)",
      time: "Vừa xong",
      starred: false,
      read: true,
      body: bodyInput.value
    };

    // 1. Gửi lên Cloud Firestore
    if (window.CloudModule && window.CloudModule.isLive) {
      await window.CloudModule.sendEmail(newMail);
    }

    // 2. Lưu local
    newMail.id = "mail-" + Date.now();
    window.store.addMail(newMail);
    window.store.state.activeMailId = newMail.id;
    window.store.save();

    window.UI.closeModal("modal-compose-mail");
    this.renderMailList();
    this.renderActiveMail();

    toInput.value = "";
    subjectInput.value = "";
    bodyInput.value = "";

    window.UI.showToast("Đã gửi thư lên Cloud Firestore! ✉️", newMail.subject, "success");
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
