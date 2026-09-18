/**
 * MHENT WORKSPACE - TODO KANBAN MODULE (SUPABASE & FIRESTORE CLOUD ENABLED)
 */
window.TodoModule = {
  init() {
    this.populateAssignees();
    this.renderBoard();
    this.bindEvents();
  },

  populateAssignees() {
    const select = document.getElementById("task-assignee");
    if (!select) return;
    const members = (window.store && window.store.state && window.store.state.members) ? window.store.state.members : [];
    if (members.length === 0) {
      const user = (window.store && window.store.state && window.store.state.currentUser) ? window.store.state.currentUser : { name: "Master Yurika", role: "master" };
      select.innerHTML = `<option value="${user.name}">${user.name} (${user.role === 'master' ? 'Master' : 'Thành viên'})</option>`;
      return;
    }
    select.innerHTML = members.map(m => `
      <option value="${m.name}">${m.name} (${m.role === 'master' ? 'Master' : 'Thành viên'})</option>
    `).join("");
  },

  bindEvents() {
    const addBtn = document.getElementById("btn-add-task");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        this.populateAssignees();
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

    const countTodo = document.getElementById("count-todo");
    const countProg = document.getElementById("count-progress");
    const countDone = document.getElementById("count-done");

    if (countTodo) countTodo.textContent = todoTasks.length;
    if (countProg) countProg.textContent = progressTasks.length;
    if (countDone) countDone.textContent = doneTasks.length;

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

    // Quick action buttons depending on status
    let actionButtons = "";
    if (task.status === "todo") {
      actionButtons = `
        <button class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 3px 8px;" onclick="window.TodoModule.moveTask('${task.id}', 'in-progress')" title="Bắt đầu làm">▶️ Làm</button>
        <button class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 3px 8px;" onclick="window.TodoModule.moveTask('${task.id}', 'done')" title="Hoàn tất">✅ Xong</button>
      `;
    } else if (task.status === "in-progress") {
      actionButtons = `
        <button class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 3px 8px;" onclick="window.TodoModule.moveTask('${task.id}', 'todo')" title="Về Cần làm">⏪ Trả về</button>
        <button class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 3px 8px;" onclick="window.TodoModule.moveTask('${task.id}', 'done')" title="Hoàn tất">✅ Xong</button>
      `;
    } else {
      actionButtons = `
        <button class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 3px 8px;" onclick="window.TodoModule.moveTask('${task.id}', 'todo')" title="Làm lại">🔄 Làm lại</button>
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
        <div class="card-footer" style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 8px; font-size: 11.5px; color: var(--text-muted);">
            <span>👤 ${task.assignee || 'Tôi'}</span>
            <span>📅 ${task.deadline || 'Không hạn'}</span>
          </div>
          <div style="display: flex; gap: 4px; align-items: center;">
            ${actionButtons}
            <button class="btn btn-ghost btn-sm" style="padding: 2px 6px; font-size: 12px; color: var(--text-muted);" onclick="window.TodoModule.deleteTask('${task.id}')" title="Xóa task">🗑️</button>
          </div>
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
      col.addEventListener("drop", async (e) => {
        e.preventDefault();
        col.style.background = "";
        const taskId = e.dataTransfer.getData("text/plain");
        const targetStatus = col.getAttribute("data-status");
        if (taskId && targetStatus) {
          this.moveTask(taskId, targetStatus);
        }
      });
    });
  },

  async moveTask(taskId, newStatus) {
    if (window.CloudModule) {
      await window.CloudModule.updateTaskStatus(taskId, newStatus);
    } else {
      window.store.updateTaskStatus(taskId, newStatus);
    }
    this.renderBoard();
    window.UI.showToast("Cập nhật trạng thái thành công! ⚡", `Trạng thái: ${newStatus.toUpperCase()}`, "info");
  },

  async deleteTask(taskId) {
    if (confirm("Cậu có chắc muốn xóa nhiệm vụ này không?")) {
      if (window.CloudModule) {
        await window.CloudModule.deleteTask(taskId);
      } else {
        window.store.deleteTask(taskId);
      }
      this.renderBoard();
      window.UI.showToast("Đã xóa nhiệm vụ!", "", "info");
    }
  },

  async saveNewTask() {
    const titleInput = document.getElementById("task-title");
    const descInput = document.getElementById("task-desc");
    const assigneeInput = document.getElementById("task-assignee");
    const priorityInput = document.getElementById("task-priority");
    const deadlineInput = document.getElementById("task-deadline");

    if (!titleInput || !titleInput.value.trim()) return;

    let aiRemark = "";
    if (priorityInput && priorityInput.value === "urgent") {
      aiRemark = "Echo: Nhiệm vụ khẩn cấp đấy, tập trung làm ngay đi!";
    } else {
      aiRemark = "Harmony: Chúc Master và team hoàn thành task thật tốt nha!";
    }

    const newTask = {
      id: "task-" + Date.now(),
      title: titleInput.value.trim(),
      desc: descInput ? descInput.value.trim() : "",
      status: "todo",
      priority: priorityInput ? priorityInput.value : "normal",
      assignee: assigneeInput ? assigneeInput.value : window.store.state.currentUser.name,
      deadline: (deadlineInput && deadlineInput.value) ? deadlineInput.value : "2026-08-30",
      remark: aiRemark
    };

    if (window.CloudModule) {
      await window.CloudModule.pushTask(newTask);
    } else {
      window.store.addTask(newTask);
    }

    this.renderBoard();
    window.UI.closeModal("modal-add-task");

    titleInput.value = "";
    if (descInput) descInput.value = "";

    window.UI.showToast("Đã lưu Task lên Cloud Supabase! 📋", newTask.title, "success");
  }
};
