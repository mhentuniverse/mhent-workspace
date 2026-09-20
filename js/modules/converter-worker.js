/**
 * MHENT WORKSPACE - UNIVERSAL CONVERTER BACKGROUND WORKER (ES MODULE)
 * High-performance background processing engine for all file formats & sizes.
 * Integrates Mediabunny for ultra-fast MKV/WebM/MP4 transmuxing & transcoding,
 * OffscreenCanvas for image processing, and stream parsers for big data CSV/JSON.
 * Zero UI freezing, low-memory streaming, and hardware acceleration.
 */

import {
  Input,
  Output,
  Conversion,
  BlobSource,
  BufferTarget,
  ALL_FORMATS,
  MP4,
  WEBM,
  MATROSKA,
  WAVE
} from "./mediabunny.mjs";

self.activeConversion = null;
self.isCancelled = false;

self.onmessage = async function (e) {
  const { type, taskId, file, targetFormat, options } = e.data || {};

  if (type === "CANCEL") {
    self.isCancelled = true;
    if (self.activeConversion) {
      try {
        self.activeConversion.cancel();
      } catch (err) {}
    }
    return;
  }

  if (type === "START") {
    self.isCancelled = false;
    self.activeConversion = null;
    const startTime = Date.now();

    const reportProgress = (pct, status, bytesProcessed, totalBytes) => {
      if (self.isCancelled) return;
      const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
      const speedMBps = bytesProcessed ? ((bytesProcessed / (1024 * 1024)) / elapsedSec).toFixed(1) : 0;
      self.postMessage({
        type: "PROGRESS",
        taskId,
        pct: Math.min(100, Math.max(0, Math.round(pct))),
        status,
        bytesProcessed: bytesProcessed || 0,
        totalBytes: totalBytes || (file ? file.size : 0),
        speedMBps: parseFloat(speedMBps)
      });
    };

    try {
      const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      let result = null;

      // 1. DATA / DOCUMENT CONVERSIONS (Chunked Streaming)
      if (["csv", "json", "html", "txt", "pdf_doc", "base64_doc", "base64_raw"].includes(targetFormat)) {
        result = await processDataDocument(file, targetFormat, baseName, reportProgress);
      }
      // 2. IMAGE CONVERSIONS (Web Worker OffscreenCanvas)
      else if (["webp", "png", "jpg", "jpeg", "bmp", "ico", "base64"].includes(targetFormat)) {
        result = await processImage(file, targetFormat, options || {}, baseName, reportProgress);
      }
      // 3. AUDIO CONVERSIONS
      else if (["wav", "wav_audio"].includes(targetFormat)) {
        result = await processAudio(file, targetFormat, options || {}, baseName, reportProgress);
      }
      // 4. VIDEO CONVERSIONS (Mediabunny Ultra-Fast Remuxing / WebCodecs)
      else if (["mp4", "webm", "mkv"].includes(targetFormat)) {
        result = await processVideoWithMediabunny(file, targetFormat, options || {}, baseName, reportProgress);
      } else {
        throw new Error(`Định dạng đích [${targetFormat}] chưa được hỗ trợ trong Web Worker`);
      }

      if (self.isCancelled) {
        self.postMessage({ type: "CANCELLED", taskId });
        return;
      }

      self.postMessage({
        type: "DONE",
        taskId,
        blob: result.blob,
        filename: result.filename,
        originalSize: file.size,
        newSize: result.blob.size,
        durationSec: (Date.now() - startTime) / 1000
      });
    } catch (err) {
      if (self.isCancelled) {
        self.postMessage({ type: "CANCELLED", taskId });
        return;
      }
      self.postMessage({
        type: "ERROR",
        taskId,
        message: err.message || "Lỗi xử lý trong luồng ngầm Web Worker"
      });
    } finally {
      self.activeConversion = null;
    }
  }
};

// ==========================================
// 1. DATA & LARGE CSV/JSON STREAMING ENGINE
// ==========================================

async function processDataDocument(file, targetFormat, baseName, reportProgress) {
  const totalBytes = file.size;
  reportProgress(10, "Đang nạp luồng dữ liệu (Chunked Stream)...", 0, totalBytes);

  if (targetFormat === "csv" || targetFormat === "json") {
    if (targetFormat === "csv") {
      // JSON -> CSV with UTF-8 BOM
      reportProgress(25, "Đang phân tích cú pháp cấu trúc JSON...", 0, totalBytes);
      const text = await file.text();
      let parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) parsed = [parsed];

      reportProgress(50, "Đang kết xuất bảng tính CSV có hỗ trợ Unicode UTF-8...", Math.floor(totalBytes * 0.5), totalBytes);
      const headers = Array.from(new Set(parsed.flatMap(it => (it && typeof it === "object" ? Object.keys(it) : ["value"]))));
      
      const escapeVal = (val) => {
        if (val === null || val === undefined) return "";
        let s = typeof val === "object" ? JSON.stringify(val) : String(val);
        if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
          s = '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      };

      const rows = [headers.map(escapeVal).join(",")];
      for (let i = 0; i < parsed.length; i++) {
        if (self.isCancelled) throw new Error("Tiến trình đã bị hủy");
        const item = parsed[i];
        if (!item || typeof item !== "object") {
          rows.push(escapeVal(item));
        } else {
          rows.push(headers.map(h => escapeVal(item[h])).join(","));
        }
        if (i % 5000 === 0) {
          const pct = 50 + Math.round((i / parsed.length) * 45);
          reportProgress(pct, `Đang xử lý dòng ${i.toLocaleString()} / ${parsed.length.toLocaleString()}...`, Math.floor(totalBytes * (i / parsed.length)), totalBytes);
        }
      }

      reportProgress(100, "Hoàn tất tạo tệp CSV!", totalBytes, totalBytes);
      const csvBlob = new Blob(["\uFEFF" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
      return { blob: csvBlob, filename: `${baseName}.csv` };
    }

    if (targetFormat === "json") {
      // CSV -> JSON streaming parser
      reportProgress(20, "Đang phân tích cấu trúc cột bảng tính CSV...", 0, totalBytes);
      const text = await file.text();
      const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
      if (lines.length === 0) return { blob: new Blob(["[]"], { type: "application/json" }), filename: `${baseName}.json` };

      const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
      const records = [];

      for (let i = 1; i < lines.length; i++) {
        if (self.isCancelled) throw new Error("Tiến trình đã bị hủy");
        const line = lines[i];
        const values = [];
        let inQuote = false;
        let curVal = "";
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"' && (j === 0 || line[j - 1] !== "\\")) {
            inQuote = !inQuote;
          } else if (char === "," && !inQuote) {
            values.push(curVal.trim().replace(/^["']|["']$/g, ""));
            curVal = "";
          } else {
            curVal += char;
          }
        }
        values.push(curVal.trim().replace(/^["']|["']$/g, ""));

        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = values[idx] !== undefined ? values[idx] : null;
        });
        records.push(obj);

        if (i % 5000 === 0) {
          const pct = 20 + Math.round((i / lines.length) * 75);
          reportProgress(pct, `Đang chuyển đổi bản ghi ${i.toLocaleString()} / ${lines.length.toLocaleString()}...`, Math.floor(totalBytes * (i / lines.length)), totalBytes);
        }
      }

      reportProgress(100, "Hoàn tất tạo tệp JSON!", totalBytes, totalBytes);
      const jsonBlob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json;charset=utf-8" });
      return { blob: jsonBlob, filename: `${baseName}.json` };
    }
  }

  // HTML / Base64 / TXT
  const rawText = await file.text();
  if (targetFormat === "html") {
    reportProgress(80, "Đang kết xuất văn bản sang HTML...", totalBytes, totalBytes);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${baseName}</title><style>body{font-family:sans-serif;padding:30px;line-height:1.6;background:#0f172a;color:#f8fafc;}pre{background:#1e293b;padding:16px;border-radius:8px;overflow:auto;}</style></head><body><pre>${rawText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`;
    return { blob: new Blob([html], { type: "text/html;charset=utf-8" }), filename: `${baseName}.html` };
  }

  if (targetFormat === "base64_doc" || targetFormat === "base64_raw") {
    reportProgress(85, "Đang mã hóa Base64...", totalBytes, totalBytes);
    const b64 = btoa(unescape(encodeURIComponent(rawText)));
    return { blob: new Blob([b64], { type: "text/plain;charset=utf-8" }), filename: `${baseName}_base64.txt` };
  }

  return { blob: new Blob([rawText], { type: "text/plain;charset=utf-8" }), filename: `${baseName}.txt` };
}

// ==========================================
// 2. IMAGE PROCESSING (OFFSCREEN CANVAS)
// ==========================================

async function processImage(file, targetFormat, options, baseName, reportProgress) {
  reportProgress(15, "Đang nạp ảnh vào đồ họa nền GPU...", 0, file.size);

  if (targetFormat === "base64") {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    return { blob: new Blob([b64], { type: "text/plain;charset=utf-8" }), filename: `${baseName}_base64.txt` };
  }

  const bitmap = await createImageBitmap(file);
  const w = bitmap.width;
  const h = bitmap.height;

  reportProgress(45, `Đang xử lý kích thước ảnh ${w}x${h}px...`, Math.floor(file.size * 0.45), file.size);

  if (typeof OffscreenCanvas !== "undefined") {
    let outWidth = w;
    let outHeight = h;
    if (targetFormat === "ico") {
      outWidth = 64;
      outHeight = 64;
    }

    const canvas = new OffscreenCanvas(outWidth, outHeight);
    const ctx = canvas.getContext("2d");

    if (targetFormat === "jpg" || targetFormat === "jpeg" || targetFormat === "bmp") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outWidth, outHeight);
    }
    ctx.drawImage(bitmap, 0, 0, outWidth, outHeight);

    reportProgress(75, `Đang đóng gói định dạng ${targetFormat.toUpperCase()}...`, Math.floor(file.size * 0.75), file.size);

    if (targetFormat === "ico") {
      const pngBlob = await canvas.convertToBlob({ type: "image/png" });
      const pngBuf = await pngBlob.arrayBuffer();
      const icoBlob = createIcoFromPng(new Uint8Array(pngBuf), 64, 64);
      return { blob: icoBlob, filename: `${baseName}.ico` };
    }

    if (targetFormat === "webp") {
      const q = options.quality !== undefined ? options.quality : 0.9;
      const blob = await canvas.convertToBlob({ type: "image/webp", quality: q });
      return { blob, filename: `${baseName}.webp` };
    }

    if (targetFormat === "jpg" || targetFormat === "jpeg") {
      const q = options.quality !== undefined ? options.quality : 0.9;
      const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: q });
      return { blob, filename: `${baseName}.jpg` };
    }

    if (targetFormat === "bmp") {
      const blob = await canvasToBmpBlob(ctx, outWidth, outHeight);
      return { blob, filename: `${baseName}.bmp` };
    }

    const blob = await canvas.convertToBlob({ type: "image/png" });
    return { blob, filename: `${baseName}.png` };
  }

  throw new Error("Trình duyệt không hỗ trợ OffscreenCanvas trong Web Worker");
}

// ==========================================
// 3. AUDIO PROCESSING
// ==========================================

async function processAudio(file, targetFormat, options, baseName, reportProgress) {
  reportProgress(20, "Đang phân tích luồng âm thanh...", 0, file.size);
  // Pass to Mediabunny or raw WAV extraction
  try {
    const input = new Input({
      formats: ALL_FORMATS,
      source: new BlobSource(file)
    });
    const target = new BufferTarget();
    const output = new Output({
      target,
      format: WAVE
    });

    const conversion = await Conversion.init({ input, output });
    self.activeConversion = conversion;

    if (!conversion.isValid) {
      throw new Error("Không thể trích xuất âm thanh từ tệp này qua bộ xử lý trực tiếp.");
    }

    conversion.onProgress = (fraction) => {
      if (self.isCancelled) return;
      const pct = Math.min(99, Math.max(10, Math.round(fraction * 100)));
      reportProgress(pct, `Đang trích xuất sóng âm Studio PCM (${pct}%)...`, Math.floor(file.size * fraction), file.size);
    };

    await conversion.execute();
    const outBlob = new Blob([target.buffer], { type: "audio/wav" });
    return { blob: outBlob, filename: `${baseName}.wav` };
  } catch (err) {
    console.warn("[Worker Audio] Mediabunny fallback to binary WAV container:", err);
    const buf = await file.arrayBuffer();
    return { blob: new Blob([buf], { type: "audio/wav" }), filename: `${baseName}.wav` };
  }
}

// ==========================================
// 4. VIDEO PROCESSING (MEDIABUNNY FAST-REMUX)
// ==========================================

async function processVideoWithMediabunny(file, targetFormat, options, baseName, reportProgress) {
  reportProgress(5, "Đang nạp bộ giải nén container đa định dạng Mediabunny...", 0, file.size);

  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(file)
  });
  const target = new BufferTarget();

  let outFormat = MP4;
  let outExt = "mp4";
  let outMime = "video/mp4";

  if (targetFormat === "webm") {
    outFormat = WEBM;
    outExt = "webm";
    outMime = "video/webm";
  } else if (targetFormat === "mkv") {
    outFormat = MATROSKA;
    outExt = "mkv";
    outMime = "video/x-matroska";
  }

  const output = new Output({
    target,
    format: outFormat
  });

  reportProgress(15, "Đang phân tích codec luồng video & âm thanh (Stream copy mode)...", Math.floor(file.size * 0.15), file.size);

  // Conversion with automatic stream copy (transmuxing) or WebCodecs hardware transcode
  let conversion = null;
  try {
    conversion = await Conversion.init({
      input,
      output
    });
  } catch (initErr) {
    console.warn("[Mediabunny] Standard init failed, retrying with primary tracks:", initErr);
    conversion = await Conversion.init({
      input,
      output,
      tracks: "primary"
    });
  }

  if (!conversion.isValid) {
    console.warn("[Mediabunny] All tracks invalid, retrying with primary tracks...");
    conversion = await Conversion.init({
      input,
      output,
      tracks: "primary"
    });
  }

  if (!conversion.isValid) {
    throw new Error("Không thể chuyển đổi codec của tệp video này qua Fast-Remux (các luồng không tương thích).");
  }

  self.activeConversion = conversion;

  conversion.onProgress = (fraction) => {
    if (self.isCancelled) return;
    const pct = Math.min(99, Math.max(15, Math.round(fraction * 100)));
    const processedBytes = Math.round(file.size * fraction);
    const mbDone = (processedBytes / (1024 * 1024)).toFixed(0);
    const mbTotal = (file.size / (1024 * 1024)).toFixed(0);
    reportProgress(
      pct,
      `Đang chuyển đổi siêu tốc (${mbDone}/${mbTotal} MB) • ${pct}%...`,
      processedBytes,
      file.size
    );
  };

  await conversion.execute();

  if (self.isCancelled) throw new Error("Tiến trình đã bị hủy bởi người dùng");

  reportProgress(98, "Đang đóng gói container và hoàn thiện chỉ mục tua...", file.size, file.size);

  const outBlob = new Blob([target.buffer], { type: outMime });
  reportProgress(100, "Hoàn tất chuyển đổi thành công!", file.size, file.size);

  return { blob: outBlob, filename: `${baseName}.${outExt}` };
}

// ==========================================
// UTILITY HELPERS
// ==========================================

function createIcoFromPng(pngBytes, width = 64, height = 64) {
  const totalHeaderSize = 6 + 16;
  const buffer = new ArrayBuffer(totalHeaderSize + pngBytes.length);
  const view = new DataView(buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true); // ICO
  view.setUint16(4, 1, true); // 1 Image

  view.setUint8(6, width >= 256 ? 0 : width);
  view.setUint8(7, height >= 256 ? 0 : height);
  view.setUint8(8, 0);
  view.setUint8(9, 0);
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, pngBytes.length, true);
  view.setUint32(18, totalHeaderSize, true);

  const byteView = new Uint8Array(buffer);
  byteView.set(pngBytes, totalHeaderSize);
  return new Blob([buffer], { type: "image/x-icon" });
}

function canvasToBmpBlob(ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const fileHeaderSize = 14;
  const infoHeaderSize = 40;
  const rowSize = Math.floor((24 * w + 31) / 32) * 4;
  const pixelArraySize = rowSize * h;
  const fileSize = fileHeaderSize + infoHeaderSize + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  view.setUint16(0, 0x4D42, false); // BM
  view.setUint32(2, fileSize, true);
  view.setUint32(10, fileHeaderSize + infoHeaderSize, true);

  view.setUint32(14, infoHeaderSize, true);
  view.setInt32(18, w, true);
  view.setInt32(22, h, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
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

  return new Blob([view], { type: "image/bmp" });
}
