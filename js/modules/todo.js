/**
 * MHENT WORKSPACE - TODO KANBAN MODULE
 */
window.TodoModule = {
  init() {
    this.renderBoard();
    this.bindEvents();
  },

  bindEvents() {
    const addBtn = document.getElementById("btn-add-task");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        window.UI.openModal("modal-add-task");
      });
    }

    const form = document.getElementById("form-add-task");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveNewTask();
      });
    }
  },

  renderBoard() {
    const tasks = window.store.state.tasks || [];

    const todoCol = document.getElementById("col-todo-cards");
    const progressCol = document.getElementById("col-progress-cards");
    const doneCol = document.getElementById("col-done-cards");

    if (!todoCol || !progressCol || !doneCol) return;

    const todoTasks = tasks.filter(t => t.status === "todo");
    const progressTasks = tasks.filter(t => t.status === "in-progress");
    const doneTasks = tasks.filter(t => t.status === "done");

    document.getElementById("count-todo").textContent = todoTasks.length;
    document.getElementById("count-progress").textContent = progressTasks.length;
    document.getElementById("count-done").textContent = doneTasks.length;

    todoCol.innerHTML = todoTasks.map(t => this.renderCard(t)).join("");
    progressCol.innerHTML = progressTasks.map(t => this.renderCard(t)).join("");
    doneCol.innerHTML = doneTasks.map(t => this.renderCard(t)).join("");

    this.setupDragAndDrop();
  },

  renderCard(task) {
    let priorityBadge = "";
    if (task.priority === "urgent") priorityBadge = `<span class="badge badge-danger">Khẩn cấp</span>`;
    else if (task.priority === "high") priorityBadge = `<span class="badge badge-warning">Ưu tiên cao</span>`;
    else priorityBadge = `<span class="badge badge-primary">Bình thường</span>`;

    let remarkHtml = "";
    if (task.remark) {
      const isHarmony = task.remark.toLowerCase().includes("harmony");
      const isEcho = task.remark.toLowerCase().includes("echo");
      const remarkClass = isHarmony ? "harmony" : (isEcho ? "echo" : "");
      const icon = isHarmony ? "🌸" : (isEcho ? "😈" : "✨");
      remarkHtml = `
        <div class="card-aisa-remark ${remarkClass}">
          <span>${icon}</span>
          <span>${task.remark}</span>
        </div>
      `;
    }

    return `
      <div class="kanban-card" draggable="true" data-id="${task.id}" id="${task.id}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="card-title">${task.title}</div>
          ${priorityBadge}
        </div>
        <div class="card-desc">${task.desc || ''}</div>
        ${remarkHtml}
        <div class="card-footer">
          <span>👤 ${task.assignee}</span>
          <span>📅 ${task.deadline || 'Không hạn'}</span>
        </div>
      </div>
    `;
  },

  setupDragAndDrop() {
    const cards = document.querySelectorAll(".kanban-card");
    const columns = document.querySelectorAll(".kanban-cards-area");

    cards.forEach(card => {
      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", card.getAttribute("data-id"));
        setTimeout(() => card.style.opacity = "0.5", 0);
      });
      card.addEventListener("dragend", () => {
        card.style.opacity = "1";
      });
    });

    columns.forEach(col => {
      col.addEventListener("dragover", (e) => {
        e.preventDefault();
        col.style.background = "var(--bg-surface-hover)";
      });
      col.addEventListener("dragleave", () => {
        col.style.background = "";
      });
      col.addEventListener("drop", (e) => {
        e.preventDefault();
        col.style.background = "";
        const taskId = e.dataTransfer.getData("text/plain");
        const targetStatus = col.getAttribute("data-status");
        if (taskId && targetStatus) {
          window.store.updateTaskStatus(taskId, targetStatus);
          this.renderBoard();
          window.UI.showToast("Đã chuyển trạng thái Task!", `Chuyển sang: ${targetStatus.toUpperCase()}`, "info");
        }
      });
    });
  },

  saveNewTask() {
    const titleInput = document.getElementById("task-title");
    const descInput = document.getElementById("task-desc");
    const assigneeInput = document.getElementById("task-assignee");
    const priorityInput = document.getElementById("task-priority");
    const deadlineInput = document.getElementById("task-deadline");

    if (!titleInput || !titleInput.value.trim()) return;

    // AI automatic remark generation based on priority
    let aiRemark = "";
    if (priorityInput.value === "urgent") {
      aiRemark = "Echo: Nhiệm vụ khẩn cấp đấy, tập trung làm ngay đi!";
    } else {
      aiRemark = "Harmony: Chúc Master và team hoàn thành task thật tốt nha!";
    }

    const newTask = {
      id: "task-" + Date.now(),
      title: titleInput.value.trim(),
      desc: descInput.value.trim(),
      status: "todo",
      priority: priorityInput.value,
      assignee: assigneeInput.value,
      deadline: deadlineInput.value || "2026-08-30",
      remark: aiRemark
    };

    window.store.addTask(newTask);
    this.renderBoard();
    window.UI.closeModal("modal-add-task");

    titleInput.value = "";
    descInput.value = "";

    window.UI.showToast("Đã tạo công việc mới! 📋", newTask.title, "success");
  }
};
