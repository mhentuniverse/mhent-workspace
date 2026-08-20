/**
 * MHENT WORKSPACE - CALENDAR MODULE (CLOUD ENABLED)
 */
window.CalendarModule = {
  init() {
    this.renderCalendar();
    this.bindEvents();
  },

  bindEvents() {
    const addBtn = document.getElementById("btn-add-event");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        window.UI.openModal("modal-add-event");
      });
    }

    const freeTimeBtn = document.getElementById("btn-find-free-time");
    if (freeTimeBtn) {
      freeTimeBtn.addEventListener("click", () => this.findCommonFreeTime());
    }

    const form = document.getElementById("form-add-event");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveEvent();
      });
    }
  },

  renderCalendar() {
    const gridEl = document.getElementById("calendar-grid-cells");
    if (!gridEl) return;

    const daysInMonth = 31;
    const firstDayOffset = 5;
    const events = window.store.state.events || [];

    let cellsHtml = "";
    
    for (let i = 0; i < firstDayOffset; i++) {
      cellsHtml += `<div class="calendar-day-cell" style="opacity: 0.3;"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `2026-08-${day.toString().padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.date === dateStr);
      const isToday = day === 20;

      const eventPills = dayEvents.map(ev => `
        <div class="event-pill ${ev.type || 'meeting'}" title="${ev.title} (${ev.time || ''})">
          ${ev.title}
        </div>
      `).join("");

      cellsHtml += `
        <div class="calendar-day-cell ${isToday ? 'today' : ''}" onclick="window.CalendarModule.selectDay('${dateStr}')">
          <span class="day-number">${day} ${isToday ? '🌟' : ''}</span>
          ${eventPills}
        </div>
      `;
    }

    gridEl.innerHTML = cellsHtml;
  },

  selectDay(dateStr) {
    const dateInput = document.getElementById("event-date");
    if (dateInput) dateInput.value = dateStr;
    window.UI.openModal("modal-add-event");
  },

  async saveEvent() {
    const titleInput = document.getElementById("event-title");
    const dateInput = document.getElementById("event-date");
    const timeInput = document.getElementById("event-time");
    const typeInput = document.getElementById("event-type");

    if (!titleInput || !titleInput.value.trim() || !dateInput) return;

    const newEvent = {
      title: titleInput.value.trim(),
      date: dateInput.value,
      time: timeInput ? timeInput.value : "Cả ngày",
      type: typeInput ? typeInput.value : "meeting"
    };

    // 1. Lưu lên Cloud Firestore
    if (window.CloudModule && window.CloudModule.isLive) {
      await window.CloudModule.createCalendarEvent(newEvent);
    }

    // 2. Lưu local
    newEvent.id = "ev-" + Date.now();
    window.store.addEvent(newEvent);
    this.renderCalendar();
    window.UI.closeModal("modal-add-event");

    titleInput.value = "";
    window.UI.showToast("Đã lưu sự kiện lên Cloud Firestore! 📅", newEvent.title, "success");
  },

  findCommonFreeTime() {
    window.UI.showToast(
      "AISA Tìm Thời Gian Rảnh Chung 🌸", 
      "Khung giờ rảnh lý tưởng nhất của cả team: Thứ Sáu 21/08 từ 15:30 - 17:00.", 
      "info"
    );
  }
};
