/**
 * MHENT WORKSPACE - DRIVE MODULE (SUPABASE & CLOUD ENABLED)
 */
window.DriveModule = {
  init() {
    this.renderFiles();
    this.bindEvents();
  },

  bindEvents() {
    const uploadBtn = document.getElementById("btn-upload-file");
    const fileInput = document.getElementById("file-upload-input");

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", (e) => this.handleFileUpload(e));
    }
  },

  renderFiles() {
    const gridEl = document.getElementById("drive-files-grid");
    if (!gridEl) return;

    const files = window.store.state.files || [];

    if (files.length === 0) {
      gridEl.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted);">Kho tài nguyên trống. Bấm 'Tải Lên Tệp' để thêm mới.</div>`;
      return;
    }

    gridEl.innerHTML = files.map(f => `
      <div class="drive-file-card" onclick="window.DriveModule.previewFile('${f.id}')">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="file-card-icon">${f.icon}</span>
          <span class="badge badge-primary">${(f.type || 'file').toUpperCase()}</span>
        </div>
        <div class="file-card-name" title="${f.name}">${f.name}</div>
        <div class="file-card-meta">
          <span>${f.size}</span> • <span>${f.date || 'Hôm nay'}</span>
        </div>
      </div>
    `).join("");
  },

  async handleFileUpload(e) {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const file = uploadedFiles[0];
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + " MB";

    let fileType = "doc";
    let icon = "📄";
    if (file.type.startsWith("image/")) { fileType = "image"; icon = "🖼️"; }
    else if (file.type.startsWith("video/")) { fileType = "video"; icon = "🎬"; }
    else if (file.type.startsWith("audio/")) { fileType = "audio"; icon = "🎵"; }
    else if (file.name.endsWith(".pdf")) { fileType = "pdf"; icon = "📕"; }

    const newFile = {
      id: "f-" + Date.now(),
      name: file.name,
      size: sizeMb,
      date: new Date().toISOString().split("T")[0],
      type: fileType,
      icon: icon
    };

    if (window.CloudModule) {
      await window.CloudModule.pushFile(newFile);
    } else {
      window.store.addFile(newFile);
    }

    this.renderFiles();
    window.UI.showToast("Đã tải tệp lên MHEnt Drive! 📁", file.name, "success");
    e.target.value = "";
  },

  previewFile(fileId) {
    const file = window.store.state.files.find(f => f.id === fileId);
    if (!file) return;

    const modalBody = document.getElementById("file-preview-body");
    const modalTitle = document.getElementById("file-preview-title");

    if (modalTitle) modalTitle.textContent = file.name;
    if (modalBody) {
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 64px; margin-bottom: 16px;">${file.icon}</div>
          <h3 style="margin-bottom: 8px;">${file.name}</h3>
          <p style="color: var(--text-muted); font-size: 13px;">Dung lượng: ${file.size} • Ngày tạo: ${file.date}</p>
          <div style="margin-top: 24px; display: flex; justify-content: center; gap: 10px;">
            <button class="btn btn-primary" onclick="window.UI.showToast('Đang tải xuống tệp...', '${file.name}', 'info')">⬇️ Tải xuống</button>
            <button class="btn btn-danger" onclick="window.DriveModule.deleteFile('${file.id}')">🗑️ Xóa tệp</button>
            <button class="btn btn-secondary" onclick="window.UI.closeModal('modal-file-preview')">Đóng</button>
          </div>
        </div>
      `;
    }

    window.UI.openModal("modal-file-preview");
  },

  async deleteFile(fileId) {
    const ok = await window.showConfirmPopup(
      "Xác Nhận Xóa Tệp Tin 📁",
      "Cậu có chắc chắn muốn xóa tệp này khỏi Drive không?"
    );
    if (!ok) return;

    if (window.CloudModule) {
      await window.CloudModule.deleteFile(fileId);
    } else {
      window.store.deleteFile(fileId);
    }
    window.UI.closeModal("modal-file-preview");
    this.renderFiles();
    window.UI.showToast("Đã xóa tệp khỏi Drive! 🗑️", "", "info");
  }
};
