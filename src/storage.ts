// Storage management with JSON API backend
// Falls back to localStorage if API is unavailable

import { AppData, Workout, Meal, WeightEntry, AppSettings } from './types.js';

const API_BASE = 'http://localhost:3001/api';
const STORAGE_KEY = 'fitness-tracker-data';

const DEFAULT_DATA: AppData = {
    workouts: [],
    meals: [],
    weightEntries: [],
    settings: {
        defaultWeightUnit: 'lbs'
    }
};

// In-memory cache
let cachedData: AppData = { ...DEFAULT_DATA };
let useAPI = true;

// Initialize - try to load from API, fall back to localStorage
export async function initStorage(): Promise<AppData> {
    try {
        const response = await fetch(`${API_BASE}/data`);
        if (response.ok) {
            cachedData = await response.json();
            useAPI = true;
            console.log('Connected to JSON database');
            return cachedData;
        }
    } catch {
        console.log('API unavailable, using localStorage');
        useAPI = false;
    }

    // Fallback to localStorage
    cachedData = loadFromLocalStorage();
    return cachedData;
}

function loadFromLocalStorage(): AppData {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return { ...DEFAULT_DATA, ...JSON.parse(stored) };
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
    return { ...DEFAULT_DATA };
}

function saveToLocalStorage(): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedData));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

export function loadData(): AppData {
    return cachedData;
}

export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Workout operations
export async function addWorkout(workout: Omit<Workout, 'id' | 'createdAt'>): Promise<Workout> {
    if (useAPI) {
        try {
            const response = await fetch(`${API_BASE}/workouts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workout)
            });
            const newWorkout = await response.json();
            cachedData.workouts.push(newWorkout);
            cachedData.workouts.sort((a, b) => b.date.localeCompare(a.date));
            return newWorkout;
        } catch (error) {
            console.error('API error, falling back to localStorage:', error);
            useAPI = false;
        }
    }

    // Fallback
    const newWorkout: Workout = {
        ...workout,
        id: generateId(),
        createdAt: new Date().toISOString()
    };
    cachedData.workouts.push(newWorkout);
    cachedData.workouts.sort((a, b) => b.date.localeCompare(a.date));
    saveToLocalStorage();
    return newWorkout;
}

export function getWorkouts(): Workout[] {
    return [...cachedData.workouts].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
}

export function getWorkoutsByDate(date: string): Workout[] {
    return getWorkouts().filter(w => w.date === date);
}

export async function deleteWorkout(id: string): Promise<void> {
    if (useAPI) {
        try {
            await fetch(`${API_BASE}/workouts/${id}`, { method: 'DELETE' });
        } catch (error) {
            console.error('API error:', error);
        }
    }
    cachedData.workouts = cachedData.workouts.filter(w => w.id !== id);
    if (!useAPI) saveToLocalStorage();
}

// Meal operations
export async function addMeal(meal: Omit<Meal, 'id' | 'createdAt'>): Promise<Meal> {
    if (useAPI) {
        try {
            const response = await fetch(`${API_BASE}/meals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(meal)
            });
            const newMeal = await response.json();
            cachedData.meals.push(newMeal);
            cachedData.meals.sort((a, b) => b.date.localeCompare(a.date));
            return newMeal;
        } catch (error) {
            console.error('API error, falling back to localStorage:', error);
            useAPI = false;
        }
    }

    const newMeal: Meal = {
        ...meal,
        id: generateId(),
        createdAt: new Date().toISOString()
    };
    cachedData.meals.push(newMeal);
    cachedData.meals.sort((a, b) => b.date.localeCompare(a.date));
    saveToLocalStorage();
    return newMeal;
}

export function getMeals(): Meal[] {
    return [...cachedData.meals].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
}

export function getMealsByDate(date: string): Meal[] {
    return getMeals().filter(m => m.date === date);
}

export async function deleteMeal(id: string): Promise<void> {
    if (useAPI) {
        try {
            await fetch(`${API_BASE}/meals/${id}`, { method: 'DELETE' });
        } catch (error) {
            console.error('API error:', error);
        }
    }
    cachedData.meals = cachedData.meals.filter(m => m.id !== id);
    if (!useAPI) saveToLocalStorage();
}

// Weight operations
export async function addWeightEntry(entry: Omit<WeightEntry, 'id' | 'createdAt'>): Promise<WeightEntry> {
    if (useAPI) {
        try {
            const response = await fetch(`${API_BASE}/weight`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry)
            });
            const newEntry = await response.json();
            // Remove existing entry for the same date
            cachedData.weightEntries = cachedData.weightEntries.filter(w => w.date !== entry.date);
            cachedData.weightEntries.push(newEntry);
            cachedData.weightEntries.sort((a, b) => a.date.localeCompare(b.date));
            return newEntry;
        } catch (error) {
            console.error('API error, falling back to localStorage:', error);
            useAPI = false;
        }
    }

    cachedData.weightEntries = cachedData.weightEntries.filter(w => w.date !== entry.date);
    const newEntry: WeightEntry = {
        ...entry,
        id: generateId(),
        createdAt: new Date().toISOString()
    };
    cachedData.weightEntries.push(newEntry);
    cachedData.weightEntries.sort((a, b) => a.date.localeCompare(b.date));
    saveToLocalStorage();
    return newEntry;
}

export function getWeightEntries(): WeightEntry[] {
    return [...cachedData.weightEntries].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
}

export function getWeightByDate(date: string): WeightEntry | undefined {
    return cachedData.weightEntries.find(w => w.date === date);
}

export async function deleteWeightEntry(id: string): Promise<void> {
    if (useAPI) {
        try {
            await fetch(`${API_BASE}/weight/${id}`, { method: 'DELETE' });
        } catch (error) {
            console.error('API error:', error);
        }
    }
    cachedData.weightEntries = cachedData.weightEntries.filter(w => w.id !== id);
    if (!useAPI) saveToLocalStorage();
}

// Settings
export function getSettings(): AppSettings {
    return cachedData.settings;
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<void> {
    cachedData.settings = { ...cachedData.settings, ...settings };

    if (useAPI) {
        try {
            await fetch(`${API_BASE}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cachedData.settings)
            });
        } catch (error) {
            console.error('API error:', error);
        }
    } else {
        saveToLocalStorage();
    }
}
