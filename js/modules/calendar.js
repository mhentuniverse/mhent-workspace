/**
 * MHENT WORKSPACE - CALENDAR MODULE (CLOUD ENABLED & DYNAMIC DATES)
 * Supports:
 * 1. Dual Views: Month View (with gradient multi-event highlight) & Week View (7 Columns / Rows)
 * 2. Real Current Dynamic Date (automatically updates today highlight, month bounds, week intervals)
 * 3. Strict Chronological Ordering for Week View (earlier events at top, flowing down)
 * 4. Multi-color Gradient / Split Color for Days with 2+ Events
 * 5. Event Categories & Color Presets / Custom Hex Color
 * 6. Cloud Firestore Real-time Synchronization
 */

window.CalendarModule = {
  viewDate: new Date(), // Always dynamic real date
  currentView: 'month', // 'month' or 'week'
  weekLayout: localStorage.getItem('mhent_cal_layout') || 'columns', // 'columns' or 'rows'
  selectedFilter: 'all',
  selectedModalColor: '#8b5cf6',
  isCustomColorSelected: false,

  init() {
    if (window.store && window.store.state && Array.isArray(window.store.state.events)) {
      const beforeLen = window.store.state.events.length;
      window.store.state.events = window.store.state.events.filter(e => !String(e.id).startsWith("ev-demo-"));
      if (window.store.state.events.length !== beforeLen) {
        window.store.save();
      }
    }
    this.bindEvents();
    this.renderCalendar();
  },

  toggleRecurringSwitch(e) {
    const chk = document.getElementById("event-is-recurring");
    if (chk) {
      chk.checked = !chk.checked;
      this.toggleRecurringFields(chk.checked);
    }
  },

  toggleRecurringFields(show) {
    const card = document.getElementById("event-recurring-card");
    const fields = document.getElementById("event-recurring-fields");
    if (card) {
      if (show) card.classList.add("active");
      else card.classList.remove("active");
    }
    if (fields) {
      fields.style.display = show ? "flex" : "none";
    }
    if (show) {
      this.updateWeekdayIndicator();
      this.updateRecurSummary();
    }
  },

  setRecurrencePattern(pattern) {
    const select = document.getElementById("event-recurrence-pattern");
    if (select) select.value = pattern;

    document.querySelectorAll(".recur-freq-btn").forEach(btn => {
      if (btn.dataset.pattern === pattern) btn.classList.add("active");
      else btn.classList.remove("active");
    });

    const weekdayIndicator = document.getElementById("recur-weekdays-indicator");
    if (weekdayIndicator) {
      weekdayIndicator.style.display = (pattern === "weekly") ? "flex" : "none";
    }

    this.updateWeekdayIndicator();
    this.updateRecurSummary();
  },

  updateWeekdayIndicator() {
    const dateInput = document.getElementById("event-date");
    if (!dateInput || !dateInput.value) return;

    const d = new Date(dateInput.value + "T00:00:00");
    const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday

    const dayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const sub = document.getElementById("recur-weekly-sub");
    if (sub) {
      sub.innerText = `Vào ${dayNames[dayOfWeek]}`;
    }

    document.querySelectorAll(".recur-day-chip").forEach(chip => {
      const chipDay = parseInt(chip.dataset.day, 10);
      if (chipDay === dayOfWeek) {
        chip.classList.add("active");
      } else {
        chip.classList.remove("active");
      }
    });

    this.updateRecurSummary();
  },

  setRecurrenceEndMode(mode) {
    const neverBtn = document.getElementById("btn-recur-mode-never");
    const untilBtn = document.getElementById("btn-recur-mode-until");
    const pickerBox = document.getElementById("recur-until-picker-box");
    const endInput = document.getElementById("event-recurrence-end");

    if (mode === "never") {
      if (neverBtn) neverBtn.classList.add("active");
      if (untilBtn) untilBtn.classList.remove("active");
      if (pickerBox) pickerBox.style.display = "none";
      if (endInput) endInput.value = "";
    } else {
      if (neverBtn) neverBtn.classList.remove("active");
      if (untilBtn) untilBtn.classList.add("active");
      if (pickerBox) pickerBox.style.display = "block";
      if (endInput && !endInput.value) {
        const dateInput = document.getElementById("event-date");
        const base = dateInput && dateInput.value ? new Date(dateInput.value) : new Date();
        base.setMonth(base.getMonth() + 1);
        endInput.value = this.formatDateStr(base);
      }
    }
    this.updateRecurSummary();
  },

  setRecurQuickEnd(type) {
    const dateInput = document.getElementById("event-date");
    const base = dateInput && dateInput.value ? new Date(dateInput.value) : new Date();
    const endInput = document.getElementById("event-recurrence-end");
    if (!endInput) return;

    if (typeof type === "number") {
      base.setMonth(base.getMonth() + type);
    } else if (type === "year") {
      base.setMonth(11);
      base.setDate(31);
    }
    endInput.value = this.formatDateStr(base);
    this.updateRecurSummary();
  },

  updateRecurSummary() {
    const summaryEl = document.getElementById("recur-live-summary");
    if (!summaryEl) return;

    const patternEl = document.getElementById("event-recurrence-pattern");
    const endInput = document.getElementById("event-recurrence-end");
    const pattern = patternEl ? patternEl.value : "weekly";
    const endVal = endInput ? endInput.value : "";

    const dateInput = document.getElementById("event-date");
    const d = (dateInput && dateInput.value) ? new Date(dateInput.value + "T00:00:00") : new Date();
    const dayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

    let text = "";
    if (pattern === "weekly") {
      text = `Lặp vào mỗi ${dayNames[d.getDay()]} hàng tuần`;
    } else if (pattern === "daily") {
      text = "Lặp lại mỗi ngày";
    } else if (pattern === "weekdays") {
      text = "Lặp lại từ Thứ 2 đến Thứ 6 (ngày làm việc)";
    } else if (pattern === "monthly") {
      text = `Lặp lại vào ngày ${d.getDate()} hàng tháng`;
    }

    if (endVal) {
      const endParts = endVal.split("-");
      const formattedEnd = endParts.length === 3 ? `${endParts[2]}/${endParts[1]}/${endParts[0]}` : endVal;
      text += ` cho đến ngày ${formattedEnd}`;
    } else {
      text += ` (lặp vô hạn)`;
    }

    summaryEl.innerHTML = `<span>✨ ${text}</span>`;
  },

  bindEvents() {
    // Navigation: Prev, Next, Today
    const prevBtn = document.getElementById("btn-calendar-prev");
    if (prevBtn) prevBtn.onclick = () => this.prev();

    const nextBtn = document.getElementById("btn-calendar-next");
    if (nextBtn) nextBtn.onclick = () => this.next();

    const todayBtn = document.getElementById("btn-calendar-today");
    if (todayBtn) todayBtn.onclick = () => this.goToToday();

    // Add event buttons
    const addBtn = document.getElementById("btn-add-event");
    if (addBtn) addBtn.onclick = () => this.openAddModal();

    const addEventMainBtn = document.getElementById("btn-calendar-add-event");
    if (addEventMainBtn) addEventMainBtn.onclick = () => this.openAddModal();

    // AISA Free Time Finder
    const freeTimeBtn = document.getElementById("btn-find-free-time");
    if (freeTimeBtn) freeTimeBtn.onclick = () => this.findCommonFreeTime();

    // Form Add Event
    const form = document.getElementById("form-add-event");
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        this.saveEvent();
      };
    }

    // Modal color preset selector
    document.querySelectorAll('input[name="event-color-pick"]').forEach(radio => {
      radio.onchange = (e) => {
        this.setColorSelection(e.target.value, false);
      };
    });

    const customColorInput = document.getElementById("event-custom-color");
    if (customColorInput) {
      customColorInput.oninput = (e) => {
        this.setColorSelection(e.target.value, true);
      };
    }
  },

  /**
   * Helper: Format Date object to YYYY-MM-DD
   */
  formatDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  /**
   * Helper: Get today's real string (YYYY-MM-DD)
   */
  getTodayStr() {
    return this.formatDateStr(new Date());
  },

  /**
   * Helper: Convert time string (e.g., "09:00 - 10:30", "14:00", "Cả ngày")
   * to minutes from midnight for strict chronological sorting.
   */
  parseTimeMinutes(timeStr) {
    if (!timeStr) return -1;
    const lower = String(timeStr).toLowerCase().trim();
    if (lower.includes("cả ngày") || lower.includes("all day")) return -1;

    // Matches formats like 09:00, 9:30, 14h30, 15:45
    const match = lower.match(/(\d{1,2})[:h](\d{2})?/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const mins = match[2] ? parseInt(match[2], 10) : 0;
      return hours * 60 + mins;
    }

    const matchSingleHour = lower.match(/^(\d{1,2})/);
    if (matchSingleHour) {
      return parseInt(matchSingleHour[1], 10) * 60;
    }

    return 9999; // Put unparseable times at the bottom
  },

  /**
   * Expand recurring events for a specific date
   * Supports: daily, weekly (e.g. every Monday), weekdays (Mon-Fri), monthly
   * Enforces recurrenceEnd limit (e.g. until 15/10)
   */
  getEventsForDate(targetDateStr) {
    const allEvents = (window.store.state.events || []).filter(e => !String(e.id).startsWith("ev-demo-"));
    const result = [];
    const targetDate = new Date(targetDateStr + "T00:00:00");
    const targetDayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ...

    for (const ev of allEvents) {
      // 1. Single day event (not recurring)
      if (!ev.isRecurring || ev.recurrencePattern === "none") {
        if (ev.date === targetDateStr) {
          result.push(ev);
        }
        continue;
      }

      // 2. Recurring event evaluation
      const startDate = new Date(ev.date + "T00:00:00");
      if (targetDate < startDate) continue;

      // Check recurrence end limit (e.g. until 15/10/2026)
      if (ev.recurrenceEnd) {
        const endDate = new Date(ev.recurrenceEnd + "T23:59:59");
        if (targetDate > endDate) continue;
      }

      let matches = false;
      const pattern = ev.recurrencePattern || "weekly";

      if (pattern === "daily") {
        matches = true;
      } else if (pattern === "weekly") {
        // Matches if same day of the week as start date (e.g., Monday = 1)
        matches = (targetDayOfWeek === startDate.getDay());
      } else if (pattern === "weekdays") {
        // Monday (1) to Friday (5)
        matches = (targetDayOfWeek >= 1 && targetDayOfWeek <= 5);
      } else if (pattern === "monthly") {
        // Matches if same date of the month (e.g. 15th of every month)
        matches = (targetDate.getDate() === startDate.getDate());
      }

      if (matches) {
        result.push({
          ...ev,
          isInstance: true,
          originalId: ev.id,
          instanceDate: targetDateStr
        });
      }
    }

    return result;
  },

  /**
   * Sort events chronologically: earlier first, flowing down!
   */
  sortEventsChronologically(eventsList) {
    return [...eventsList].sort((a, b) => {
      const tA = this.parseTimeMinutes(a.time);
      const tB = this.parseTimeMinutes(b.time);
      if (tA !== tB) return tA - tB;
      return (a.title || "").localeCompare(b.title || "");
    });
  },

  getColorForType(type) {
    switch (type) {
      case 'meeting': return '#8b5cf6'; // Purple
      case 'deadline': return '#ef4444'; // Red
      case 'launch': return '#10b981'; // Emerald
      case 'media': return '#f59e0b'; // Amber
      case 'personal': return '#3b82f6'; // Blue
      default: return '#8b5cf6';
    }
  },

  getTypeLabel(type) {
    switch (type) {
      case 'meeting': return 'Cuộc họp';
      case 'deadline': return 'Hạn chót';
      case 'launch': return 'Ra mắt';
      case 'media': return 'Media';
      case 'personal': return 'Dự án';
      default: return 'Sự kiện';
    }
  },

  hexToRgba(hex, alpha = 1) {
    if (!hex || typeof hex !== 'string') return `rgba(139, 92, 246, ${alpha})`;
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c.split('').map(x => x + x).join('');
    }
    const num = parseInt(c, 16);
    if (isNaN(num)) return `rgba(139, 92, 246, ${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  /**
   * Main render dispatch
   */
  renderCalendar() {
    if (this.currentView === 'month') {
      this.renderMonthView();
    } else {
      this.renderWeekView();
    }
  },

  /**
   * RENDER MONTH VIEW
   * With dynamic date calculation & multi-event gradient / split-color highlighting
   */
  renderMonthView() {
    const gridEl = document.getElementById("calendar-grid-cells");
    if (!gridEl) return;

    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    const todayStr = this.getTodayStr();

    // Update Header Title
    const titleEl = document.getElementById("calendar-current-title");
    if (titleEl) {
      titleEl.innerText = `Tháng ${month + 1}, ${year}`;
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    // Monday is index 0, Sunday is index 6
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;

    const events = (window.store.state.events || []).filter(e => !String(e.id).startsWith("ev-demo-"));
    let cellsHtml = "";

    // 1. Previous month trailing days (dimmed)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, prevDay);
      const prevDateStr = this.formatDateStr(prevDate);
      cellsHtml += `
        <div class="calendar-day-cell dimmed" onclick="window.CalendarModule.selectDay('${prevDateStr}')">
          <div class="day-header">
            <span class="day-number">${prevDay}</span>
          </div>
        </div>
      `;
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = (dateStr === todayStr);

      let dayEvents = this.getEventsForDate(dateStr);
      if (this.selectedFilter && this.selectedFilter !== 'all') {
        dayEvents = dayEvents.filter(e => e.type === this.selectedFilter);
      }
      dayEvents = this.sortEventsChronologically(dayEvents);

      // Extract unique colors for gradient or split-color highlight
      const uniqueColors = [...new Set(dayEvents.map(e => e.color || this.getColorForType(e.type)))];

      let cellStyle = "";
      let stripeHtml = "";

      if (uniqueColors.length === 1) {
        const c = uniqueColors[0];
        cellStyle = `background: ${this.hexToRgba(c, 0.14)}; border-color: ${this.hexToRgba(c, 0.5)};`;
        stripeHtml = `<div class="cell-split-stripe" style="background: ${c};"></div>`;
      } else if (uniqueColors.length >= 2) {
        // Multi-color Gradient / Split color as requested!
        const gradStops = uniqueColors.map((c, idx) => `${this.hexToRgba(c, 0.22)} ${(idx / (uniqueColors.length - 1)) * 100}%`).join(", ");
        cellStyle = `background: linear-gradient(135deg, ${gradStops}); border-color: ${this.hexToRgba(uniqueColors[0], 0.55)};`;
        stripeHtml = `<div class="cell-split-stripe" style="background: linear-gradient(to right, ${uniqueColors.join(', ')});"></div>`;
      }

      // Event pills (up to 3)
      const visiblePills = dayEvents.slice(0, 3);
      const pillsHtml = visiblePills.map(ev => {
        const color = ev.color || this.getColorForType(ev.type);
        const timeBadge = ev.time ? ev.time.split('-')[0].trim() : '';
        const recurIcon = ev.isRecurring ? '🔁 ' : '';
        return `
          <div class="event-pill" style="background: ${this.hexToRgba(color, 0.28)}; border-left: 3px solid ${color}; color: #ffffff;" title="${ev.isRecurring ? '[Lặp lại] ' : ''}${this.escapeHtml(ev.title)} (${ev.time || 'Cả ngày'})" onclick="event.stopPropagation(); window.CalendarModule.showEventDetail('${ev.originalId || ev.id}')">
            ${timeBadge ? `<span class="pill-time">${timeBadge}</span>` : ''}
            <span class="pill-title">${recurIcon}${this.escapeHtml(ev.title)}</span>
          </div>
        `;
      }).join("");

      const moreCount = dayEvents.length - visiblePills.length;
      const moreHtml = moreCount > 0 ? `<div class="event-more-count">+${moreCount} sự kiện nữa</div>` : "";

      cellsHtml += `
        <div class="calendar-day-cell ${isToday ? 'today' : ''}" style="${cellStyle}" onclick="window.CalendarModule.selectDay('${dateStr}')">
          <div class="day-header">
            <span class="day-number">${day}</span>
            ${isToday ? '<span class="today-badge">Hôm nay</span>' : ''}
          </div>
          ${stripeHtml}
          <div class="event-pills-list">
            ${pillsHtml}
            ${moreHtml}
          </div>
        </div>
      `;
    }

    // 3. Next month trailing padding days
    const totalRendered = firstDayIndex + daysInMonth;
    const remaining = (totalRendered % 7 === 0) ? 0 : 7 - (totalRendered % 7);
    for (let nextDay = 1; nextDay <= remaining; nextDay++) {
      const nextDate = new Date(year, month + 1, nextDay);
      const nextDateStr = this.formatDateStr(nextDate);
      cellsHtml += `
        <div class="calendar-day-cell dimmed" onclick="window.CalendarModule.selectDay('${nextDateStr}')">
          <div class="day-header">
            <span class="day-number">${nextDay}</span>
          </div>
        </div>
      `;
    }

    gridEl.innerHTML = cellsHtml;
  },

  /**
   * Helper: Calculate Monday of the current viewDate's week
   */
  getStartOfWeek(date) {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  /**
   * RENDER WEEK VIEW
   * 7 Days displayed as 7 Columns (or 7 Rows based on user setting)
   * Events sorted strictly chronologically (earliest first, flowing down)
   */
  renderWeekView() {
    const weekContent = document.getElementById("calendar-week-content");
    if (!weekContent) return;

    const startOfWeek = this.getStartOfWeek(this.viewDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const todayStr = this.getTodayStr();

    // Update Header Title with full week span
    const titleEl = document.getElementById("calendar-current-title");
    if (titleEl) {
      const sDay = startOfWeek.getDate();
      const sMonth = startOfWeek.getMonth() + 1;
      const eDay = endOfWeek.getDate();
      const eMonth = endOfWeek.getMonth() + 1;
      const eYear = endOfWeek.getFullYear();
      titleEl.innerText = `Tuần: ${sDay}/${sMonth} - ${eDay}/${eMonth}/${eYear}`;
    }

    const events = (window.store.state.events || []).filter(e => !String(e.id).startsWith("ev-demo-"));
    const dayNames = [
      { short: "T2", full: "Thứ Hai" },
      { short: "T3", full: "Thứ Ba" },
      { short: "T4", full: "Thứ Tư" },
      { short: "T5", full: "Thứ Năm" },
      { short: "T6", full: "Thứ Sáu" },
      { short: "T7", full: "Thứ Bảy" },
      { short: "CN", full: "Chủ Nhật" }
    ];

    if (this.weekLayout === 'columns') {
      weekContent.className = "calendar-week-columns";
      let colsHtml = "";

      for (let i = 0; i < 7; i++) {
        const currDate = new Date(startOfWeek);
        currDate.setDate(startOfWeek.getDate() + i);
        const dateStr = this.formatDateStr(currDate);
        const isToday = (dateStr === todayStr);

        let dayEvents = this.getEventsForDate(dateStr);
        if (this.selectedFilter && this.selectedFilter !== 'all') {
          dayEvents = dayEvents.filter(e => e.type === this.selectedFilter);
        }
        // Strict chronological ordering
        dayEvents = this.sortEventsChronologically(dayEvents);

        const eventsCardsHtml = dayEvents.length > 0 ? dayEvents.map(ev => {
          const color = ev.color || this.getColorForType(ev.type);
          const recurIcon = ev.isRecurring ? '<span title="Sự kiện lặp lại" style="font-size: 9.5px; margin-left: 2px;">🔁</span>' : '';
          const escapedTitle = this.escapeHtml(ev.title);
          const escapedLoc = this.escapeHtml(ev.location || '');
          return `
            <div class="week-event-card" style="border-left-color: ${color}; background: ${this.hexToRgba(color, 0.12)};" onclick="window.CalendarModule.showEventDetail('${ev.originalId || ev.id}')" title="${escapedTitle}">
              <button class="week-event-del" onclick="event.stopPropagation(); window.CalendarModule.deleteEvent('${ev.originalId || ev.id}')" title="Xóa sự kiện">✕</button>
              <div class="week-event-top-row">
                <div class="week-event-time">
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>${ev.time || 'Cả ngày'}</span>
                  ${recurIcon}
                </div>
                <span class="week-event-badge" style="color: ${color};">${this.getTypeLabel(ev.type)}</span>
              </div>
              <div class="week-event-title">${escapedTitle}</div>
              ${ev.location ? `<div class="week-event-loc">📍 ${escapedLoc}</div>` : ''}
            </div>
          `;
        }).join("") : `
          <div class="week-empty-placeholder" onclick="window.CalendarModule.selectDay('${dateStr}')">
            <span>Chưa có sự kiện</span>
            <small>+ Bấm để thêm</small>
          </div>
        `;

        colsHtml += `
          <div class="week-day-col ${isToday ? 'is-today' : ''}">
            <div class="week-col-header ${isToday ? 'is-today' : ''}">
              <div class="week-day-title">${dayNames[i].full}</div>
              <div class="week-day-date">${currDate.getDate()} thg ${currDate.getMonth() + 1}</div>
              ${isToday ? '<span class="today-badge" style="margin-top: 4px; display: inline-block;">Hôm nay 🌟</span>' : ''}
            </div>
            <div class="week-col-events">
              ${eventsCardsHtml}
              <button class="week-col-add-btn" onclick="window.CalendarModule.selectDay('${dateStr}')">+ Thêm sự kiện</button>
            </div>
          </div>
        `;
      }
      weekContent.innerHTML = colsHtml;
    } else {
      // 7 Rows Layout
      weekContent.className = "calendar-week-rows";
      let rowsHtml = "";

      for (let i = 0; i < 7; i++) {
        const currDate = new Date(startOfWeek);
        currDate.setDate(startOfWeek.getDate() + i);
        const dateStr = this.formatDateStr(currDate);
        const isToday = (dateStr === todayStr);

        let dayEvents = events.filter(e => e.date === dateStr);
        if (this.selectedFilter && this.selectedFilter !== 'all') {
          dayEvents = dayEvents.filter(e => e.type === this.selectedFilter);
        }
        // Strict chronological ordering
        dayEvents = this.sortEventsChronologically(dayEvents);

        const eventsCardsHtml = dayEvents.length > 0 ? dayEvents.map(ev => {
          const color = ev.color || this.getColorForType(ev.type);
          const recurIcon = ev.isRecurring ? '<span title="Sự kiện lặp lại" style="font-size: 9.5px; margin-left: 2px;">🔁</span>' : '';
          const escapedTitle = this.escapeHtml(ev.title);
          const escapedLoc = this.escapeHtml(ev.location || '');
          return `
            <div class="week-event-card row-card" style="border-left-color: ${color}; background: ${this.hexToRgba(color, 0.12)};" onclick="window.CalendarModule.showEventDetail('${ev.originalId || ev.id}')" title="${escapedTitle}">
              <button class="week-event-del" onclick="event.stopPropagation(); window.CalendarModule.deleteEvent('${ev.originalId || ev.id}')" title="Xóa sự kiện">✕</button>
              <div class="week-event-top-row">
                <div class="week-event-time">
                  <span>⏰ ${ev.time || 'Cả ngày'}</span>
                  ${recurIcon}
                </div>
                <span class="week-event-badge" style="color: ${color};">${this.getTypeLabel(ev.type)}</span>
              </div>
              <div class="week-event-title">${escapedTitle}</div>
              ${ev.location ? `<div class="week-event-loc">📍 ${escapedLoc}</div>` : ''}
            </div>
          `;
        }).join("") : `
          <div class="week-empty-placeholder row-empty" onclick="window.CalendarModule.selectDay('${dateStr}')">
            <span>Không có lịch trình (+ Thêm)</span>
          </div>
        `;

        rowsHtml += `
          <div class="week-row-card ${isToday ? 'is-today' : ''}">
            <div class="week-row-header ${isToday ? 'is-today' : ''}">
              <div class="week-day-title">${dayNames[i].full}</div>
              <div class="week-day-date">${currDate.getDate()} thg ${currDate.getMonth() + 1}</div>
              ${isToday ? '<span class="today-badge" style="margin-top: 4px; display: inline-block;">Hôm nay 🌟</span>' : ''}
            </div>
            <div class="week-row-events">
              ${eventsCardsHtml}
              <button class="week-col-add-btn" style="min-width: 90px; height: auto;" onclick="window.CalendarModule.selectDay('${dateStr}')">+ Thêm</button>
            </div>
          </div>
        `;
      }
      weekContent.innerHTML = rowsHtml;
    }
  },

  /**
   * Navigation: Prev Month or Prev Week
   */
  prev() {
    if (this.currentView === 'month') {
      this.viewDate.setMonth(this.viewDate.getMonth() - 1);
    } else {
      this.viewDate.setDate(this.viewDate.getDate() - 7);
    }
    this.renderCalendar();
  },

  /**
   * Navigation: Next Month or Next Week
   */
  next() {
    if (this.currentView === 'month') {
      this.viewDate.setMonth(this.viewDate.getMonth() + 1);
    } else {
      this.viewDate.setDate(this.viewDate.getDate() + 7);
    }
    this.renderCalendar();
  },

  /**
   * Navigation: Go to current today
   */
  goToToday() {
    this.viewDate = new Date();
    this.renderCalendar();
  },

  /**
   * Switch between Month and Week views
   */
  switchView(view) {
    this.currentView = view;
    const btnMonth = document.getElementById("btn-view-month");
    const btnWeek = document.getElementById("btn-view-week");
    const monthContainer = document.getElementById("calendar-month-container");
    const weekContainer = document.getElementById("calendar-week-container");
    const toggleLayoutBtn = document.getElementById("btn-toggle-week-layout");

    if (view === 'month') {
      if (btnMonth) btnMonth.classList.add("active");
      if (btnWeek) btnWeek.classList.remove("active");
      if (monthContainer) monthContainer.style.display = "flex";
      if (weekContainer) weekContainer.style.display = "none";
      if (toggleLayoutBtn) toggleLayoutBtn.style.display = "none";
    } else {
      if (btnMonth) btnMonth.classList.remove("active");
      if (btnWeek) btnWeek.classList.add("active");
      if (monthContainer) monthContainer.style.display = "none";
      if (weekContainer) weekContainer.style.display = "flex";
      if (toggleLayoutBtn) toggleLayoutBtn.style.display = "inline-flex";
    }
    this.renderCalendar();
  },

  /**
   * Toggle 7 Columns vs 7 Rows in Week View
   */
  toggleWeekLayout() {
    this.weekLayout = (this.weekLayout === 'columns') ? 'rows' : 'columns';
    localStorage.setItem('mhent_cal_layout', this.weekLayout);
    const layoutText = document.getElementById("week-layout-text");
    const layoutIcon = document.getElementById("week-layout-icon");
    if (layoutText) layoutText.innerText = (this.weekLayout === 'columns') ? "7 Cột" : "7 Dòng";
    if (layoutIcon) layoutIcon.innerText = (this.weekLayout === 'columns') ? "📊" : "☰";
    if (this.currentView === 'week') {
      this.renderWeekView();
    }
  },

  /**
   * Sidebar category filter
   */
  setFilter(type, el) {
    this.selectedFilter = type;
    document.querySelectorAll('#calendar-filter-list .sidebar-nav-item').forEach(item => item.classList.remove('active'));
    if (el) el.classList.add('active');
    this.renderCalendar();
  },

  toggleAllDay(isAllDay) {
    const pickersRow = document.getElementById("event-time-pickers-row");
    const banner = document.getElementById("event-all-day-banner");
    const presets = document.getElementById("event-time-quick-presets");
    const timeInput = document.getElementById("event-time");

    if (isAllDay) {
      if (pickersRow) pickersRow.style.display = "none";
      if (presets) presets.style.display = "none";
      if (banner) banner.style.display = "block";
      if (timeInput) timeInput.value = "Cả ngày";
    } else {
      if (pickersRow) pickersRow.style.display = "flex";
      if (presets) presets.style.display = "flex";
      if (banner) banner.style.display = "none";
      this.onTimePickerChange();
    }
  },

  onTimePickerChange() {
    const isAllDay = document.getElementById("event-is-all-day")?.checked;
    const timeInput = document.getElementById("event-time");
    if (isAllDay) {
      if (timeInput) timeInput.value = "Cả ngày";
      return;
    }
    const startInput = document.getElementById("event-time-start");
    const endInput = document.getElementById("event-time-end");
    const start = startInput && startInput.value ? startInput.value : "09:00";
    const end = endInput && endInput.value ? endInput.value : "10:30";

    if (timeInput) {
      timeInput.value = `${start} - ${end}`;
    }
  },

  setTimeDuration(minutes) {
    const allDayChk = document.getElementById("event-is-all-day");
    if (allDayChk && allDayChk.checked) {
      allDayChk.checked = false;
      this.toggleAllDay(false);
    }
    const startInput = document.getElementById("event-time-start");
    const endInput = document.getElementById("event-time-end");
    const startVal = (startInput && startInput.value) ? startInput.value : "09:00";

    const parts = startVal.split(":");
    let h = parseInt(parts[0], 10) || 9;
    let m = parseInt(parts[1], 10) || 0;

    let totalM = h * 60 + m + minutes;
    let endH = Math.floor(totalM / 60) % 24;
    let endM = totalM % 60;

    const endFormatted = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    if (endInput) endInput.value = endFormatted;
    this.onTimePickerChange();
  },

  setTimeRange(start, end) {
    const allDayChk = document.getElementById("event-is-all-day");
    if (allDayChk && allDayChk.checked) {
      allDayChk.checked = false;
      this.toggleAllDay(false);
    }
    const startInput = document.getElementById("event-time-start");
    const endInput = document.getElementById("event-time-end");
    if (startInput) startInput.value = start;
    if (endInput) endInput.value = end;
    this.onTimePickerChange();
  },

  openAddModal(dateStr) {
    const editIdInput = document.getElementById("event-edit-id");
    if (editIdInput) editIdInput.value = "";

    const titleEl = document.getElementById("modal-add-event-title");
    if (titleEl) titleEl.innerText = "Thêm Sự Kiện Lịch Trình";
    const subEl = document.getElementById("modal-add-event-subtitle");
    if (subEl) subEl.innerText = "Lên kế hoạch, lịch họp hoặc lịch làm việc định kỳ";
    const btnText = document.getElementById("event-submit-btn-text");
    if (btnText) btnText.innerText = "Lưu Sự Kiện";

    const titleInput = document.getElementById("event-title");
    if (titleInput) titleInput.value = "";

    const locInput = document.getElementById("event-location");
    if (locInput) locInput.value = "";

    const dateInput = document.getElementById("event-date");
    if (dateInput) {
      dateInput.value = dateStr || this.formatDateStr(this.viewDate);
    }

    // Reset Time Pickers
    const allDayChk = document.getElementById("event-is-all-day");
    if (allDayChk) allDayChk.checked = false;
    const startInput = document.getElementById("event-time-start");
    if (startInput) startInput.value = "09:00";
    const endInput = document.getElementById("event-time-end");
    if (endInput) endInput.value = "10:30";
    this.toggleAllDay(false);

    // Reset Recurrence
    const isRecurringInput = document.getElementById("event-is-recurring");
    if (isRecurringInput) {
      isRecurringInput.checked = false;
      this.toggleRecurringFields(false);
    }
    this.setRecurrencePattern('weekly');
    this.setRecurrenceEndMode('never');
    this.updateWeekdayIndicator();
    this.updateRecurSummary();

    // Reset Color / Category
    const typeInput = document.getElementById("event-type");
    if (typeInput) typeInput.value = "meeting";
    this.setColorSelection("#8b5cf6", false);

    window.UI.openModal("modal-add-event");
  },

  openEditModal(eventId) {
    if (!eventId) return;
    const allEvents = window.store.state.events || [];
    let ev = allEvents.find(e => e.id === eventId);
    if (!ev) {
      for (const d of [this.formatDateStr(this.viewDate), this.getTodayStr()]) {
        const found = this.getEventsForDate(d).find(e => e.id === eventId || e.originalId === eventId);
        if (found) { ev = found; break; }
      }
    }
    if (!ev) return;

    // Set Edit Mode
    const editIdInput = document.getElementById("event-edit-id");
    if (editIdInput) editIdInput.value = ev.originalId || ev.id;

    const titleEl = document.getElementById("modal-add-event-title");
    if (titleEl) titleEl.innerText = "✏️ Chỉnh Sửa Sự Kiện Lịch Trình";
    const subEl = document.getElementById("modal-add-event-subtitle");
    if (subEl) subEl.innerText = "Cập nhật thông tin hoặc lịch trình của sự kiện";
    const btnText = document.getElementById("event-submit-btn-text");
    if (btnText) btnText.innerText = "Cập Nhật Sự Kiện";

    // Pre-fill Title & Date
    const titleInput = document.getElementById("event-title");
    if (titleInput) titleInput.value = ev.title || "";

    const dateInput = document.getElementById("event-date");
    if (dateInput) dateInput.value = ev.date || this.formatDateStr(this.viewDate);

    // Pre-fill Time Pickers
    const allDayChk = document.getElementById("event-is-all-day");
    const startInput = document.getElementById("event-time-start");
    const endInput = document.getElementById("event-time-end");
    const timeStr = String(ev.time || "").trim();

    if (timeStr.toLowerCase() === "cả ngày" || timeStr.toLowerCase() === "all day" || !timeStr) {
      if (allDayChk) allDayChk.checked = true;
      this.toggleAllDay(true);
    } else {
      if (allDayChk) allDayChk.checked = false;
      this.toggleAllDay(false);
      if (timeStr.includes("-")) {
        const parts = timeStr.split("-");
        if (startInput) startInput.value = parts[0].trim();
        if (endInput) endInput.value = parts[1].trim();
      } else {
        if (startInput) startInput.value = timeStr;
        if (endInput) endInput.value = timeStr;
      }
      this.onTimePickerChange();
    }

    // Pre-fill Recurrence
    const isRecurringInput = document.getElementById("event-is-recurring");
    if (isRecurringInput) {
      isRecurringInput.checked = !!ev.isRecurring;
      this.toggleRecurringFields(ev.isRecurring);
    }
    if (ev.isRecurring) {
      this.setRecurrencePattern(ev.recurrencePattern || 'weekly');
      if (ev.recurrenceEnd) {
        this.setRecurrenceEndMode('until');
        const recEndInput = document.getElementById("event-recurrence-end");
        if (recEndInput) recEndInput.value = ev.recurrenceEnd;
      } else {
        this.setRecurrenceEndMode('never');
      }
    } else {
      this.setRecurrencePattern('weekly');
      this.setRecurrenceEndMode('never');
    }
    this.updateWeekdayIndicator();
    this.updateRecurSummary();

    // Pre-fill Type & Color
    const typeInput = document.getElementById("event-type");
    const evType = ev.type || "meeting";
    if (typeInput) typeInput.value = evType;

    const evColor = ev.color || this.getColorForType(evType);
    const presets = ["#8b5cf6", "#ef4444", "#10b981", "#f59e0b", "#3b82f6", "#ec4899"];
    const isCustom = !presets.includes(String(evColor).toLowerCase());
    this.setColorSelection(evColor, isCustom);

    // Pre-fill Location
    const locInput = document.getElementById("event-location");
    if (locInput) locInput.value = ev.location || "";

    // Close detail modal if open & open edit modal
    window.UI.closeModal("modal-event-detail");
    window.UI.openModal("modal-add-event");
  },

  selectDay(dateStr) {
    this.openAddModal(dateStr);
  },

  onEventTypeChange(type) {
    const color = this.getColorForType(type);
    this.setColorSelection(color, false);
  },

  setColorSelection(color, isCustom = false) {
    this.selectedModalColor = color || "#8b5cf6";
    this.isCustomColorSelected = !!isCustom;

    // 1. Preset radios
    let foundPreset = false;
    document.querySelectorAll('.color-swatch-item').forEach(swatch => {
      const radio = swatch.querySelector('input');
      if (radio && radio.value.toLowerCase() === String(color).toLowerCase() && !isCustom) {
        radio.checked = true;
        swatch.classList.add('active');
        foundPreset = true;
      } else {
        if (radio && !isCustom) radio.checked = false;
        swatch.classList.remove('active');
      }
    });

    // 2. Custom color swatch
    const customSwatch = document.querySelector('.color-custom-swatch');
    const customInput = document.getElementById('event-custom-color');
    if (customInput) {
      customInput.value = color;
    }

    if (customSwatch) {
      if (isCustom || !foundPreset) {
        this.isCustomColorSelected = true;
        customSwatch.classList.add('active');
        customSwatch.style.borderColor = color;
        customSwatch.style.boxShadow = `0 0 14px ${this.hexToRgba(color, 0.45)}`;
      } else {
        customSwatch.classList.remove('active');
        customSwatch.style.borderColor = '';
        customSwatch.style.boxShadow = '';
      }
    }
  },

  updateColorPillChoices(val, isCustom = false) {
    this.setColorSelection(val, isCustom);
  },

  /**
   * Save event (Supports both Create and Edit)
   */
  async saveEvent() {
    const editIdInput = document.getElementById("event-edit-id");
    const editId = editIdInput ? editIdInput.value : "";

    const titleInput = document.getElementById("event-title");
    const dateInput = document.getElementById("event-date");
    const timeInput = document.getElementById("event-time");
    const typeInput = document.getElementById("event-type");
    const locInput = document.getElementById("event-location");

    if (!titleInput || !titleInput.value.trim() || !dateInput || !dateInput.value) {
      window.UI.showToast("Vui lòng nhập tên và ngày sự kiện!", "", "warning");
      return;
    }

    // Color extraction from clean state
    let selectedColor = this.selectedModalColor || "#8b5cf6";
    if (this.isCustomColorSelected) {
      const customColorInput = document.getElementById("event-custom-color");
      if (customColorInput && customColorInput.value) {
        selectedColor = customColorInput.value;
      }
    } else {
      const checkedRadio = document.querySelector('input[name="event-color-pick"]:checked');
      if (checkedRadio) {
        selectedColor = checkedRadio.value;
      } else if (typeInput) {
        selectedColor = this.getColorForType(typeInput.value);
      }
    }

    // Recurring event fields
    const isRecurringInput = document.getElementById("event-is-recurring");
    const patternInput = document.getElementById("event-recurrence-pattern");
    const endInput = document.getElementById("event-recurrence-end");

    const isRecurring = isRecurringInput ? isRecurringInput.checked : false;
    const recurrencePattern = (isRecurring && patternInput) ? patternInput.value : "none";
    const recurrenceEnd = (isRecurring && endInput && endInput.value) ? endInput.value.trim() : "";

    const timeVal = (timeInput && timeInput.value.trim()) ? timeInput.value.trim() : "Cả ngày";

    if (editId) {
      // UPDATE EXISTING EVENT
      const events = window.store.state.events || [];
      const idx = events.findIndex(e => e.id === editId || e.originalId === editId);
      const existing = idx !== -1 ? events[idx] : {};

      const updatedEvent = {
        ...existing,
        id: editId,
        title: titleInput.value.trim(),
        date: dateInput.value,
        time: timeVal,
        type: typeInput ? typeInput.value : "meeting",
        color: selectedColor,
        location: locInput ? locInput.value.trim() : "",
        isRecurring: isRecurring,
        recurrencePattern: recurrencePattern,
        recurrenceEnd: recurrenceEnd,
        updatedAt: new Date().toISOString()
      };

      if (idx !== -1) {
        events[idx] = updatedEvent;
      } else {
        events.push(updatedEvent);
      }
      window.store.save();

      if (window.CloudModule) {
        await window.CloudModule.createCalendarEvent(updatedEvent);
      }

      this.renderCalendar();
      window.UI.closeModal("modal-add-event");
      window.UI.showToast("Đã cập nhật sự kiện thành công! 📅", updatedEvent.title, "success");
    } else {
      // CREATE NEW EVENT
      const newEvent = {
        id: "ev-" + Date.now(),
        title: titleInput.value.trim(),
        date: dateInput.value,
        time: timeVal,
        type: typeInput ? typeInput.value : "meeting",
        color: selectedColor,
        location: locInput ? locInput.value.trim() : "",
        isRecurring: isRecurring,
        recurrencePattern: recurrencePattern,
        recurrenceEnd: recurrenceEnd,
        createdAt: new Date().toISOString()
      };

      window.store.addEvent(newEvent);

      if (window.CloudModule) {
        await window.CloudModule.createCalendarEvent(newEvent);
      }

      this.renderCalendar();
      window.UI.closeModal("modal-add-event");
      window.UI.showToast("Đã lưu sự kiện thành công! 📅", newEvent.title, "success");
    }

    // Reset inputs
    if (editIdInput) editIdInput.value = "";
    titleInput.value = "";
    if (locInput) locInput.value = "";
    if (isRecurringInput) {
      isRecurringInput.checked = false;
      this.toggleRecurringFields(false);
    }
    this.setRecurrenceEndMode('never');
    this.setRecurrencePattern('weekly');
    if (endInput) endInput.value = "";
  },

  /**
   * Delete an event
   */
  async deleteEvent(eventId) {
    if (!eventId) return;
    const allEvents = window.store.state.events || [];
    const ev = allEvents.find(e => e.id === eventId);
    const isRecur = ev && ev.isRecurring;

    const confirmMsg = isRecur 
      ? `Đây là sự kiện lặp lại [${ev.title}]. Bạn có muốn xóa toàn bộ chuỗi lịch lặp này?`
      : `Bạn có chắc chắn muốn xóa sự kiện [${ev ? ev.title : ''}] này?`;

    const ok = await window.showConfirmPopup(
      isRecur ? "Xóa Chuỗi Lịch Lặp Lại 🔁" : "Xác Nhận Xóa Sự Kiện 🗑️",
      confirmMsg
    );
    if (!ok) return;

    // 1. Local Store
    window.store.deleteEvent(eventId);

    // 2. Cloud Firestore & Supabase
    if (window.CloudModule) {
      await window.CloudModule.deleteCalendarEvent(eventId);
    }

    this.renderCalendar();
    window.UI.showToast("Đã xóa sự kiện 🗑️", "Lịch trình đã được cập nhật.", "info");
  },

  /**
   * Event detail popup modal (Xem, Sửa & Xóa sự kiện)
   */
  showEventDetail(eventId) {
    const events = window.store.state.events || [];
    let ev = events.find(e => e.id === eventId);
    if (!ev) {
      for (const d of [this.formatDateStr(this.viewDate), this.getTodayStr()]) {
        const found = this.getEventsForDate(d).find(e => e.id === eventId || e.originalId === eventId);
        if (found) { ev = found; break; }
      }
    }
    if (!ev) return;

    const realId = ev.originalId || ev.id;
    const color = ev.color || this.getColorForType(ev.type);

    // Accent line
    const accent = document.getElementById("event-detail-accent");
    if (accent) {
      accent.style.background = `linear-gradient(90deg, ${color}, #8b5cf6)`;
      accent.style.boxShadow = `0 0 16px ${color}`;
    }

    // Title
    const titleEl = document.getElementById("event-detail-title");
    if (titleEl) titleEl.innerText = ev.title;

    // Type Badge
    const typeBadge = document.getElementById("event-detail-type-badge");
    if (typeBadge) {
      typeBadge.innerText = this.getTypeLabel(ev.type);
      typeBadge.style.color = color;
      typeBadge.style.borderColor = color;
      typeBadge.style.background = this.hexToRgba(color, 0.15);
    }

    // Recur Badge
    const recurBadge = document.getElementById("event-detail-recur-badge");
    if (recurBadge) {
      recurBadge.style.display = ev.isRecurring ? "inline-flex" : "none";
    }

    // Date
    const dateEl = document.getElementById("event-detail-date");
    if (dateEl) {
      const parts = String(ev.instanceDate || ev.date).split("-");
      if (parts.length === 3) {
        dateEl.innerText = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        dateEl.innerText = ev.date;
      }
    }

    // Time
    const timeEl = document.getElementById("event-detail-time");
    if (timeEl) timeEl.innerText = ev.time || "Cả ngày";

    // Location
    const locEl = document.getElementById("event-detail-location");
    if (locEl) locEl.innerText = ev.location || "Chưa có thông tin địa điểm";

    // Recurrence row
    const recurRow = document.getElementById("event-detail-recur-row");
    const recurDesc = document.getElementById("event-detail-recur-desc");
    if (recurRow && recurDesc) {
      if (ev.isRecurring) {
        recurRow.style.display = "flex";
        let pat = "Hàng tuần";
        if (ev.recurrencePattern === "daily") pat = "Hàng ngày (Mỗi ngày)";
        else if (ev.recurrencePattern === "weekdays") pat = "Thứ 2 đến Thứ 6 (Ngày làm việc)";
        else if (ev.recurrencePattern === "monthly") pat = "Hàng tháng";

        const limit = ev.recurrenceEnd ? ` (đến ${ev.recurrenceEnd})` : " (vô hạn)";
        recurDesc.innerText = `${pat}${limit}`;
      } else {
        recurRow.style.display = "none";
      }
    }

    // Actions
    const delBtn = document.getElementById("event-detail-delete-btn");
    if (delBtn) {
      delBtn.onclick = () => {
        window.UI.closeModal("modal-event-detail");
        this.deleteEvent(realId);
      };
    }

    const editBtn = document.getElementById("event-detail-edit-btn");
    if (editBtn) {
      editBtn.onclick = () => {
        this.openEditModal(realId);
      };
    }

    window.UI.openModal("modal-event-detail");
  },

  findCommonFreeTime() {
    window.UI.showToast(
      "AISA Khảo Sát Lịch Trình Team 🌸", 
      "AISA đã quét toàn bộ lịch của các thành viên. Khung giờ rảnh lý tưởng nhất: Thứ Sáu tuần này từ 15:30 - 17:00.", 
      "info"
    );
  }
};
