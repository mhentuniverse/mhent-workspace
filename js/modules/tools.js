/**
 * MHENT WORKSPACE - SPECIAL TOOLS MODULE (QR, WIKI & MEDIA)
 */
window.ToolsModule = {
  init() {
    this.bindEvents();
    this.generateQrCode("MHENT-EVENT-CHECKIN-2026");
  },

  bindEvents() {
    const tabBtns = document.querySelectorAll(".tool-tab-btn");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const targetTab = btn.getAttribute("data-tab");
        const panes = document.querySelectorAll(".tool-pane");
        panes.forEach(p => p.classList.remove("active"));

        const activePane = document.getElementById(`tool-pane-${targetTab}`);
        if (activePane) activePane.classList.add("active");
      });
    });

    const qrGenBtn = document.getElementById("btn-gen-qr");
    if (qrGenBtn) {
      qrGenBtn.addEventListener("click", () => {
        const text = document.getElementById("qr-input-text").value || "MHENT-CHECKIN";
        this.generateQrCode(text);
      });
    }

    const startConvertBtn = document.getElementById("btn-start-convert");
    if (startConvertBtn) {
      startConvertBtn.addEventListener("click", () => this.simulateMediaConvert());
    }
  },

  generateQrCode(text) {
    const qrCanvas = document.getElementById("qr-display-canvas");
    if (!qrCanvas) return;

    const ctx = qrCanvas.getContext("2d");
    ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);

    // Draw dark background & stylish simulated QR pattern
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);

    ctx.fillStyle = "#0f172a";
    // Corners
    ctx.fillRect(20, 20, 50, 50);
    ctx.clearRect(30, 30, 30, 30);
    ctx.fillRect(36, 36, 18, 18);

    ctx.fillRect(170, 20, 50, 50);
    ctx.clearRect(180, 30, 30, 30);
    ctx.fillRect(186, 36, 18, 18);

    ctx.fillRect(20, 170, 50, 50);
    ctx.clearRect(30, 180, 30, 30);
    ctx.fillRect(36, 186, 18, 18);

    // Simulated QR dots
    for (let x = 30; x < 210; x += 14) {
      for (let y = 30; y < 210; y += 14) {
        if (Math.random() > 0.45) {
          ctx.fillRect(x, y, 10, 10);
        }
      }
    }

    const qrResultText = document.getElementById("qr-code-content-text");
    if (qrResultText) qrResultText.textContent = text;
  },

  simulateMediaConvert() {
    const progressEl = document.getElementById("media-convert-progress");
    const statusEl = document.getElementById("media-convert-status");

    if (!progressEl || !statusEl) return;

    statusEl.textContent = "Đang xử lý container MKV ➔ MP4 (H.264 / AAC)...";
    progressEl.style.width = "0%";

    let pct = 0;
    const interval = setInterval(() => {
      pct += 20;
      progressEl.style.width = pct + "%";
      if (pct >= 100) {
        clearInterval(interval);
        statusEl.textContent = "✅ Đã chuyển đổi thành công! Tệp: output_video.mp4 (48.2 MB)";
        window.UI.showToast("Chuyển đổi hoàn tất!", "Tệp đã sẵn sàng tải xuống.", "success");
      }
    }, 400);
  }
};
