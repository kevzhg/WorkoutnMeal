// Main Application Entry Point

import {
    Workout,
    Meal,
    WeightEntry,
    WorkoutType,
    MealType,
    WeightUnit,
    WORKOUT_TYPE_LABELS,
    MEAL_TYPE_LABELS
} from './types.js';

import {
    initStorage,
    addWorkout,
    getWorkouts,
    getWorkoutsByDate,
    deleteWorkout,
    addMeal,
    getMeals,
    getMealsByDate,
    deleteMeal,
    addWeightEntry,
    getWeightEntries,
    getWeightByDate,
    deleteWeightEntry
} from './storage.js';

// DOM Elements
let currentPage = 'dashboard';
let currentCalendarDate = new Date();

// Utility functions
function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

function $(selector: string): HTMLElement | null {
    return document.querySelector(selector);
}

function $$(selector: string): NodeListOf<HTMLElement> {
    return document.querySelectorAll(selector);
}

// Navigation
function initNavigation(): void {
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

function navigateTo(page: string): void {
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
    }
}

// Dashboard
function refreshDashboard(): void {
    const today = getTodayString();

    // Today's workouts
    const todayWorkouts = getWorkoutsByDate(today);
    const workoutSummary = $('#dashboard-workout-summary');
    if (workoutSummary) {
        if (todayWorkouts.length > 0) {
            const totalMinutes = todayWorkouts.reduce((sum, w) => sum + w.duration, 0);
            workoutSummary.innerHTML = `
                <p><strong>${todayWorkouts.length}</strong> workout(s)</p>
                <p><strong>${totalMinutes}</strong> total minutes</p>
                <p>Types: ${todayWorkouts.map(w => WORKOUT_TYPE_LABELS[w.type]).join(', ')}</p>
            `;
        } else {
            workoutSummary.innerHTML = '<p class="no-data">No workout logged today</p>';
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
        } else {
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
        } else {
            weightSummary.innerHTML = '<p class="no-data">No weight logged</p>';
        }
    }

    // Weekly progress
    const progressSummary = $('#dashboard-progress');
    if (progressSummary) {
        const workouts = getWorkouts();
        const meals = getMeals();
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];

        const weekWorkouts = workouts.filter(w => w.date >= weekAgoStr);
        const weekMeals = meals.filter(m => m.date >= weekAgoStr);

        progressSummary.innerHTML = `
            <p><strong>${weekWorkouts.length}</strong> workouts this week</p>
            <p><strong>${weekMeals.length}</strong> meals logged this week</p>
            <p><strong>${weekWorkouts.reduce((sum, w) => sum + w.duration, 0)}</strong> min exercised</p>
        `;
    }
}

// Workouts
function initWorkoutForm(): void {
    const form = $('#workout-form') as HTMLFormElement;
    const dateInput = $('#workout-date') as HTMLInputElement;

    // Set default date to today
    dateInput.value = getTodayString();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const workout = {
            date: (form.querySelector('#workout-date') as HTMLInputElement).value,
            type: (form.querySelector('#workout-type') as HTMLSelectElement).value as WorkoutType,
            duration: parseInt((form.querySelector('#workout-duration') as HTMLInputElement).value),
            exercises: (form.querySelector('#workout-exercises') as HTMLTextAreaElement).value,
            notes: (form.querySelector('#workout-notes') as HTMLTextAreaElement).value
        };

        await addWorkout(workout);
        form.reset();
        dateInput.value = getTodayString();
        refreshWorkoutList();
        showNotification('Workout added successfully!');
    });
}

function refreshWorkoutList(): void {
    const listContainer = $('#workout-list');
    if (!listContainer) return;

    const workouts = getWorkouts();

    if (workouts.length === 0) {
        listContainer.innerHTML = '<p class="no-data">No workouts logged yet</p>';
        return;
    }

    listContainer.innerHTML = workouts.map(workout => `
        <div class="item-card" data-id="${workout.id}">
            <div class="item-header">
                <span class="item-date">${formatDate(workout.date)}</span>
                <span class="item-type badge">${WORKOUT_TYPE_LABELS[workout.type]}</span>
            </div>
            <div class="item-body">
                <p><strong>${workout.duration} minutes</strong></p>
                ${workout.exercises ? `<p class="item-details">${workout.exercises}</p>` : ''}
                ${workout.notes ? `<p class="item-notes"><em>${workout.notes}</em></p>` : ''}
            </div>
            <button class="btn btn-danger btn-small delete-btn" data-type="workout" data-id="${workout.id}">Delete</button>
        </div>
    `).join('');

    // Add delete handlers
    listContainer.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (id && confirm('Delete this workout?')) {
                await deleteWorkout(id);
                refreshWorkoutList();
                showNotification('Workout deleted');
            }
        });
    });
}

// Meals
function initMealForm(): void {
    const form = $('#meal-form') as HTMLFormElement;
    const dateInput = $('#meal-date') as HTMLInputElement;

    // Set default date to today
    dateInput.value = getTodayString();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const caloriesInput = (form.querySelector('#meal-calories') as HTMLInputElement).value;
        const proteinInput = (form.querySelector('#meal-protein') as HTMLInputElement).value;

        const meal = {
            date: (form.querySelector('#meal-date') as HTMLInputElement).value,
            type: (form.querySelector('#meal-type') as HTMLSelectElement).value as MealType,
            name: (form.querySelector('#meal-name') as HTMLInputElement).value,
            calories: caloriesInput ? parseInt(caloriesInput) : undefined,
            protein: proteinInput ? parseInt(proteinInput) : undefined,
            description: (form.querySelector('#meal-description') as HTMLTextAreaElement).value
        };

        await addMeal(meal);
        form.reset();
        dateInput.value = getTodayString();
        refreshMealList();
        showNotification('Meal added successfully!');
    });
}

function refreshMealList(): void {
    const listContainer = $('#meal-list');
    if (!listContainer) return;

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
function initWeightForm(): void {
    const form = $('#weight-form') as HTMLFormElement;
    const dateInput = $('#weight-date') as HTMLInputElement;

    // Set default date to today
    dateInput.value = getTodayString();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const entry = {
            date: (form.querySelector('#weight-date') as HTMLInputElement).value,
            weight: parseFloat((form.querySelector('#weight-value') as HTMLInputElement).value),
            unit: (form.querySelector('#weight-unit') as HTMLSelectElement).value as WeightUnit,
            notes: (form.querySelector('#weight-notes') as HTMLInputElement).value
        };

        await addWeightEntry(entry);
        form.reset();
        dateInput.value = getTodayString();
        renderCalendar();
        updateWeightStats();
        showNotification('Weight logged successfully!');
    });
}

function initCalendarNavigation(): void {
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

function renderCalendar(): void {
    const monthYearLabel = $('#calendar-month-year');
    const daysContainer = $('#calendar-days');

    if (!monthYearLabel || !daysContainer) return;

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
    const weightMap = new Map<string, WeightEntry>();
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
        if (isToday) dayClass += ' today';
        if (weightEntry) dayClass += ' has-weight';

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

function updateWeightStats(): void {
    const entries = getWeightEntries();

    const startingEl = $('#starting-weight');
    const currentEl = $('#current-weight');
    const changeEl = $('#weight-change');

    if (!startingEl || !currentEl || !changeEl) return;

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
function showNotification(message: string): void {
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
async function init(): Promise<void> {
    // Initialize storage (connects to API or falls back to localStorage)
    await initStorage();

    initNavigation();
    initWorkoutForm();
    initMealForm();
    initWeightForm();
    initCalendarNavigation();

    // Initialize dashboard
    refreshDashboard();
}

// Run when DOM is ready
document.addEventListener('DOMContentLoaded', init);
