// Pro Todo App with Calendar
let tasks = [];
let currentFilter = 'all';
let currentCategory = 'all';
let editingId = null;
let currentView = 'list';
let currentDate = new Date();
let selectedTasks = new Set();
let searchQuery = '';
let isDarkMode = localStorage.getItem('darkMode') === 'true';

// DOM Elements
const taskInput = document.getElementById('taskInput');
const dueDateInput = document.getElementById('dueDateInput');
const categorySelect = document.getElementById('categorySelect');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const addBtn = document.getElementById('addBtn');
const tasksList = document.getElementById('tasksList');
const calendarView = document.getElementById('calendarView');
const emptyState = document.getElementById('emptyState');
const totalTasksEl = document.getElementById('totalTasks');
const completedTasksEl = document.getElementById('completedTasks');
const streakEl = document.getElementById('streakDays');
const filterBtns = document.querySelectorAll('.filter-btn');
const categoryBtns = document.querySelectorAll('.category-btn');
const viewBtns = document.querySelectorAll('.view-btn');
const clearBtn = document.getElementById('clearCompleted');
const calendarGrid = document.getElementById('calendarGrid');
const currentMonthEl = document.getElementById('currentMonth');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const darkModeToggle = document.getElementById('darkModeToggle');
const analyticsBtn = document.getElementById('analyticsBtn');
const analyticsModal = document.getElementById('analyticsModal');
const closeAnalytics = document.getElementById('closeAnalytics');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importInput = document.getElementById('importInput');
const bulkActions = document.getElementById('bulkActions');
const selectAllBtn = document.getElementById('selectAllBtn');
const bulkCompleteBtn = document.getElementById('bulkCompleteBtn');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
const cancelBulkBtn = document.getElementById('cancelBulkBtn');
const taskDetails = document.getElementById('taskDetails');
const taskNotes = document.getElementById('taskNotes');
const saveDetails = document.getElementById('saveDetails');
const cancelDetails = document.getElementById('cancelDetails');
const shortcutsHelp = document.getElementById('shortcutsHelp');

// Load tasks from localStorage
function loadTasks() {
    try {
        const saved = localStorage.getItem('simpleTodos');
        tasks = saved ? JSON.parse(saved) : [];
    } catch (error) {
        tasks = [];
    }
}

// Save tasks to localStorage
function saveTasks() {
    try {
        localStorage.setItem('simpleTodos', JSON.stringify(tasks));
    } catch (error) {
        console.error('Failed to save tasks');
    }
}

// Add new task
function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    if (editingId) {
        // Update existing task
        const task = tasks.find(t => t.id === editingId);
        if (task) {
            task.text = text;
            task.dueDate = dueDateInput.value || null;
            task.category = categorySelect.value;
        }
        editingId = null;
        addBtn.textContent = 'Add';
    } else {
        // Add new task
        const task = {
            id: Date.now(),
            text: text,
            completed: false,
            dueDate: dueDateInput.value || null,
            category: categorySelect.value,
            notes: '',
            createdAt: new Date().toISOString()
        };
        tasks.unshift(task);
    }

    taskInput.value = '';
    dueDateInput.value = '';
    categorySelect.value = 'personal';
    saveTasks();
    renderTasks();
    renderCalendar();
    updateStats();
}

// Search functionality
function searchTasks() {
    searchQuery = searchInput.value.toLowerCase().trim();
    searchClear.style.display = searchQuery ? 'block' : 'none';
    renderTasks();
}

function clearSearch() {
    searchInput.value = '';
    searchQuery = '';
    searchClear.style.display = 'none';
    renderTasks();
}

// Dark mode toggle
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDarkMode);
}

// Analytics functions
function showAnalytics() {
    updateAnalytics();
    analyticsModal.style.display = 'flex';
}

function hideAnalytics() {
    analyticsModal.style.display = 'none';
}

function updateAnalytics() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Update completion rate
    document.getElementById('completionRate').textContent = `${completionRate}%`;
    document.getElementById('completionProgress').style.width = `${completionRate}%`;
    
    // Weekly stats
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyTasks = tasks.filter(t => new Date(t.createdAt) > weekAgo);
    const weeklyCompleted = weeklyTasks.filter(t => t.completed).length;
    
    document.getElementById('weeklyCompleted').textContent = weeklyCompleted;
    document.getElementById('weeklyAdded').textContent = weeklyTasks.length;
    
    // Category stats
    const categoryStats = {};
    tasks.forEach(t => {
        categoryStats[t.category] = (categoryStats[t.category] || 0) + 1;
    });
    
    const categoryStatsHTML = Object.entries(categoryStats)
        .map(([cat, count]) => `<div>${cat}: ${count}</div>`)
        .join('');
    document.getElementById('categoryStats').innerHTML = categoryStatsHTML || 'No tasks yet';
    
    // Productivity stats
    const avgPerDay = total > 0 ? (total / Math.max(1, getDaysSinceFirstTask())).toFixed(1) : 0;
    document.getElementById('avgPerDay').textContent = avgPerDay;
    document.getElementById('bestDay').textContent = getBestProductivityDay();
}

function getDaysSinceFirstTask() {
    if (tasks.length === 0) return 1;
    const firstTask = tasks.reduce((oldest, task) => 
        new Date(task.createdAt) < new Date(oldest.createdAt) ? task : oldest
    );
    const daysDiff = Math.ceil((new Date() - new Date(firstTask.createdAt)) / (1000 * 60 * 60 * 24));
    return Math.max(1, daysDiff);
}

function getBestProductivityDay() {
    const dayStats = {};
    tasks.filter(t => t.completed).forEach(task => {
        const day = new Date(task.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
        dayStats[day] = (dayStats[day] || 0) + 1;
    });
    
    const bestDay = Object.entries(dayStats).reduce((best, [day, count]) => 
        count > (best[1] || 0) ? [day, count] : best, ['None', 0]
    );
    
    return bestDay[0];
}

// Calculate streak
function calculateStreak() {
    const today = new Date();
    let streak = 0;
    let currentDay = new Date(today);
    
    while (true) {
        const dayStr = currentDay.toDateString();
        const dayTasks = tasks.filter(t => 
            t.completed && new Date(t.createdAt).toDateString() === dayStr
        );
        
        if (dayTasks.length > 0) {
            streak++;
            currentDay.setDate(currentDay.getDate() - 1);
        } else {
            break;
        }
        
        if (streak > 365) break; // Safety limit
    }
    
    return streak;
}

// Bulk operations
function toggleBulkMode() {
    const hasSelected = selectedTasks.size > 0;
    bulkActions.style.display = hasSelected ? 'flex' : 'none';
    
    if (!hasSelected) {
        selectedTasks.clear();
        renderTasks();
    }
}

function selectAllTasks() {
    const visibleTasks = getFilteredTasks();
    visibleTasks.forEach(task => selectedTasks.add(task.id));
    renderTasks();
    toggleBulkMode();
}

function bulkComplete() {
    selectedTasks.forEach(id => {
        const task = tasks.find(t => t.id === id);
        if (task) task.completed = true;
    });
    selectedTasks.clear();
    saveTasks();
    renderTasks();
    updateStats();
    toggleBulkMode();
}

function bulkDelete() {
    if (confirm(`Delete ${selectedTasks.size} selected task(s)?`)) {
        tasks = tasks.filter(t => !selectedTasks.has(t.id));
        selectedTasks.clear();
        saveTasks();
        renderTasks();
        updateStats();
        toggleBulkMode();
    }
}

function cancelBulk() {
    selectedTasks.clear();
    renderTasks();
    toggleBulkMode();
}

// Export/Import
function exportTasks() {
    const dataStr = JSON.stringify(tasks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
}

function importTasks() {
    importInput.click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedTasks = JSON.parse(e.target.result);
            if (Array.isArray(importedTasks)) {
                if (confirm('This will replace all current tasks. Continue?')) {
                    tasks = importedTasks;
                    saveTasks();
                    renderTasks();
                    renderCalendar();
                    updateStats();
                    alert('Tasks imported successfully!');
                }
            }
        } catch (error) {
            alert('Invalid file format!');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Toggle task completion
function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        renderCalendar();
        updateStats();
    }
}

// Edit task
function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        taskInput.value = task.text;
        dueDateInput.value = task.dueDate || '';
        categorySelect.value = task.category || 'personal';
        taskInput.focus();
        editingId = id;
        addBtn.textContent = 'Update';
    }
}

// Add task notes
function addTaskNotes(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        taskNotes.value = task.notes || '';
        taskDetails.style.display = 'block';
        editingId = id;
        taskNotes.focus();
    }
}

function saveTaskNotes() {
    if (editingId) {
        const task = tasks.find(t => t.id === editingId);
        if (task) {
            task.notes = taskNotes.value.trim();
            saveTasks();
            renderTasks();
        }
    }
    taskDetails.style.display = 'none';
    editingId = null;
}

function cancelTaskNotes() {
    taskDetails.style.display = 'none';
    editingId = null;
    taskNotes.value = '';
}

// Set category filter
function setCategoryFilter(category) {
    currentCategory = category;
    categoryBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    renderTasks();
}

// Toggle task selection
function toggleTaskSelection(id) {
    if (selectedTasks.has(id)) {
        selectedTasks.delete(id);
    } else {
        selectedTasks.add(id);
    }
    renderTasks();
    toggleBulkMode();
}

// Delete task
function deleteTask(id) {
    const taskEl = document.querySelector(`[data-id="${id}"]`);
    if (taskEl) taskEl.classList.add('removing');
    
    setTimeout(() => {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
        renderCalendar();
        updateStats();
    }, 300);
}

// Set filter
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderTasks();
}

// Clear completed tasks
function clearCompleted() {
    const completedCount = tasks.filter(t => t.completed).length;
    if (completedCount === 0) return;
    
    if (confirm(`Delete ${completedCount} completed task(s)?`)) {
        tasks = tasks.filter(t => !t.completed);
        saveTasks();
        renderTasks();
        updateStats();
    }
}

// Switch between list and calendar view
function setView(view) {
    currentView = view;
    viewBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    if (view === 'calendar') {
        tasksList.style.display = 'none';
        emptyState.style.display = 'none';
        calendarView.style.display = 'block';
        renderCalendar();
    } else {
        tasksList.style.display = 'block';
        calendarView.style.display = 'none';
        renderTasks();
    }
}

// Get filtered tasks
function getFilteredTasks() {
    const today = new Date().toDateString();
    let filtered = tasks;
    
    // Apply search filter
    if (searchQuery) {
        filtered = filtered.filter(t => 
            t.text.toLowerCase().includes(searchQuery) ||
            (t.notes && t.notes.toLowerCase().includes(searchQuery))
        );
    }
    
    // Apply category filter
    if (currentCategory !== 'all') {
        filtered = filtered.filter(t => t.category === currentCategory);
    }
    
    // Apply status filter
    switch (currentFilter) {
        case 'completed': 
            filtered = filtered.filter(t => t.completed);
            break;
        case 'pending': 
            filtered = filtered.filter(t => !t.completed);
            break;
        case 'today': 
            filtered = filtered.filter(t => {
                if (!t.dueDate) return false;
                return new Date(t.dueDate).toDateString() === today;
            });
            break;
        case 'overdue':
            filtered = filtered.filter(t => {
                if (!t.dueDate || t.completed) return false;
                return new Date(t.dueDate) < new Date();
            });
            break;
    }
    
    return filtered;
}

// Render tasks
function renderTasks() {
    const filteredTasks = getFilteredTasks();
    
    if (filteredTasks.length === 0) {
        tasksList.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        tasksList.style.display = 'block';
        emptyState.style.display = 'none';
        tasksList.innerHTML = filteredTasks.map(createTaskHTML).join('');
    }
}

// Create task HTML
function createTaskHTML(task) {
    const dueDateHTML = task.dueDate ? getDueDateHTML(task.dueDate) : '';
    const isSelected = selectedTasks.has(task.id);
    const categoryClass = task.category || 'personal';
    const notesHTML = task.notes ? `<div class="task-notes">${escapeHtml(task.notes)}</div>` : '';
    
    return `
        <div class="task-item ${task.completed ? 'completed' : ''} ${categoryClass} ${isSelected ? 'selected' : ''}" data-id="${task.id}">
            <input type="checkbox" class="task-select" ${isSelected ? 'checked' : ''} 
                   onchange="toggleTaskSelection(${task.id})">
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})">
                ${task.completed ? '✓' : ''}
            </div>
            <div class="task-main">
                <div class="task-top">
                    <span class="task-text">${escapeHtml(task.text)}</span>
                    <span class="task-category category-${categoryClass}">${categoryClass}</span>
                    ${dueDateHTML}
                </div>
                ${notesHTML}
            </div>
            <div class="task-actions">
                <button class="task-btn edit-btn" onclick="addTaskNotes(${task.id})" title="Add Notes">
                    <i class="fas fa-sticky-note"></i>
                </button>
                <button class="task-btn edit-btn" onclick="editTask(${task.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="task-btn delete-btn" onclick="deleteTask(${task.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Get due date HTML with styling
function getDueDateHTML(dueDate) {
    const today = new Date().toDateString();
    const taskDate = new Date(dueDate).toDateString();
    const isToday = taskDate === today;
    const isOverdue = new Date(dueDate) < new Date() && !isToday;
    
    let className = 'task-due-date';
    if (isOverdue) className += ' overdue';
    if (isToday) className += ' today';
    
    const dateStr = isToday ? 'Today' : new Date(dueDate).toLocaleDateString();
    return `<span class="${className}">📅 ${dateStr}</span>`;
}

// Update statistics
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const streak = calculateStreak();
    
    totalTasksEl.textContent = total;
    completedTasksEl.textContent = completed;
    streakEl.textContent = streak;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Calendar functions
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    currentMonthEl.textContent = new Date(year, month).toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    let calendarHTML = '';
    
    // Add weekday headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
        calendarHTML += `<div class="weekday-header">${day}</div>`;
    });
    
    // Add calendar days
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const isCurrentMonth = date.getMonth() === month;
        const isToday = date.toDateString() === new Date().toDateString();
        const dateStr = date.toISOString().split('T')[0];
        
        const dayTasks = tasks.filter(t => t.dueDate === dateStr);
        
        let dayClass = 'calendar-day';
        if (!isCurrentMonth) dayClass += ' other-month';
        if (isToday) dayClass += ' today';
        
        const tasksHTML = dayTasks.map(task => 
            `<div class="calendar-task ${task.completed ? 'completed' : ''}" onclick="editTask(${task.id})" title="${task.text}">
                ${task.text.substring(0, 15)}${task.text.length > 15 ? '...' : ''}
            </div>`
        ).join('');
        
        calendarHTML += `
            <div class="${dayClass}" onclick="selectDate('${dateStr}')">
                <div class="day-number">${date.getDate()}</div>
                <div class="day-tasks">${tasksHTML}</div>
            </div>
        `;
    }
    
    calendarGrid.innerHTML = calendarHTML;
}

function selectDate(dateStr) {
    dueDateInput.value = dateStr;
    taskInput.focus();
}

function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
}

// Event listeners
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

// Search events
searchInput.addEventListener('input', searchTasks);
searchClear.addEventListener('click', clearSearch);

// Filter events
filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => setFilter(e.target.dataset.filter));
});

categoryBtns.forEach(btn => {
    btn.addEventListener('click', (e) => setCategoryFilter(e.target.dataset.category));
});

viewBtns.forEach(btn => {
    btn.addEventListener('click', (e) => setView(e.target.dataset.view));
});

// Action events
clearBtn.addEventListener('click', clearCompleted);
prevMonthBtn.addEventListener('click', () => changeMonth(-1));
nextMonthBtn.addEventListener('click', () => changeMonth(1));
darkModeToggle.addEventListener('click', toggleDarkMode);
analyticsBtn.addEventListener('click', showAnalytics);
closeAnalytics.addEventListener('click', hideAnalytics);
exportBtn.addEventListener('click', exportTasks);
importBtn.addEventListener('click', importTasks);
importInput.addEventListener('change', handleImport);

// Bulk operation events
selectAllBtn.addEventListener('click', selectAllTasks);
bulkCompleteBtn.addEventListener('click', bulkComplete);
bulkDeleteBtn.addEventListener('click', bulkDelete);
cancelBulkBtn.addEventListener('click', cancelBulk);

// Task details events
saveDetails.addEventListener('click', saveTaskNotes);
cancelDetails.addEventListener('click', cancelTaskNotes);

// Advanced keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape key
    if (e.key === 'Escape') {
        if (editingId) {
            taskInput.value = '';
            dueDateInput.value = '';
            editingId = null;
            addBtn.textContent = 'Add';
        }
        if (taskDetails.style.display === 'block') {
            cancelTaskNotes();
        }
        if (analyticsModal.style.display === 'flex') {
            hideAnalytics();
        }
        if (shortcutsHelp.style.display === 'block') {
            shortcutsHelp.style.display = 'none';
        }
    }
    
    // Ctrl/Cmd shortcuts
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'a':
                e.preventDefault();
                selectAllTasks();
                break;
            case 'd':
                e.preventDefault();
                toggleDarkMode();
                break;
            case 'f':
                e.preventDefault();
                searchInput.focus();
                break;
            case 'e':
                e.preventDefault();
                exportTasks();
                break;
        }
    }
    
    // Show shortcuts help
    if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        shortcutsHelp.style.display = shortcutsHelp.style.display === 'block' ? 'none' : 'block';
        setTimeout(() => {
            if (shortcutsHelp.style.display === 'block') {
                shortcutsHelp.style.display = 'none';
            }
        }, 5000);
    }
});

// Click outside to close modals
document.addEventListener('click', (e) => {
    if (e.target === analyticsModal) {
        hideAnalytics();
    }
});

// Search functionality
function searchTasks() {
    searchQuery = searchInput.value.toLowerCase().trim();
    renderTasks();
    
    if (searchQuery) {
        searchClear.style.display = 'block';
    } else {
        searchClear.style.display = 'none';
    }
}

function clearSearch() {
    searchInput.value = '';
    searchQuery = '';
    searchClear.style.display = 'none';
    renderTasks();
}

// Dark mode functionality
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode');
    darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDarkMode);
}

// Analytics functionality
function showAnalytics() {
    updateAnalytics();
    analyticsModal.style.display = 'flex';
}

function hideAnalytics() {
    analyticsModal.style.display = 'none';
}

function updateAnalytics() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Weekly stats
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyCompleted = tasks.filter(t => 
        t.completed && new Date(t.createdAt) >= weekAgo
    ).length;
    
    // Category distribution
    const categories = {};
    tasks.forEach(t => {
        const cat = t.category || 'personal';
        categories[cat] = (categories[cat] || 0) + 1;
    });
    
    // Update analytics display
    document.querySelector('.completion-rate').textContent = `${completionRate}%`;
    document.querySelector('.weekly-completed').textContent = weeklyCompleted;
    document.querySelector('.total-tasks-analytics').textContent = total;
    document.querySelector('.pending-tasks').textContent = total - completed;
    
    // Category breakdown
    const categoryBreakdown = document.querySelector('.category-breakdown');
    categoryBreakdown.innerHTML = Object.entries(categories)
        .map(([cat, count]) => `<div>${cat}: ${count}</div>`)
        .join('');
}

function calculateStreak() {
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        const dayTasks = tasks.filter(t => 
            t.dueDate === dateStr && t.completed
        );
        
        if (dayTasks.length > 0) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }
    
    return streak;
}

// Bulk operations
function selectAllTasks() {
    const filteredTasks = getFilteredTasks();
    if (selectedTasks.size === filteredTasks.length) {
        selectedTasks.clear();
    } else {
        filteredTasks.forEach(t => selectedTasks.add(t.id));
    }
    renderTasks();
    toggleBulkMode();
}

function bulkComplete() {
    selectedTasks.forEach(id => {
        const task = tasks.find(t => t.id === id);
        if (task) task.completed = true;
    });
    selectedTasks.clear();
    saveTasks();
    renderTasks();
    renderCalendar();
    updateStats();
    toggleBulkMode();
}

function bulkDelete() {
    tasks = tasks.filter(t => !selectedTasks.has(t.id));
    selectedTasks.clear();
    saveTasks();
    renderTasks();
    renderCalendar();
    updateStats();
    toggleBulkMode();
}

function cancelBulk() {
    selectedTasks.clear();
    renderTasks();
    toggleBulkMode();
}

function toggleBulkMode() {
    const bulkActions = document.querySelector('.bulk-actions');
    if (selectedTasks.size > 0) {
        bulkActions.style.display = 'flex';
    } else {
        bulkActions.style.display = 'none';
    }
}

// Export/Import functionality
function exportTasks() {
    const data = {
        tasks: tasks,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todo-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importTasks() {
    importInput.click();
}

function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.tasks && Array.isArray(data.tasks)) {
                if (confirm('This will replace all current tasks. Continue?')) {
                    tasks = data.tasks;
                    saveTasks();
                    renderTasks();
                    renderCalendar();
                    updateStats();
                }
            } else {
                alert('Invalid file format');
            }
        } catch (error) {
            alert('Error reading file');
        }
    };
    reader.readAsText(file);
    importInput.value = '';
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Apply dark mode if saved
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
    }
    
    loadTasks();
    renderTasks();
    renderCalendar();
    updateStats();
});
