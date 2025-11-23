// Type definitions for the Fitness Tracker application

export interface Workout {
    id: string;
    date: string;
    type: WorkoutType;
    duration: number; // in minutes
    exercises: string;
    notes: string;
    createdAt: string;
}

export type WorkoutType =
    | 'strength'
    | 'cardio'
    | 'hiit'
    | 'yoga'
    | 'stretching'
    | 'sports'
    | 'other';

export interface Meal {
    id: string;
    date: string;
    type: MealType;
    name: string;
    calories?: number;
    protein?: number;
    description: string;
    createdAt: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface WeightEntry {
    id: string;
    date: string;
    weight: number;
    unit: WeightUnit;
    notes: string;
    createdAt: string;
}

export type WeightUnit = 'lbs' | 'kg';

export interface AppData {
    workouts: Workout[];
    meals: Meal[];
    weightEntries: WeightEntry[];
    settings: AppSettings;
}

export interface AppSettings {
    defaultWeightUnit: WeightUnit;
}

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
    strength: 'Strength Training',
    cardio: 'Cardio',
    hiit: 'HIIT',
    yoga: 'Yoga',
    stretching: 'Stretching',
    sports: 'Sports',
    other: 'Other'
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack'
};
