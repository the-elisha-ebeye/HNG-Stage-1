const STORAGE_KEY = "velvet-tasks";

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const priorityInput = document.querySelector("#priority-input");
const recurrenceInput = document.querySelector("#recurrence-input");
const scheduleInput = document.querySelector("#schedule-input");
const reminderInput = document.querySelector("#reminder-input");
const taskList = document.querySelector("#task-list");
const taskCount = document.querySelector("#task-count");
const emptyState = document.querySelector("#empty-state");
const emptyTitle = document.querySelector("#empty-title");
const emptyDescription = document.querySelector("#empty-description");
const filterButtons = document.querySelectorAll(".filter-button");
const clearCompletedButton = document.querySelector("#clear-completed");
const dateDisplay = document.querySelector("#date-display");
const sortSelect = document.querySelector("#sort-select");
const progressBar = document.querySelector("#progress-bar");
const progressSummary = document.querySelector("#progress-summary");
const streakValue = document.querySelector("#streak-value");
const streakLabel = document.querySelector("#streak-label");
const COMPLETION_KEY = "velvet-completions";

let tasks = loadTasks().map((task, index) => ({
  ...task,
  priority: task.priority || "none",
  progress: typeof task.progress === "number" ? Math.min(100, Math.max(0, task.progress)) : (task.completed ? 100 : 0),
  createdAt: task.createdAt || Date.now() - index,
  recurrence: task.recurrence || "none",
  scheduledAt: task.scheduledAt || null,
  scheduledTime: task.scheduledTime || (task.scheduledAt ? new Date(task.scheduledAt).toTimeString().slice(0, 5) : ""),
  reminder: task.reminder === true,
  completedAt: task.completedAt || null,
}));
let currentFilter = "all";
let currentSort = "manual";
let completionDates = loadCompletionDates();

dateDisplay.textContent = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "short",
  day: "numeric",
}).format(new Date());
scheduleInput.value = new Date().toTimeString().slice(0, 5);

function loadTasks() {
  try {
    const savedTasks = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(savedTasks) ? savedTasks : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function createTaskId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isDue(task) {
  return !task.scheduledAt || new Date(task.scheduledAt).getTime() <= Date.now();
}

function formatScheduledTime(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function loadCompletionDates() {
  try {
    const savedDates = JSON.parse(localStorage.getItem(COMPLETION_KEY));
    return Array.isArray(savedDates) ? savedDates : [];
  } catch {
    return [];
  }
}

function saveCompletionDates() {
  localStorage.setItem(COMPLETION_KEY, JSON.stringify(completionDates));
}

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStreak() {
  const completedDays = new Set(completionDates);
  const cursor = new Date();
  let streak = 0;
  while (completedDays.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function addNextRecurringTask(task) {
  if (task.recurrence === "none") return;
  const nextDate = new Date();
  const [hours, minutes] = (task.scheduledTime || nextDate.toTimeString().slice(0, 5)).split(":").map(Number);
  nextDate.setHours(hours, minutes, 0, 0);
  if (task.recurrence === "daily") nextDate.setDate(nextDate.getDate() + 1);
  if (task.recurrence === "weekly") nextDate.setDate(nextDate.getDate() + 7);
  if (task.recurrence === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
  tasks.unshift({
    ...task,
    id: createTaskId(),
    completed: false,
    progress: 0,
    completedAt: null,
    scheduledAt: nextDate.toISOString(),
    scheduledTime: task.scheduledTime || "",
    reminder: task.reminder,
    createdAt: nextDate.getTime(),
  });
}

function renderStats() {
  const completed = tasks.filter((task) => task.progress === 100).length;
  const total = tasks.length;
  const percent = total ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / total) : 0;
  const streak = getStreak();
  progressBar.style.width = `${percent}%`;
  progressSummary.textContent = `${percent}% overall progress · ${completed} of ${total} complete`;
  streakValue.textContent = `${streak} ${streak === 1 ? "day" : "days"}`;
  streakLabel.textContent = streak ? "Keep it going today" : "Complete a task to start your streak";
}

function visibleTasks() {
  const filtered = tasks.filter((task) => {
    if (!isDue(task)) return false;
    if (currentFilter === "active") return task.progress < 100;
    if (currentFilter === "completed") return task.progress === 100;
    return true;
  });

  if (currentSort === "priority") {
    const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
    return [...filtered].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }
  if (currentSort === "alphabetical") return [...filtered].sort((a, b) => a.text.localeCompare(b.text));
  if (currentSort === "newest") return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
  return filtered;
}

function render() {
  const visible = visibleTasks();
  taskList.replaceChildren();
  visible.forEach((task) => taskList.append(createTaskElement(task)));

  const remaining = tasks.filter((task) => task.progress < 100 && isDue(task)).length;
  taskCount.textContent = `${remaining} ${remaining === 1 ? "task" : "tasks"} left`;
  emptyState.classList.toggle("hidden", visible.length > 0);

  if (currentFilter === "completed") {
    emptyTitle.textContent = "Nothing completed yet.";
    emptyDescription.textContent = "Finish a task and it will appear here.";
  } else if (currentFilter === "active") {
    emptyTitle.textContent = "You're all caught up.";
    emptyDescription.textContent = "Enjoy the space, or add another task.";
  } else {
    emptyTitle.textContent = "Your list is clear.";
    emptyDescription.textContent = "Add something small to get started.";
  }
  renderStats();
}

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = `task-item${task.progress === 100 ? " completed" : ""}${task.priority !== "none" ? ` priority-${task.priority}` : ""}`;
  item.dataset.id = task.id;
  item.draggable = currentSort === "manual";
  item.addEventListener("dragstart", (event) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
    item.classList.add("dragging");
  });
  item.addEventListener("dragend", () => item.classList.remove("dragging"));
  item.addEventListener("dragover", (event) => {
    if (currentSort !== "manual") return;
    event.preventDefault();
    item.classList.add("drag-over");
  });
  item.addEventListener("dragleave", () => item.classList.remove("drag-over"));
  item.addEventListener("drop", (event) => {
    event.preventDefault();
    item.classList.remove("drag-over");
    reorderTasks(event.dataTransfer.getData("text/plain"), task.id);
  });

  const progressControl = document.createElement("div");
  progressControl.className = "progress-control";
  const progressInput = document.createElement("input");
  progressInput.className = "task-progress";
  progressInput.type = "range";
  progressInput.min = "0";
  progressInput.max = "100";
  progressInput.step = "5";
  progressInput.value = String(task.progress);
  progressInput.setAttribute("aria-label", `Progress for "${task.text}"`);
  const progressValue = document.createElement("output");
  progressValue.className = "progress-value";
  progressValue.textContent = `${task.progress}%`;
  progressInput.addEventListener("input", () => {
    task.progress = Number(progressInput.value);
    progressValue.textContent = `${task.progress}%`;
    item.classList.toggle("completed", task.progress === 100);
  });
  progressInput.addEventListener("change", () => {
    const reachedCompletion = task.progress === 100 && !task.completed;
    task.completed = task.progress === 100;
    if (reachedCompletion) {
      task.completedAt = Date.now();
      const today = dateKey();
      if (!completionDates.includes(today)) completionDates.push(today);
      addNextRecurringTask(task);
    } else if (task.progress < 100) {
      task.completedAt = null;
    }
    saveCompletionDates();
    saveTasks();
    render();
  });
  progressControl.append(progressInput, progressValue);

  const text = document.createElement("p");
  text.className = "task-text";
  text.textContent = task.text;

  const details = document.createElement("div");
  details.className = "task-details";
  if (task.priority !== "none") {
    const priority = document.createElement("span");
    priority.className = `priority-label priority-${task.priority}`;
    priority.textContent = `${task.priority} priority`;
    details.append(priority);
  }
  if (task.recurrence !== "none") {
    const recurrence = document.createElement("span");
    recurrence.className = "tag-label recurrence-label";
    recurrence.textContent = `↻ ${task.recurrence}`;
    details.append(recurrence);
  }
  if (task.scheduledTime) {
    const scheduled = document.createElement("span");
    scheduled.className = "recurrence-label";
    scheduled.textContent = `at ${task.scheduledTime}`;
    details.append(scheduled);
  }

  const remove = document.createElement("button");
  remove.className = "delete-button";
  remove.type = "button";
  remove.setAttribute("aria-label", `Delete "${task.text}"`);
  remove.textContent = "×";
  remove.addEventListener("click", () => {
    tasks = tasks.filter((itemTask) => itemTask.id !== task.id);
    saveTasks();
    render();
  });

  const content = document.createElement("div");
  content.className = "task-content";
  content.append(text, details);
  item.append(progressControl, content, remove);
  return item;
}

function reorderTasks(draggedId, targetId) {
  if (!draggedId || draggedId === targetId) return;
  const visibleIds = visibleTasks().map((task) => task.id);
  const fromIndex = visibleIds.indexOf(draggedId);
  const toIndex = visibleIds.indexOf(targetId);
  if (fromIndex === -1 || toIndex === -1) return;
  visibleIds.splice(fromIndex, 1);
  visibleIds.splice(toIndex, 0, draggedId);
  const orderedVisibleTasks = visibleIds.map((id) => tasks.find((task) => task.id === id));
  let visibleIndex = 0;
  tasks = tasks.map((task) => visibleIds.includes(task.id) ? orderedVisibleTasks[visibleIndex++] : task);
  saveTasks();
  render();
  setInterval(() => {
    render();
    checkReminders();
  }, 30000);
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;

  tasks.unshift({
    id: createTaskId(),
    text,
    completed: false,
    progress: 0,
    priority: priorityInput.value,
    recurrence: recurrenceInput.value,
    scheduledAt: null,
    scheduledTime: scheduleInput.value,
    reminder: reminderInput.checked,
    createdAt: Date.now(),
  });
  taskInput.value = "";
  priorityInput.value = "none";
  recurrenceInput.value = "none";
  scheduleInput.value = new Date().toTimeString().slice(0, 5);
  reminderInput.checked = false;
  if (tasks[0].reminder) requestReminderPermission();
  saveTasks();
  currentFilter = "all";
  filterButtons.forEach((button) => button.classList.toggle("active", button.dataset.filter === "all"));
  render();

  taskInput.focus();
});

async function requestReminderPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "default") await Notification.requestPermission();
  return Notification.permission === "granted";
}

function checkReminders() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const currentTime = new Date().toTimeString().slice(0, 5);
  tasks.forEach((task) => {
    if (task.reminder && task.progress < 100 && task.scheduledTime === currentTime && task.lastReminderDate !== dateKey()) {
      new Notification("HNG-Elisha reminder", { body: task.text });
      task.lastReminderDate = dateKey();
      saveTasks();
    }
  });
}

sortSelect.addEventListener("change", () => {
  currentSort = sortSelect.value;
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((filterButton) => filterButton.classList.toggle("active", filterButton === button));
    render();
  });
});

clearCompletedButton.addEventListener("click", () => {
  tasks = tasks.filter((task) => task.progress < 100);
  saveTasks();
  render();
});

render();
