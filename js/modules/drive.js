/**
 * MHENT WORKSPACE - DRIVE MODULE
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

    gridEl.innerHTML = files.map(f => `
      <div class="drive-file-card" onclick="window.DriveModule.previewFile('${f.id}')">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="file-card-icon">${f.icon}</span>
          <span class="badge badge-primary">${f.type.toUpperCase()}</span>
        </div>
        <div class="file-card-name" title="${f.name}">${f.name}</div>
        <div class="file-card-meta">
          <span>${f.size}</span> • <span>${f.date}</span>
        </div>
      </div>
    `).join("");
  },

  handleFileUpload(e) {
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

    window.store.state.files.unshift(newFile);
    window.store.save();
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
            <button class="btn btn-secondary" onclick="window.UI.closeModal('modal-file-preview')">Đóng</button>
          </div>
        </div>
      `;
    }

    window.UI.openModal("modal-file-preview");
  }
};
