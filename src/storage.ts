// Local Storage management for the Fitness Tracker

import { AppData, Workout, Meal, WeightEntry, AppSettings } from './types.js';

const STORAGE_KEY = 'fitness-tracker-data';

const DEFAULT_DATA: AppData = {
    workouts: [],
    meals: [],
    weightEntries: [],
    settings: {
        defaultWeightUnit: 'lbs'
    }
};

export function loadData(): AppData {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored) as AppData;
            return {
                ...DEFAULT_DATA,
                ...data
            };
        }
    } catch (error) {
        console.error('Error loading data from localStorage:', error);
    }
    return { ...DEFAULT_DATA };
}

export function saveData(data: AppData): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving data to localStorage:', error);
    }
}

export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Workout operations
export function addWorkout(workout: Omit<Workout, 'id' | 'createdAt'>): Workout {
    const data = loadData();
    const newWorkout: Workout = {
        ...workout,
        id: generateId(),
        createdAt: new Date().toISOString()
    };
    data.workouts.push(newWorkout);
    saveData(data);
    return newWorkout;
}

export function getWorkouts(): Workout[] {
    return loadData().workouts.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
}

export function getWorkoutsByDate(date: string): Workout[] {
    return getWorkouts().filter(w => w.date === date);
}

export function deleteWorkout(id: string): void {
    const data = loadData();
    data.workouts = data.workouts.filter(w => w.id !== id);
    saveData(data);
}

// Meal operations
export function addMeal(meal: Omit<Meal, 'id' | 'createdAt'>): Meal {
    const data = loadData();
    const newMeal: Meal = {
        ...meal,
        id: generateId(),
        createdAt: new Date().toISOString()
    };
    data.meals.push(newMeal);
    saveData(data);
    return newMeal;
}

export function getMeals(): Meal[] {
    return loadData().meals.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
}

export function getMealsByDate(date: string): Meal[] {
    return getMeals().filter(m => m.date === date);
}

export function deleteMeal(id: string): void {
    const data = loadData();
    data.meals = data.meals.filter(m => m.id !== id);
    saveData(data);
}

// Weight operations
export function addWeightEntry(entry: Omit<WeightEntry, 'id' | 'createdAt'>): WeightEntry {
    const data = loadData();
    // Remove existing entry for the same date if exists
    data.weightEntries = data.weightEntries.filter(w => w.date !== entry.date);
    const newEntry: WeightEntry = {
        ...entry,
        id: generateId(),
        createdAt: new Date().toISOString()
    };
    data.weightEntries.push(newEntry);
    saveData(data);
    return newEntry;
}

export function getWeightEntries(): WeightEntry[] {
    return loadData().weightEntries.sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
}

export function getWeightByDate(date: string): WeightEntry | undefined {
    return loadData().weightEntries.find(w => w.date === date);
}

export function deleteWeightEntry(id: string): void {
    const data = loadData();
    data.weightEntries = data.weightEntries.filter(w => w.id !== id);
    saveData(data);
}

// Settings
export function getSettings(): AppSettings {
    return loadData().settings;
}

export function updateSettings(settings: Partial<AppSettings>): void {
    const data = loadData();
    data.settings = { ...data.settings, ...settings };
    saveData(data);
}
