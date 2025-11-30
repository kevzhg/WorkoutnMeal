// Main Application Entry Point
import { TRAINING_TYPE_LABELS, MEAL_TYPE_LABELS } from './types.js';
import { initStorage, addTraining, getTrainings, getTrainingsByDate, deleteTraining, updateTraining, getTrainingById, addMeal, getMeals, getMealsByDate, deleteMeal, addWeightEntry, getWeightEntries, getWeightByDate } from './storage.js';
import { initializeLiveWorkout, refreshLiveWorkout } from './liveWorkout.js';
import { initializeOnigiriPlanner, refreshOnigiriPlanner } from './onigiri.js';
// DOM Elements
let currentPage = 'dashboard';
let currentCalendarDate = new Date();
// Utility functions
function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}
function $(selector) {
    return document.querySelector(selector);
}
function $$(selector) {
    return document.querySelectorAll(selector);
}
// Navigation
function initNavigation() {
    const navLinks = $$('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            if (page) {
                navigateTo(page);
            }
        });
    });
}
function navigateTo(page) {
    // Update nav links
    $$('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });
    // Update pages
    $$('.page').forEach(p => {
        p.classList.remove('active');
    });
    const pageElement = $(`#${page}`);
    if (pageElement) {
        pageElement.classList.add('active');
    }
    currentPage = page;
    // Refresh content based on page
    switch (page) {
        case 'dashboard':
            refreshDashboard();
            break;
        case 'live-workout':
            refreshLiveWorkout();
            break;
        case 'workouts':
            refreshWorkoutList();
            break;
        case 'meals':
            refreshMealList();
            break;
        case 'weight':
            renderCalendar();
            updateWeightStats();
            break;
        case 'onigiri':
            refreshOnigiriPlanner();
            break;
    }
}
// Dashboard
function refreshDashboard() {
    const today = getTodayString();
    // Today's trainings
    const todayTrainings = getTrainingsByDate(today);
    const workoutSummary = $('#dashboard-workout-summary');
    if (workoutSummary) {
        if (todayTrainings.length > 0) {
            const totalMinutes = todayTrainings.reduce((sum, w) => sum + w.durationMinutes, 0);
            workoutSummary.innerHTML = `
                <p><strong>${todayTrainings.length}</strong> training session(s)</p>
                <p><strong>${totalMinutes}</strong> total minutes</p>
                <p>Types: ${todayTrainings.map(w => TRAINING_TYPE_LABELS[w.type]).join(', ')}</p>
            `;
        }
        else {
            workoutSummary.innerHTML = '<p class="no-data">No training logged today</p>';
        }
    }
    // Today's meals
    const todayMeals = getMealsByDate(today);
    const mealSummary = $('#dashboard-meals-summary');
    if (mealSummary) {
        if (todayMeals.length > 0) {
            const totalCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
            const totalProtein = todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
            mealSummary.innerHTML = `
                <p><strong>${todayMeals.length}</strong> meal(s) logged</p>
                ${totalCalories > 0 ? `<p><strong>${totalCalories}</strong> calories</p>` : ''}
                ${totalProtein > 0 ? `<p><strong>${totalProtein}g</strong> protein</p>` : ''}
            `;
        }
        else {
            mealSummary.innerHTML = '<p class="no-data">No meals logged today</p>';
        }
    }
    // Current weight
    const weightEntries = getWeightEntries();
    const weightSummary = $('#dashboard-weight-summary');
    if (weightSummary) {
        if (weightEntries.length > 0) {
            const latest = weightEntries[weightEntries.length - 1];
            const first = weightEntries[0];
            const change = latest.weight - first.weight;
            const changeStr = change >= 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
            weightSummary.innerHTML = `
                <p class="big-number">${latest.weight} ${latest.unit}</p>
                <p class="small-text">Change: ${changeStr} ${latest.unit}</p>
            `;
        }
        else {
            weightSummary.innerHTML = '<p class="no-data">No weight logged</p>';
        }
    }
    // Weekly progress
    const progressSummary = $('#dashboard-progress');
    if (progressSummary) {
        const trainings = getTrainings();
        const meals = getMeals();
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        const weekTrainings = trainings.filter(w => w.date >= weekAgoStr);
        const weekMeals = meals.filter(m => m.date >= weekAgoStr);
        progressSummary.innerHTML = `
            <p><strong>${weekTrainings.length}</strong> training sessions this week</p>
            <p><strong>${weekMeals.length}</strong> meals logged this week</p>
            <p><strong>${weekTrainings.reduce((sum, w) => sum + w.durationMinutes, 0)}</strong> min exercised</p>
        `;
    }
    // Recent trainings
    refreshRecentTrainings();
}
function refreshRecentTrainings() {
    const container = $('#dashboard-recent-workouts');
    if (!container)
        return;
    const trainings = getTrainings();
    const recentTrainings = trainings.slice(0, 5); // Last 5 trainings
    if (recentTrainings.length === 0) {
        container.innerHTML = '<p class="no-data">No training sessions logged yet</p>';
        return;
    }
    container.innerHTML = recentTrainings.map(training => {
        const trainingId = training.id || 'training';
        const detailId = `training-detail-${trainingId}`;
        const editId = `training-edit-${trainingId}`;
        const isLiveTraining = training.notes?.includes('Live training') || training.notes?.includes('Live workout');
        const exercisePreview = training.programName || training.exercises[0]?.name || 'Training';
        return `
            <div class="recent-workout-item" data-id="${trainingId}">
                <div class="recent-workout-header" data-toggle-id="${detailId}">
                    <div class="recent-workout-info">
                        <div class="recent-workout-date">${formatDate(training.date)}</div>
                        <div class="recent-workout-title">${exercisePreview}</div>
                    </div>
                    <div class="recent-workout-stats">
                        <span class="workout-duration">${training.durationMinutes} min</span>
                        ${isLiveTraining ? '<span class="workout-badge">Live</span>' : ''}
                    </div>
                </div>
                <div id="${detailId}" class="recent-workout-details" style="display: none;">
                    ${renderTrainingDetail(training)}
                    <div class="recent-workout-actions">
                        <button class="btn btn-secondary btn-small edit-workout-btn" data-id="${trainingId}" data-edit-id="${editId}">Edit</button>
                        <button class="btn btn-danger btn-small delete-workout-btn" data-id="${trainingId}">Delete</button>
                    </div>
                    <div id="${editId}" class="workout-edit-panel" style="display: none;">
                        ${renderTrainingEditForm(training)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    bindRecentTrainingEvents();
}
function renderTrainingDetail(training) {
    const exercisesHtml = training.exercises.map(exercise => `
        <div class="recent-exercise">
            <div class="recent-exercise-header">
                <strong>${exercise.name}</strong>
                ${exercise.elapsedMs ? `<span class="small-text">${Math.round(exercise.elapsedMs / 1000)}s</span>` : ''}
            </div>
            <div class="recent-sets">
                ${exercise.sets.map(set => `
                    <div class="recent-set">
                        <span>Set ${set.setNumber}</span>
                        ${set.weight ? `<span>${set.weight} lbs</span>` : ''}
                        ${set.reps ? `<span>${set.reps} reps</span>` : ''}
                        ${set.completedAt ? `<span class="small-text">${new Date(set.completedAt).toLocaleTimeString()}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    return `
        <div class="recent-workout-meta">
            ${training.programName ? `<p><strong>Program:</strong> ${training.programName}</p>` : ''}
            ${training.notes ? `<p class="item-notes"><em>${training.notes}</em></p>` : ''}
        </div>
        ${exercisesHtml || '<p class="small-text">No exercises recorded</p>'}
    `;
}
function renderTrainingEditForm(training) {
    const trainingId = training.id || 'training';
    return `
        <form class="edit-workout-form" data-id="${trainingId}">
            <div class="form-grid">
                <label>Date
                    <input type="date" name="date" value="${training.date}" required>
                </label>
                <label>Duration (min)
                    <input type="number" name="durationMinutes" value="${training.durationMinutes}" min="0" required>
                </label>
                <label>Program
                    <input type="text" name="programName" value="${training.programName || ''}" placeholder="Program name">
                </label>
                <label>Notes
                    <textarea name="notes" rows="2" placeholder="Notes">${training.notes || ''}</textarea>
                </label>
            </div>
            <div class="edit-exercises">
                ${training.exercises.map((ex, exIndex) => `
                    <div class="edit-exercise-card">
                        <div class="edit-exercise-header">
                            <input type="text" name="exercise-${exIndex}-name" value="${ex.name}" placeholder="Exercise name">
                            <input type="number" name="exercise-${exIndex}-elapsed" value="${ex.elapsedMs ?? ''}" placeholder="Elapsed ms">
                        </div>
                        <div class="edit-sets-grid">
                            ${ex.sets.map((set, setIndex) => `
                                <div class="edit-set-item">
                                    <div class="small-text">Set ${set.setNumber}</div>
                                    <input type="number" name="exercise-${exIndex}-set-${setIndex}-weight" value="${set.weight ?? ''}" placeholder="Weight">
                                    <input type="text" name="exercise-${exIndex}-set-${setIndex}-reps" value="${set.reps ?? ''}" placeholder="Reps">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="edit-actions">
                <button type="submit" class="btn btn-primary btn-small">Save</button>
                <button type="button" class="btn btn-secondary btn-small cancel-edit-btn" data-id="${training.id}">Cancel</button>
            </div>
        </form>
    `;
}
function bindRecentTrainingEvents() {
    document.querySelectorAll('.recent-workout-header').forEach(header => {
        header.addEventListener('click', () => {
            const targetId = header.getAttribute('data-toggle-id');
            if (targetId) {
                const detail = document.getElementById(targetId);
                if (detail) {
                    detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
                }
            }
        });
    });
    document.querySelectorAll('.delete-workout-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (id && confirm('Delete this training?')) {
                await deleteTraining(id);
                refreshDashboard();
                refreshWorkoutList();
                refreshRecentTrainings();
            }
        });
    });
    document.querySelectorAll('.edit-workout-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const editId = btn.getAttribute('data-edit-id');
            if (!editId)
                return;
            const panel = document.getElementById(editId);
            if (panel) {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            }
        });
    });
    document.querySelectorAll('.cancel-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            if (!id)
                return;
            const panel = document.getElementById(`workout-edit-${id}`);
            if (panel)
                panel.style.display = 'none';
        });
    });
    document.querySelectorAll('.edit-workout-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formEl = e.target;
            const id = formEl.getAttribute('data-id');
            if (!id)
                return;
            const training = getTrainingById(id);
            if (!training)
                return;
            const formData = new FormData(formEl);
            const updatedExercises = training.exercises.map((ex, exIndex) => {
                const elapsedStr = formData.get(`exercise-${exIndex}-elapsed`);
                const elapsedMs = elapsedStr ? parseInt(elapsedStr, 10) : undefined;
                return {
                    ...ex,
                    name: formData.get(`exercise-${exIndex}-name`) || ex.name,
                    elapsedMs,
                    sets: ex.sets.map((set, setIndex) => {
                        const weightStr = formData.get(`exercise-${exIndex}-set-${setIndex}-weight`);
                        const repsStr = formData.get(`exercise-${exIndex}-set-${setIndex}-reps`);
                        return {
                            ...set,
                            weight: weightStr ? parseFloat(weightStr) : undefined,
                            reps: repsStr || set.reps
                        };
                    })
                };
            });
            await updateTraining(id, {
                date: formData.get('date'),
                durationMinutes: parseInt(formData.get('durationMinutes'), 10),
                programName: formData.get('programName') || undefined,
                notes: formData.get('notes') || undefined,
                exercises: updatedExercises
            });
            refreshDashboard();
            refreshWorkoutList();
            refreshRecentTrainings();
        });
    });
}
// Training sessions (formerly workouts)
function initWorkoutForm() {
    const form = $('#workout-form');
    const dateInput = $('#workout-date');
    // Set default date to today
    dateInput.value = getTodayString();
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const training = {
            date: form.querySelector('#workout-date').value,
            type: form.querySelector('#workout-type').value,
            durationMinutes: parseInt(form.querySelector('#workout-duration').value, 10),
            programName: 'Manual Entry',
            exercises: [
                {
                    exerciseId: `manual-${Date.now()}`,
                    name: 'Manual Entry',
                    notes: form.querySelector('#workout-exercises').value,
                    sets: []
                }
            ],
            notes: form.querySelector('#workout-notes').value
        };
        await addTraining(training);
        form.reset();
        dateInput.value = getTodayString();
        refreshWorkoutList();
        showNotification('Training added successfully!');
    });
}
function refreshWorkoutList() {
    const listContainer = $('#workout-list');
    if (!listContainer)
        return;
    const trainings = getTrainings();
    if (trainings.length === 0) {
        listContainer.innerHTML = '<p class="no-data">No training sessions logged yet</p>';
        return;
    }
    listContainer.innerHTML = trainings.map(training => `
        <div class="item-card" data-id="${training.id}">
            <div class="item-header">
                <span class="item-date">${formatDate(training.date)}</span>
                <span class="item-type badge">${TRAINING_TYPE_LABELS[training.type]}</span>
            </div>
            <div class="item-body">
                <p><strong>${training.durationMinutes} minutes</strong></p>
                ${training.programName ? `<p class="item-details">${training.programName}</p>` : ''}
                ${training.exercises?.length ? `<p class="item-details">${training.exercises.map(ex => ex.name).join(', ')}</p>` : ''}
                ${training.notes ? `<p class="item-notes"><em>${training.notes}</em></p>` : ''}
            </div>
            <button class="btn btn-danger btn-small delete-btn" data-type="workout" data-id="${training.id}">Delete</button>
        </div>
    `).join('');
    // Add delete handlers
    listContainer.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (id && confirm('Delete this training?')) {
                await deleteTraining(id);
                refreshWorkoutList();
                showNotification('Training deleted');
            }
        });
    });
}
// Meals
function initMealForm() {
    const form = $('#meal-form');
    const dateInput = $('#meal-date');
    // Set default date to today
    dateInput.value = getTodayString();
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const caloriesInput = form.querySelector('#meal-calories').value;
        const proteinInput = form.querySelector('#meal-protein').value;
        const meal = {
            date: form.querySelector('#meal-date').value,
            type: form.querySelector('#meal-type').value,
            name: form.querySelector('#meal-name').value,
            calories: caloriesInput ? parseInt(caloriesInput) : undefined,
            protein: proteinInput ? parseInt(proteinInput) : undefined,
            description: form.querySelector('#meal-description').value
        };
        await addMeal(meal);
        form.reset();
        dateInput.value = getTodayString();
        refreshMealList();
        showNotification('Meal added successfully!');
    });
}
function refreshMealList() {
    const listContainer = $('#meal-list');
    if (!listContainer)
        return;
    const meals = getMeals();
    if (meals.length === 0) {
        listContainer.innerHTML = '<p class="no-data">No meals logged yet</p>';
        return;
    }
    listContainer.innerHTML = meals.map(meal => `
        <div class="item-card" data-id="${meal.id}">
            <div class="item-header">
                <span class="item-date">${formatDate(meal.date)}</span>
                <span class="item-type badge">${MEAL_TYPE_LABELS[meal.type]}</span>
            </div>
            <div class="item-body">
                <p><strong>${meal.name}</strong></p>
                <div class="meal-macros">
                    ${meal.calories ? `<span class="macro">🔥 ${meal.calories} cal</span>` : ''}
                    ${meal.protein ? `<span class="macro">💪 ${meal.protein}g protein</span>` : ''}
                </div>
                ${meal.description ? `<p class="item-details">${meal.description}</p>` : ''}
            </div>
            <button class="btn btn-danger btn-small delete-btn" data-type="meal" data-id="${meal.id}">Delete</button>
        </div>
    `).join('');
    // Add delete handlers
    listContainer.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (id && confirm('Delete this meal?')) {
                await deleteMeal(id);
                refreshMealList();
                showNotification('Meal deleted');
            }
        });
    });
}
// Weight Calendar
function initWeightForm() {
    const form = $('#weight-form');
    const dateInput = $('#weight-date');
    // Set default date to today
    dateInput.value = getTodayString();
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const entry = {
            date: form.querySelector('#weight-date').value,
            weight: parseFloat(form.querySelector('#weight-value').value),
            unit: form.querySelector('#weight-unit').value,
            notes: form.querySelector('#weight-notes').value
        };
        await addWeightEntry(entry);
        form.reset();
        dateInput.value = getTodayString();
        renderCalendar();
        updateWeightStats();
        showNotification('Weight logged successfully!');
    });
}
function initCalendarNavigation() {
    const prevBtn = $('#prev-month');
    const nextBtn = $('#next-month');
    prevBtn?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });
    nextBtn?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
}
function renderCalendar() {
    const monthYearLabel = $('#calendar-month-year');
    const daysContainer = $('#calendar-days');
    if (!monthYearLabel || !daysContainer)
        return;
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    // Update header
    monthYearLabel.textContent = new Date(year, month).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });
    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Get weight entries for this month
    const weightEntries = getWeightEntries();
    const weightMap = new Map();
    weightEntries.forEach(entry => {
        weightMap.set(entry.date, entry);
    });
    // Build calendar HTML
    let html = '';
    // Empty cells for days before first of month
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    // Days of the month
    const today = getTodayString();
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const weightEntry = weightMap.get(dateStr);
        const isToday = dateStr === today;
        let dayClass = 'calendar-day';
        if (isToday)
            dayClass += ' today';
        if (weightEntry)
            dayClass += ' has-weight';
        html += `
            <div class="${dayClass}" data-date="${dateStr}">
                <span class="day-number">${day}</span>
                ${weightEntry ? `<span class="day-weight">${weightEntry.weight}</span>` : ''}
            </div>
        `;
    }
    daysContainer.innerHTML = html;
    // Add click handlers for days with weight
    daysContainer.querySelectorAll('.calendar-day.has-weight').forEach(dayEl => {
        dayEl.addEventListener('click', () => {
            const date = dayEl.getAttribute('data-date');
            if (date) {
                const entry = getWeightByDate(date);
                if (entry) {
                    alert(`Weight on ${formatDate(date)}:\n${entry.weight} ${entry.unit}\n${entry.notes || ''}`);
                }
            }
        });
    });
}
function updateWeightStats() {
    const entries = getWeightEntries();
    const startingEl = $('#starting-weight');
    const currentEl = $('#current-weight');
    const changeEl = $('#weight-change');
    if (!startingEl || !currentEl || !changeEl)
        return;
    if (entries.length === 0) {
        startingEl.textContent = '--';
        currentEl.textContent = '--';
        changeEl.textContent = '--';
        return;
    }
    const first = entries[0];
    const latest = entries[entries.length - 1];
    const change = latest.weight - first.weight;
    startingEl.textContent = `${first.weight} ${first.unit}`;
    currentEl.textContent = `${latest.weight} ${latest.unit}`;
    const changeStr = change >= 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
    changeEl.textContent = `${changeStr} ${latest.unit}`;
    changeEl.className = 'stat-value ' + (change < 0 ? 'positive' : change > 0 ? 'negative' : '');
}
// Notifications
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}
// Initialize application
async function init() {
    // Initialize storage (connects to API or falls back to localStorage)
    await initStorage();
    initNavigation();
    initWorkoutForm();
    initMealForm();
    initWeightForm();
    initCalendarNavigation();
    // Initialize live workout
    await initializeLiveWorkout();
    // Initialize Onigiri planner
    await initializeOnigiriPlanner();
    // Initialize dashboard
    refreshDashboard();
}
// Run when DOM is ready
document.addEventListener('DOMContentLoaded', init);
//# sourceMappingURL=app.js.map