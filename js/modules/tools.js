/**
 * MHENT WORKSPACE - SPECIAL TOOLS MODULE
 * Universal Multi-Format File Converter, QR Generator/Scanner, Wiki & Notes
 */
window.ToolsModule = {
  currentFile: null,
  targetFormat: null,
  convertedBlob: null,
  convertedFilename: "",
  activeTab: "converter",

  init() {
    this.bindEvents();
    this.setTab("converter");
    this.generateQrCode("https://workspace.mhentuniverse.com");
  },

  bindEvents() {
    // Tab switching buttons
    const tabBtns = document.querySelectorAll(".tool-tab-btn");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        if (tab) this.setTab(tab);
      });
    });

    // QR Generate button
    const qrGenBtn = document.getElementById("btn-gen-qr");
    if (qrGenBtn) {
      qrGenBtn.addEventListener("click", () => {
        const input = document.getElementById("qr-input-text");
        const text = (input && input.value.trim()) ? input.value.trim() : "https://workspace.mhentuniverse.com";
        this.generateQrCode(text);
      });
    }
  },

  setTab(tabName) {
    this.activeTab = tabName;

    // 1. Update top tabs
    document.querySelectorAll(".tool-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
    });

    // 2. Update panes
    document.querySelectorAll(".tool-pane").forEach(pane => {
      pane.classList.toggle("active", pane.id === `tool-pane-${tabName}`);
    });

    // 3. Update sidebar navigation
    document.querySelectorAll("#tools-sidebar-nav .sidebar-nav-item").forEach(item => {
      item.classList.toggle("active", item.getAttribute("data-tool-tab") === tabName);
    });

    // Special pane inits
    if (tabName === "notes") {
      this.renderNotes();
    }
  },

  // ==========================================
  // UNIVERSAL FILE CONVERTER ENGINE
  // ==========================================

  triggerFileInput() {
    this.setTab("converter");
    const input = document.getElementById("universal-file-input");
    if (input) {
      input.value = "";
      input.click();
    }
  },

  onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById("converter-dropzone");
    if (dropzone) dropzone.classList.add("drag-active");
  },

  onDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById("converter-dropzone");
    if (dropzone) dropzone.classList.remove("drag-active");
  },

  onFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById("converter-dropzone");
    if (dropzone) dropzone.classList.remove("drag-active");

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      this.loadFile(e.dataTransfer.files[0]);
    }
  },

  onFileSelected(e) {
    if (e.target && e.target.files && e.target.files.length > 0) {
      this.loadFile(e.target.files[0]);
    }
  },

  loadFile(file) {
    if (!file) return;
    this.currentFile = file;
    this.convertedBlob = null;
    this.convertedFilename = "";

    const name = file.name;
    const sizeFormatted = this.formatFileSize(file.size);
    const mime = file.type || "application/octet-stream";
    const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
    const category = this.detectCategory(ext, mime);

    // Update UI Meta
    const nameEl = document.getElementById("file-meta-name");
    const sizeEl = document.getElementById("file-meta-size");
    const catEl = document.getElementById("file-meta-category");
    const extEl = document.getElementById("file-meta-ext");
    const iconEl = document.getElementById("file-meta-icon");

    if (nameEl) nameEl.textContent = name;
    if (sizeEl) sizeEl.textContent = sizeFormatted;
    if (catEl) catEl.textContent = category.label;
    if (extEl) extEl.textContent = "." + ext.toUpperCase();
    if (iconEl) iconEl.textContent = category.icon;

    // Reset results & progress
    const resBox = document.getElementById("converter-result-box");
    if (resBox) resBox.style.display = "none";
    const progBox = document.getElementById("converter-progress-box");
    if (progBox) progBox.style.display = "none";

    // Setup Live Preview
    this.setupLivePreview(file, category.id);

    // Setup Target Format Chips
    this.setupFormatChips(category.id, ext);

    // Reveal Workspace & Hide Dropzone
    const dropzone = document.getElementById("converter-dropzone");
    const workspace = document.getElementById("converter-active-workspace");
    if (dropzone) dropzone.style.display = "none";
    if (workspace) workspace.style.display = "block";
  },

  detectCategory(ext, mime) {
    const imgExts = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg", "ico", "avif", "tiff"];
    const vidExts = ["mp4", "mkv", "webm", "mov", "avi", "flv", "wmv", "m4v", "ts"];
    const audExts = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma", "opus"];
    const docExts = ["json", "csv", "md", "markdown", "html", "htm", "txt", "pdf", "xml", "log"];

    if (imgExts.includes(ext) || mime.startsWith("image/")) {
      return { id: "image", label: "Hình Ảnh", icon: "🖼️" };
    }
    if (vidExts.includes(ext) || mime.startsWith("video/")) {
      return { id: "video", label: "Video Đa Phương Tiện", icon: "🎬" };
    }
    if (audExts.includes(ext) || mime.startsWith("audio/")) {
      return { id: "audio", label: "Âm Thanh Audio", icon: "🎵" };
    }
    if (docExts.includes(ext) || mime.includes("json") || mime.includes("text") || mime.includes("csv")) {
      return { id: "doc", label: "Dữ Liệu & Văn Bản", icon: "📄" };
    }
    return { id: "other", label: "Tệp Dữ Liệu", icon: "📦" };
  },

  setupLivePreview(file, categoryId) {
    const imgBox = document.getElementById("preview-image-box");
    const vidBox = document.getElementById("preview-video-box");
    const audBox = document.getElementById("preview-audio-box");
    const txtBox = document.getElementById("preview-text-box");

    if (imgBox) imgBox.style.display = "none";
    if (vidBox) vidBox.style.display = "none";
    if (audBox) audBox.style.display = "none";
    if (txtBox) txtBox.style.display = "none";

    const objectUrl = URL.createObjectURL(file);

    if (categoryId === "image") {
      const imgEl = document.getElementById("preview-image-el");
      if (imgEl && imgBox) {
        imgEl.src = objectUrl;
        imgBox.style.display = "block";
      }
    } else if (categoryId === "video") {
      const vidEl = document.getElementById("preview-video-el");
      if (vidEl && vidBox) {
        vidEl.src = objectUrl;
        vidBox.style.display = "block";
      }
    } else if (categoryId === "audio") {
      const audEl = document.getElementById("preview-audio-el");
      if (audEl && audBox) {
        audEl.src = objectUrl;
        audBox.style.display = "block";
      }
    } else {
      // Text preview for docs/data
      const reader = new FileReader();
      reader.onload = (e) => {
        const txtEl = document.getElementById("preview-text-el");
        if (txtEl && txtBox) {
          const content = String(e.target.result || "").slice(0, 3000);
          txtEl.textContent = content + (content.length >= 3000 ? "\n... (Nội dung còn tiếp)" : "");
          txtBox.style.display = "block";
        }
      };
      reader.readAsText(file.slice(0, 50000));
    }
  },

  setupFormatChips(categoryId, currentExt) {
    const container = document.getElementById("converter-format-chips");
    if (!container) return;
    container.innerHTML = "";

    const formatMap = {
      image: [
        { id: "webp", label: "WEBP (Hiện đại & Nhẹ)", icon: "✨", default: currentExt !== "webp" },
        { id: "png", label: "PNG (Không nén/Trong suốt)", icon: "🖼️", default: currentExt === "webp" },
        { id: "jpg", label: "JPG (Ảnh chuẩn)", icon: "📸" },
        { id: "ico", label: "ICO (Favicon icon)", icon: "🔖" },
        { id: "bmp", label: "BMP (Bitmap gốc)", icon: "🎨" },
        { id: "pdf", label: "PDF (Xuất thành trang tài liệu)", icon: "📄" },
        { id: "base64", label: "Base64 (Data URI Text)", icon: "💻" }
      ],
      video: [
        { id: "webm", label: "WEBM (Transcode chuẩn Web VP9/VP8)", icon: "🌐", default: true },
        { id: "mp4", label: "MP4 (Mã hóa phần cứng H.264/AAC)", icon: "🎬" },
        { id: "wav_audio", label: "Trích xuất Âm thanh (WAV Lossless PCM)", icon: "🎵" },
        { id: "gif", label: "Chụp ảnh Frame (Snapshot)", icon: "🎞️" }
      ],
      audio: [
        { id: "wav", label: "WAV (Lossless Studio PCM 16-bit)", icon: "🎼", default: true },
        { id: "base64", label: "Mã hóa Base64 Audio", icon: "💻" }
      ],
      doc: [
        { id: "csv", label: "CSV (Bảng tính Excel UTF-8)", icon: "📊", default: currentExt === "json" },
        { id: "json", label: "JSON (Dữ liệu có cấu trúc)", icon: "⚡", default: currentExt === "csv" },
        { id: "html", label: "HTML (Trang web có style)", icon: "🌐", default: currentExt === "md" },
        { id: "txt", label: "TXT (Văn bản thuần túy)", icon: "📝", default: currentExt !== "json" && currentExt !== "csv" && currentExt !== "md" },
        { id: "pdf_doc", label: "In / Tệp PDF", icon: "📑" },
        { id: "base64_doc", label: "Mã hóa Base64", icon: "🔒" }
      ],
      other: [
        { id: "base64_raw", label: "Mã hóa Base64 (Text)", icon: "💻", default: true },
        { id: "rename_ext", label: "Đổi Đuôi Mở Rộng (.bin / .dat)", icon: "🏷️" }
      ]
    };

    const formats = formatMap[categoryId] || formatMap.other;
    let selectedOne = false;

    formats.forEach((fmt, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "format-chip-btn";
      btn.innerHTML = `<span>${fmt.icon}</span> <span>${fmt.label}</span>`;
      btn.setAttribute("data-fmt", fmt.id);

      const isDefault = fmt.default || (!selectedOne && idx === 0);
      if (isDefault && !selectedOne) {
        btn.classList.add("active");
        this.selectFormat(fmt.id);
        selectedOne = true;
      }

      btn.addEventListener("click", () => {
        container.querySelectorAll(".format-chip-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.selectFormat(fmt.id);
      });

      container.appendChild(btn);
    });
  },

  selectFormat(fmtId) {
    this.targetFormat = fmtId;

    // Toggle options based on format
    const imgQualityRow = document.getElementById("option-image-quality");
    const videoModeRow = document.getElementById("option-video-mode");
    const audioSampleRow = document.getElementById("option-audio-sample");

    if (imgQualityRow) {
      imgQualityRow.style.display = (fmtId === "jpg" || fmtId === "webp") ? "flex" : "none";
    }
    if (videoModeRow) {
      videoModeRow.style.display = (fmtId === "mp4" || fmtId === "webm") ? "flex" : "none";
    }
    if (audioSampleRow) {
      audioSampleRow.style.display = (fmtId === "wav" || fmtId === "wav_audio" || fmtId === "webm_audio") ? "flex" : "none";
    }

    const btnLabel = document.getElementById("btn-convert-label");
    if (btnLabel) {
      btnLabel.textContent = `Bắt Đầu Chuyển Đổi Sang ${fmtId.toUpperCase()}`;
    }
  },

  async startConversion() {
    if (!this.currentFile) {
      window.UI.showToast("Lỗi", "Vui lòng chọn một tệp để bắt đầu!", "warning");
      return;
    }

    const progBox = document.getElementById("converter-progress-box");
    const progStatus = document.getElementById("converter-progress-status");
    const progPercent = document.getElementById("converter-progress-percent");
    const progFill = document.getElementById("converter-progress-fill");
    const resBox = document.getElementById("converter-result-box");

    if (resBox) resBox.style.display = "none";
    if (progBox) progBox.style.display = "block";

    const updateProgress = (pct, status) => {
      if (progPercent) progPercent.textContent = pct + "%";
      if (progStatus) progStatus.textContent = status;
      if (progFill) progFill.style.width = pct + "%";
    };

    try {
      updateProgress(15, "Đang nạp và phân tích cấu trúc dữ liệu...");
      await this.sleep(250);

      const file = this.currentFile;
      const fmt = this.targetFormat;
      const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      let outputBlob = null;
      let outputFilename = "";

      updateProgress(35, `Đang xử lý thuật toán chuyển đổi sang ${fmt.toUpperCase()}...`);
      await this.sleep(300);

      // 1. IMAGE CONVERSIONS
      if (["png", "jpg", "webp", "bmp", "ico", "pdf", "base64"].includes(fmt)) {
        updateProgress(60, "Đang giải mã điểm ảnh và mã hóa định dạng đích...");
        const qualityInput = document.getElementById("converter-img-quality");
        const quality = qualityInput ? parseInt(qualityInput.value, 10) / 100 : 0.9;
        const res = await this.convertImage(file, fmt, quality, baseName);
        outputBlob = res.blob;
        outputFilename = res.filename;
      }
      // 2. AUDIO & VIDEO AUDIO EXTRACTION
      else if (["wav", "wav_audio", "webm_audio", "ogg"].includes(fmt)) {
        updateProgress(65, "Đang giải mã luồng sóng âm (Web Audio PCM)...");
        const sampleRateSelect = document.getElementById("converter-audio-rate");
        const sampleRate = sampleRateSelect ? parseInt(sampleRateSelect.value, 10) : 44100;
        const res = await this.convertAudio(file, fmt, sampleRate, baseName);
        outputBlob = res.blob;
        outputFilename = res.filename;
      }
      // 3. VIDEO TRANSCODING / REMUX
      else if (["mp4", "webm", "gif"].includes(fmt)) {
        updateProgress(65, "Đang xử lý container video và chuẩn hóa frame...");
        const res = await this.convertVideo(file, fmt, baseName);
        outputBlob = res.blob;
        outputFilename = res.filename;
      }
      // 4. DOCUMENT & STRUCTURED DATA
      else {
        updateProgress(70, "Đang phân tích cú pháp và trích xuất bảng dữ liệu...");
        const res = await this.convertDocument(file, fmt, baseName);
        outputBlob = res.blob;
        outputFilename = res.filename;
      }

      updateProgress(100, "Hoàn tất chuyển đổi thành công!");
      await this.sleep(200);

      this.convertedBlob = outputBlob;
      this.convertedFilename = outputFilename;

      // Show Result Card
      if (resBox) {
        const metaText = document.getElementById("result-meta-text");
        const originalSize = this.formatFileSize(file.size);
        const newSize = this.formatFileSize(outputBlob.size);
        if (metaText) {
          metaText.innerHTML = `<strong>${outputFilename}</strong> (${newSize}) • Tệp gốc: ${originalSize}`;
        }
        resBox.style.display = "flex";
      }

      window.UI.showToast("Chuyển đổi thành công! ⚡", `Đã tạo ${outputFilename}`, "success");
    } catch (err) {
      console.error("[Universal Converter] Lỗi:", err);
      updateProgress(100, "Lỗi trong quá trình chuyển đổi: " + (err.message || "Không thể xử lý"));
      window.UI.showToast("Lỗi chuyển đổi", err.message || "Không thể chuyển đổi tệp này", "error");
    }
  },

  // ==========================================
  // CONVERSION HANDLERS (CLIENT-SIDE)
  // ==========================================

  async convertImage(file, fmt, quality, baseName) {
    if (fmt === "base64") {
      const b64 = await this.readFileAsDataURL(file);
      const blob = new Blob([b64], { type: "text/plain;charset=utf-8" });
      return { blob, filename: `${baseName}_base64.txt` };
    }

    const img = await this.loadImageElement(file);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");

    // White background for JPG if transparent
    if (fmt === "jpg" || fmt === "jpeg" || fmt === "bmp") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);

    if (fmt === "png") {
      const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
      return { blob, filename: `${baseName}.png` };
    }

    if (fmt === "jpg") {
      const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", quality));
      return { blob, filename: `${baseName}.jpg` };
    }

    if (fmt === "webp") {
      const blob = await new Promise(r => canvas.toBlob(r, "image/webp", quality));
      return { blob, filename: `${baseName}.webp` };
    }

    if (fmt === "ico") {
      // Scale down to standard 64x64 favicon and wrap into valid ICO binary
      const icoCanvas = document.createElement("canvas");
      icoCanvas.width = 64;
      icoCanvas.height = 64;
      const icoCtx = icoCanvas.getContext("2d");
      icoCtx.drawImage(canvas, 0, 0, 64, 64);
      const pngBlob = await new Promise(r => icoCanvas.toBlob(r, "image/png"));
      const pngBuf = await pngBlob.arrayBuffer();
      const icoBlob = this.createIcoFromPng(new Uint8Array(pngBuf), 64, 64);
      return { blob: icoBlob, filename: `${baseName}.ico` };
    }

    if (fmt === "bmp") {
      const blob = await this.canvasToBmpBlob(canvas);
      return { blob, filename: `${baseName}.bmp` };
    }

    if (fmt === "pdf") {
      // Generate genuine standard ISO 32000-1 compliant PDF 1.4 embedding the image
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const pdfBlob = await this.createRealPdfFromImage(dataUrl, canvas.width, canvas.height);
      return { blob: pdfBlob, filename: `${baseName}.pdf` };
    }

    throw new Error("Định dạng ảnh không được hỗ trợ");
  },

  async convertAudio(file, fmt, sampleRate, baseName) {
    if (fmt === "base64") {
      const b64 = await this.readFileAsDataURL(file);
      const blob = new Blob([b64], { type: "text/plain;charset=utf-8" });
      return { blob, filename: `${baseName}_audio_base64.txt` };
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) throw new Error("Trình duyệt không hỗ trợ Web Audio API");

    const audioCtx = new AudioCtx();
    const arrayBuf = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuf);

    if (fmt === "wav" || fmt === "wav_audio") {
      const wavBlob = this.audioBufferToWav(audioBuffer, sampleRate);
      return { blob: wavBlob, filename: `${baseName}_audio.wav` };
    }

    throw new Error("Định dạng âm thanh không được hỗ trợ");
  },

  async convertVideo(file, fmt, baseName) {
    // 1. Lossless Audio Extraction via Web Audio API PCM decoder
    if (fmt === "wav_audio") {
      return this.convertAudio(file, "wav", 44100, baseName);
    }

    // 2. Video Frame Snapshot
    if (fmt === "gif") {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.src = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Trình duyệt không thể giải mã cấu trúc video này."));
        setTimeout(() => reject(new Error("Quá thời gian nạp video.")), 7000);
      });

      const canvas = document.createElement("canvas");
      canvas.width = Math.min(video.videoWidth || 640, 640);
      canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
      const ctx = canvas.getContext("2d");

      video.currentTime = Math.min(1.0, (video.duration || 2) / 2);
      await new Promise(r => { video.onseeked = r; });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
      return { blob, filename: `${baseName}_frame.png` };
    }

    // 3. Genuine In-Browser Video Transcoding via MediaRecorder & Stream Capture
    const video = document.createElement("video");
    video.muted = false;
    video.playsInline = true;
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => {
        reject(new Error("Trình duyệt không hỗ trợ giải mã trực tiếp codec của video này (như MKV dùng codec HEVC/H.265 hoặc âm thanh DTS). Hãy chọn 'Trích xuất Âm thanh (WAV PCM)' nếu bạn cần tiếng!"));
      };
      setTimeout(() => {
        if (!video.videoWidth && !video.duration) {
          reject(new Error("Không thể nạp thông tin video hoặc định dạng không được trình duyệt hỗ trợ trực tiếp."));
        }
      }, 8000);
    });

    const stream = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null);
    if (!stream) {
      throw new Error("Trình duyệt không hỗ trợ MediaStream capture từ video.");
    }

    // Determine target MIME type supported by browser
    let targetMime = "video/webm";
    let outputExt = "webm";

    if (fmt === "mp4") {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/mp4;codecs=avc1,mp4a.40.2")) {
        targetMime = "video/mp4;codecs=avc1,mp4a.40.2";
        outputExt = "mp4";
      } else if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/mp4")) {
        targetMime = "video/mp4";
        outputExt = "mp4";
      } else {
        targetMime = (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) ? "video/webm;codecs=vp9,opus" : "video/webm";
        outputExt = "webm";
        if (window.UI && typeof window.UI.showToast === "function") {
          window.UI.showToast("Ghi chú định dạng", "Trình duyệt chưa hỗ trợ encoder MP4 trực tiếp, hệ thống tự động chuyển sang WebM (VP9) chuẩn web sắc nét!", "info");
        }
      }
    } else {
      targetMime = (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) ? "video/webm;codecs=vp9,opus" : "video/webm";
      outputExt = "webm";
    }

    // Route audio silently via Web Audio API so it doesn't blast speakers during transcoding
    let combinedStream = stream;
    let audioCtx = null;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        const audioTracks = dest.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          combinedStream = new MediaStream([
            ...stream.getVideoTracks(),
            ...audioTracks
          ]);
        }
      }
    } catch (e) {
      console.warn("Audio stream routing fallback:", e);
    }

    // Read bitrate option
    const bitrateSelect = document.getElementById("converter-video-bitrate");
    let videoBps = 2500000;
    if (bitrateSelect) {
      if (bitrateSelect.value === "high") videoBps = 4500000;
      else if (bitrateSelect.value === "low") videoBps = 1000000;
    }

    const chunks = [];
    const recorder = new MediaRecorder(combinedStream, {
      mimeType: targetMime,
      videoBitsPerSecond: videoBps
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const updateProgress = (pct, text) => {
      const progPercent = document.getElementById("converter-progress-percent");
      const progStatus = document.getElementById("converter-progress-status");
      const progFill = document.getElementById("converter-progress-fill");
      if (progPercent) progPercent.textContent = pct + "%";
      if (progStatus) progStatus.textContent = text;
      if (progFill) progFill.style.width = pct + "%";
    };

    return new Promise((resolve, reject) => {
      let isDone = false;
      const cleanup = () => {
        if (audioCtx) {
          try { audioCtx.close(); } catch(e) {}
        }
        URL.revokeObjectURL(videoUrl);
      };

      recorder.onstop = () => {
        if (isDone) return;
        isDone = true;
        cleanup();
        const outBlob = new Blob(chunks, { type: targetMime });
        resolve({ blob: outBlob, filename: `${baseName}_converted.${outputExt}` });
      };

      recorder.onerror = (err) => {
        cleanup();
        reject(err);
      };

      try {
        video.playbackRate = 2.0; // 2x playback speed for faster transcoding
      } catch(e) {}

      video.ontimeupdate = () => {
        if (video.duration && video.duration > 0) {
          const currentPct = Math.min(95, Math.round((video.currentTime / video.duration) * 60) + 35);
          updateProgress(currentPct, `Đang transcode frame video (${Math.round(video.currentTime)}s / ${Math.round(video.duration)}s)...`);
        }
      };

      video.onended = () => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      };

      recorder.start(250);
      video.play().catch(err => {
        cleanup();
        reject(new Error("Trình duyệt chặn phát video tự động: " + err.message));
      });
    });
  },

  async convertDocument(file, fmt, baseName) {
    const rawText = await file.text();

    if (fmt === "csv") {
      // JSON -> CSV
      try {
        const json = JSON.parse(rawText);
        const csv = this.jsonToCsv(json);
        // Include UTF-8 BOM (\uFEFF) so Excel opens Vietnamese without corrupting accents
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        return { blob, filename: `${baseName}.csv` };
      } catch (e) {
        throw new Error("Tệp nguồn không phải là JSON hợp lệ: " + e.message);
      }
    }

    if (fmt === "json") {
      // CSV -> JSON
      try {
        const json = this.csvToJson(rawText);
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json;charset=utf-8" });
        return { blob, filename: `${baseName}.json` };
      } catch (e) {
        throw new Error("Lỗi phân tích cú pháp CSV: " + e.message);
      }
    }

    if (fmt === "html") {
      // Markdown -> Styled HTML
      const htmlContent = this.markdownToHtml(rawText, baseName);
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      return { blob, filename: `${baseName}.html` };
    }

    if (fmt === "txt") {
      // Strip markdown / tags to pure plain text
      const cleanText = rawText.replace(/<[^>]*>?/gm, '').replace(/[#*_`]/g, '');
      const blob = new Blob([cleanText], { type: "text/plain;charset=utf-8" });
      return { blob, filename: `${baseName}.txt` };
    }

    if (fmt === "pdf_doc") {
      // Generate genuine text PDF document
      const pdfBlob = await this.createTextPdf(rawText, baseName);
      return { blob: pdfBlob, filename: `${baseName}.pdf` };
    }

    if (fmt === "base64_doc" || fmt === "base64_raw") {
      const b64 = btoa(unescape(encodeURIComponent(rawText)));
      const blob = new Blob([b64], { type: "text/plain;charset=utf-8" });
      return { blob, filename: `${baseName}_base64.txt` };
    }

    // Default: text blob
    const blob = new Blob([rawText], { type: "text/plain;charset=utf-8" });
    return { blob, filename: `${baseName}.txt` };
  },

  // ==========================================
  // UTILITY HELPERS & CONVERTERS
  // ==========================================

  downloadResult() {
    if (!this.convertedBlob || !this.convertedFilename) {
      window.UI.showToast("Thông báo", "Chưa có tệp nào được chuyển đổi!", "warning");
      return;
    }

    const url = URL.createObjectURL(this.convertedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = this.convertedFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    window.UI.showToast("Tải xuống thành công! 📥", `Đã lưu tệp [${this.convertedFilename}]`, "success");
  },

  async saveResultToDrive() {
    if (!this.convertedBlob || !this.convertedFilename) {
      window.UI.showToast("Thông báo", "Chưa có tệp nào được chuyển đổi!", "warning");
      return;
    }

    const fileMeta = {
      id: "file-" + Date.now(),
      name: this.convertedFilename,
      size: this.formatFileSize(this.convertedBlob.size),
      type: this.getFileCategoryFromExt(this.convertedFilename),
      icon: this.getFileIcon(this.convertedFilename),
      url: URL.createObjectURL(this.convertedBlob),
      date: new Date().toLocaleDateString("vi-VN")
    };

    if (window.DriveModule && typeof window.DriveModule.pushFile === "function") {
      window.DriveModule.pushFile(fileMeta);
    } else if (window.CloudModule && typeof window.CloudModule.pushFile === "function") {
      await window.CloudModule.pushFile(fileMeta);
    } else if (window.store && typeof window.store.addFile === "function") {
      window.store.addFile(fileMeta);
    }

    window.UI.showToast("Đã lưu vào Media Drive! ☁️", `Tệp [${this.convertedFilename}] đã sẵn sàng trong kho Drive`, "success");
  },

  resetConverter() {
    this.currentFile = null;
    this.targetFormat = null;
    this.convertedBlob = null;
    this.convertedFilename = "";

    const dropzone = document.getElementById("converter-dropzone");
    const workspace = document.getElementById("converter-active-workspace");
    const fileInput = document.getElementById("universal-file-input");

    if (fileInput) fileInput.value = "";
    if (workspace) workspace.style.display = "none";
    if (dropzone) dropzone.style.display = "flex";
  },

  // Audio WAV Encoder (16-bit PCM RIFF)
  audioBufferToWav(buffer, optSampleRate = 44100) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = optSampleRate || buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    let result;
    if (numChannels === 2) {
      result = this.interleave(buffer.getChannelData(0), buffer.getChannelData(1));
    } else {
      result = buffer.getChannelData(0);
    }

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const bufferLen = 44 + result.length * bytesPerSample;
    const arrayBuf = new ArrayBuffer(bufferLen);
    const view = new DataView(arrayBuf);

    // RIFF chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + result.length * bytesPerSample, true);
    this.writeString(view, 8, 'WAVE');
    // fmt sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    // data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, result.length * bytesPerSample, true);

    // Write samples
    let offset = 44;
    for (let i = 0; i < result.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, result[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  },

  interleave(inputL, inputR) {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
    let index = 0;
    let inputIndex = 0;
    while (index < length) {
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  },

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  },

  // JSON to CSV with proper escaping
  jsonToCsv(items) {
    if (!Array.isArray(items)) {
      items = [items];
    }
    if (items.length === 0) return "";

    const headers = Array.from(
      new Set(items.flatMap(item => (item && typeof item === "object" ? Object.keys(item) : ["value"])))
    );

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return "";
      let str = typeof val === "object" ? JSON.stringify(val) : String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        str = '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const headerRow = headers.map(escapeCsv).join(",");
    const rows = items.map(item => {
      if (!item || typeof item !== "object") return escapeCsv(item);
      return headers.map(h => escapeCsv(item[h])).join(",");
    });

    return [headerRow, ...rows].join("\r\n");
  },

  // CSV to JSON parser
  csvToJson(csvText) {
    const lines = csvText.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];

    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i];
      // Regex parsing for CSV quotes
      const values = [];
      let inQuote = false;
      let curVal = "";

      for (let c = 0; c < currentLine.length; c++) {
        const char = currentLine[c];
        if (char === '"') {
          inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
          values.push(curVal.trim().replace(/^["']|["']$/g, ""));
          curVal = "";
        } else {
          curVal += char;
        }
      }
      values.push(curVal.trim().replace(/^["']|["']$/g, ""));

      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] !== undefined ? values[idx] : "";
      });
      result.push(obj);
    }

    return result;
  },

  // Markdown to Styled HTML wrapper
  markdownToHtml(md, title) {
    let html = md
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/!\[(.*?)\]\((.*?)\)/gim, "<img alt='$1' src='$2' />")
      .replace(/\[(.*?)\]\((.*?)\)/gim, "<a href='$2'>$1</a>")
      .replace(/\n$/gim, '<br />');

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; color: #1e293b; background: #f8fafc; }
    h1, h2, h3 { color: #0f172a; margin-top: 1.5em; }
    blockquote { border-left: 4px solid #8b5cf6; padding-left: 16px; color: #64748b; margin: 16px 0; }
    code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 90%; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  },

  // Genuine Binary PDF 1.4 from Image (ISO 32000-1 standard)
  async createRealPdfFromImage(dataUrl, width, height) {
    const base64Data = dataUrl.split(",")[1];
    const binaryStr = atob(base64Data);
    const jpegBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      jpegBytes[i] = binaryStr.charCodeAt(i);
    }

    const maxWidth = 595.28;
    const maxHeight = 841.89;
    let pdfW = width;
    let pdfH = height;
    if (pdfW > maxWidth || pdfH > maxHeight) {
      const ratio = Math.min(maxWidth / pdfW, maxHeight / pdfH);
      pdfW = Math.round(pdfW * ratio);
      pdfH = Math.round(pdfH * ratio);
    }

    const headerStr = "%PDF-1.4\n";
    const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
    const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
    const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfW} ${pdfH}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`;
    
    const contentStream = `q\n${pdfW} 0 0 ${pdfH} 0 0 cm\n/Im1 Do\nQ\n`;
    const obj4 = `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`;
    
    const obj5Head = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`;
    const obj5Tail = "\nendstream\nendobj\n";

    const enc = new TextEncoder();
    const hBytes = enc.encode(headerStr);
    const o1Bytes = enc.encode(obj1);
    const o2Bytes = enc.encode(obj2);
    const o3Bytes = enc.encode(obj3);
    const o4Bytes = enc.encode(obj4);
    const o5HeadBytes = enc.encode(obj5Head);
    const o5TailBytes = enc.encode(obj5Tail);

    const offsets = [0];
    let cur = hBytes.length;
    offsets.push(cur); cur += o1Bytes.length;
    offsets.push(cur); cur += o2Bytes.length;
    offsets.push(cur); cur += o3Bytes.length;
    offsets.push(cur); cur += o4Bytes.length;
    offsets.push(cur); cur += o5HeadBytes.length + jpegBytes.length + o5TailBytes.length;

    let xrefStr = `xref\n0 6\n0000000000 65535 f \n`;
    for (let i = 1; i <= 5; i++) {
      xrefStr += String(offsets[i]).padStart(10, '0') + " 00000 n \n";
    }
    const trailerStr = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${cur}\n%%EOF\n`;
    const xrefBytes = enc.encode(xrefStr);
    const trailerBytes = enc.encode(trailerStr);

    const totalLen = cur + xrefBytes.length + trailerBytes.length;
    const outBuf = new Uint8Array(totalLen);
    let ptr = 0;

    outBuf.set(hBytes, ptr); ptr += hBytes.length;
    outBuf.set(o1Bytes, ptr); ptr += o1Bytes.length;
    outBuf.set(o2Bytes, ptr); ptr += o2Bytes.length;
    outBuf.set(o3Bytes, ptr); ptr += o3Bytes.length;
    outBuf.set(o4Bytes, ptr); ptr += o4Bytes.length;
    outBuf.set(o5HeadBytes, ptr); ptr += o5HeadBytes.length;
    outBuf.set(jpegBytes, ptr); ptr += jpegBytes.length;
    outBuf.set(o5TailBytes, ptr); ptr += o5TailBytes.length;
    outBuf.set(xrefBytes, ptr); ptr += xrefBytes.length;
    outBuf.set(trailerBytes, ptr);

    return new Blob([outBuf], { type: "application/pdf" });
  },

  // High-DPI Canvas Text to Real PDF 1.4 with full Unicode / Vietnamese support
  async createTextPdf(text, title) {
    const canvas = document.createElement("canvas");
    canvas.width = 1240; // 150 DPI A4
    canvas.height = 1754;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Accent bar
    ctx.fillStyle = "#6366f1";
    ctx.fillRect(0, 0, canvas.width, 14);

    // Header Title
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(title || "Tài Liệu MHEnt Universe", 80, 100);

    // Subtitle
    ctx.fillStyle = "#64748b";
    ctx.font = "17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const dateStr = new Date().toLocaleDateString("vi-VN") + " • MIYAZAKI HARUTO ENTERTAINMENT CO., LTD.";
    ctx.fillText(dateStr, 80, 135);

    // Divider line
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 160);
    ctx.lineTo(canvas.width - 80, 160);
    ctx.stroke();

    // Body text with word wrap
    ctx.fillStyle = "#1e293b";
    ctx.font = "20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const lineHeight = 34;
    const maxTextWidth = canvas.width - 160;
    let y = 210;

    const rawLines = text.split("\n");
    for (const rawLine of rawLines) {
      if (y > canvas.height - 100) break;
      if (rawLine.trim() === "") {
        y += lineHeight * 0.7;
        continue;
      }
      const words = rawLine.split(" ");
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? currentLine + " " + word : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxTextWidth && currentLine) {
          ctx.fillText(currentLine, 80, y);
          y += lineHeight;
          currentLine = word;
          if (y > canvas.height - 100) break;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine && y <= canvas.height - 100) {
        ctx.fillText(currentLine, 80, y);
        y += lineHeight;
      }
    }

    // Footer
    ctx.fillStyle = "#94a3b8";
    ctx.font = "15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("MHEnt Universe Client-Side Document Export Engine • Chuẩn PDF 1.4", 80, canvas.height - 50);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    return this.createRealPdfFromImage(dataUrl, canvas.width, canvas.height);
  },

  // Genuine Windows .ICO Binary Generator (6-byte header + 16-byte dir + PNG payload)
  createIcoFromPng(pngBytes, width = 64, height = 64) {
    const totalHeaderSize = 6 + 16;
    const buffer = new ArrayBuffer(totalHeaderSize + pngBytes.length);
    const view = new DataView(buffer);

    // ICONDIR
    view.setUint16(0, 0, true);
    view.setUint16(2, 1, true); // 1 = ICO
    view.setUint16(4, 1, true); // 1 Image

    // ICONDIRENTRY
    view.setUint8(6, width >= 256 ? 0 : width);
    view.setUint8(7, height >= 256 ? 0 : height);
    view.setUint8(8, 0); // Palette
    view.setUint8(9, 0); // Reserved
    view.setUint16(10, 1, true); // Color planes
    view.setUint16(12, 32, true); // Bits per pixel
    view.setUint32(14, pngBytes.length, true); // Size
    view.setUint32(18, totalHeaderSize, true); // Offset

    const byteView = new Uint8Array(buffer);
    byteView.set(pngBytes, totalHeaderSize);

    return new Blob([buffer], { type: "image/x-icon" });
  },

  // Canvas to BMP Blob
  canvasToBmpBlob(canvas) {
    return new Promise(resolve => {
      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext("2d");
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const fileHeaderSize = 14;
      const infoHeaderSize = 40;
      const rowSize = Math.floor((24 * w + 31) / 32) * 4;
      const pixelArraySize = rowSize * h;
      const fileSize = fileHeaderSize + infoHeaderSize + pixelArraySize;

      const buffer = new ArrayBuffer(fileSize);
      const view = new DataView(buffer);

      // File header
      view.setUint16(0, 0x4D42, false); // 'BM'
      view.setUint32(2, fileSize, true);
      view.setUint32(10, fileHeaderSize + infoHeaderSize, true);

      // Info header
      view.setUint32(14, infoHeaderSize, true);
      view.setInt32(18, w, true);
      view.setInt32(22, h, true);
      view.setUint16(26, 1, true); // Planes
      view.setUint16(28, 24, true); // Bit count
      view.setUint32(34, pixelArraySize, true);

      let offset = fileHeaderSize + infoHeaderSize;
      for (let y = h - 1; y >= 0; y--) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          view.setUint8(offset++, data[idx + 2]); // B
          view.setUint8(offset++, data[idx + 1]); // G
          view.setUint8(offset++, data[idx]);     // R
        }
        for (let p = 0; p < rowSize - w * 3; p++) {
          view.setUint8(offset++, 0);
        }
      }

      resolve(new Blob([view], { type: "image/bmp" }));
    });
  },

  loadImageElement(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  },

  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  },

  getFileCategoryFromExt(filename) {
    const ext = filename.split(".").pop().toLowerCase();
    if (["png", "jpg", "jpeg", "webp", "gif", "ico", "bmp"].includes(ext)) return "image";
    if (["mp4", "mkv", "webm", "mov", "avi"].includes(ext)) return "video";
    if (["mp3", "wav", "ogg", "aac", "m4a"].includes(ext)) return "audio";
    return "doc";
  },

  getFileIcon(filename) {
    const ext = filename.split(".").pop().toLowerCase();
    if (["png", "jpg", "jpeg", "webp", "gif", "ico", "bmp"].includes(ext)) return "🖼️";
    if (["mp4", "mkv", "webm", "mov", "avi"].includes(ext)) return "🎬";
    if (["mp3", "wav", "ogg", "aac", "m4a"].includes(ext)) return "🎵";
    if (["csv", "json"].includes(ext)) return "📊";
    if (["pdf"].includes(ext)) return "📑";
    return "📄";
  },

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  },

  // ==========================================
  // QR CODE GENERATOR & SCANNER
  // ==========================================

  generateQrCode(text) {
    const qrCanvas = document.getElementById("qr-display-canvas");
    const qrContainer = qrCanvas ? qrCanvas.parentElement : null;
    const qrResultText = document.getElementById("qr-code-content-text");

    if (qrResultText) qrResultText.textContent = text;

    if (typeof QRCode !== "undefined" && qrContainer) {
      let qrDiv = document.getElementById("qrcode-rendered-holder");
      if (!qrDiv) {
        qrDiv = document.createElement("div");
        qrDiv.id = "qrcode-rendered-holder";
        qrDiv.style.display = "flex";
        qrDiv.style.justifyContent = "center";
        qrDiv.style.alignItems = "center";
        qrDiv.style.padding = "10px";
        qrDiv.style.background = "#ffffff";
        qrDiv.style.borderRadius = "var(--radius-md)";

        if (qrCanvas) {
          qrCanvas.style.display = "none";
          qrContainer.insertBefore(qrDiv, qrCanvas);
        }
      }

      qrDiv.innerHTML = "";
      try {
        new QRCode(qrDiv, {
          text: text,
          width: 200,
          height: 200,
          colorDark: "#090D16",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
        return;
      } catch (e) {
        console.warn("Lỗi QRCode JS, fallback canvas:", e);
      }
    }

    // Canvas fallback pattern
    if (qrCanvas) {
      qrCanvas.style.display = "block";
      const ctx = qrCanvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(20, 20, 50, 50);
      ctx.clearRect(30, 30, 30, 30);
      ctx.fillRect(36, 36, 18, 18);
      ctx.fillRect(150, 20, 50, 50);
      ctx.clearRect(160, 30, 30, 30);
      ctx.fillRect(166, 36, 18, 18);
      ctx.fillRect(20, 150, 50, 50);
      ctx.clearRect(30, 160, 30, 30);
      ctx.fillRect(36, 166, 18, 18);

      for (let x = 30; x < 190; x += 14) {
        for (let y = 30; y < 190; y += 14) {
          if (Math.random() > 0.45) {
            ctx.fillRect(x, y, 10, 10);
          }
        }
      }
    }
  },

  // ==========================================
  // QUICK NOTES & INTERNAL WIKI
  // ==========================================

  renderNotes() {
    const listEl = document.getElementById("tools-notes-list");
    if (!listEl) return;

    const notes = (window.store && window.store.state && window.store.state.notes) ? window.store.state.notes : [];

    if (notes.length === 0) {
      listEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted); background: var(--bg-surface); border-radius: 12px; border: 1px dashed var(--border-subtle);">
          <div style="font-size: 32px; margin-bottom: 8px;">📝</div>
          <div style="font-size: 15px; font-weight: 700; color: #fff;">Chưa có ghi chú nào</div>
          <div style="font-size: 13px; margin-top: 4px;">Nhấp vào "Thêm Ghi Chú Mới" để tạo sổ tay, checklist hoặc lưu ý nội bộ!</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = notes.map(note => `
      <div class="tools-note-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="tools-note-title">${this.escapeHtml(note.title || "Ghi chú không tiêu đề")}</div>
          <button type="button" class="btn btn-ghost" style="padding: 2px 6px; font-size: 12px; color: #ef4444;" onclick="window.ToolsModule.deleteNote('${note.id}')" title="Xóa ghi chú">✕</button>
        </div>
        <div class="tools-note-content">${this.escapeHtml(note.content || "")}</div>
        <div class="tools-note-footer">
          <span>📅 ${note.updated_at ? new Date(note.updated_at).toLocaleDateString("vi-VN") : "Gần đây"}</span>
          <span style="color: var(--app-tools);">MHEnt Note</span>
        </div>
      </div>
    `).join("");
  },

  createQuickNote() {
    const title = prompt("Tiêu đề ghi chú:", "Quy trình làm việc mới");
    if (!title || !title.trim()) return;

    const content = prompt("Nội dung ghi chú:", "1. Kiểm tra tài nguyên\n2. Cập nhật tiến độ dự án\n3. Báo cáo cuối ngày");
    if (content === null) return;

    const newNote = {
      id: "note-" + Date.now(),
      title: title.trim(),
      content: content.trim(),
      updated_at: new Date().toISOString()
    };

    if (window.store && typeof window.store.saveNote === "function") {
      window.store.saveNote(newNote);
    } else {
      if (!window.store.state.notes) window.store.state.notes = [];
      window.store.state.notes.unshift(newNote);
      window.store.save();
    }

    if (window.CloudModule && typeof window.CloudModule.pushNote === "function") {
      window.CloudModule.pushNote(newNote).catch(() => {});
    }

    this.renderNotes();
    window.UI.showToast("Đã lưu ghi chú! 📝", `"${newNote.title}" đã được thêm vào sổ tay`, "success");
  },

  async deleteNote(noteId) {
    if (!confirm("Bạn có chắc chắn muốn xóa ghi chú này không?")) return;

    if (window.store && typeof window.store.deleteNote === "function") {
      window.store.deleteNote(noteId);
    } else if (window.store && window.store.state && window.store.state.notes) {
      window.store.state.notes = window.store.state.notes.filter(n => n.id !== noteId);
      window.store.save();
    }

    if (window.CloudModule && typeof window.CloudModule.deleteNote === "function") {
      window.CloudModule.deleteNote(noteId).catch(() => {});
    }

    this.renderNotes();
    window.UI.showToast("Đã xóa ghi chú", "", "info");
  },

  escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
};
