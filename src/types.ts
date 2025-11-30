// Utility type to create a new type without the 'id' property
export type OmitId<T> = Omit<T, 'id'>;

// --- General Types ---

export type TrainingType = 'strength' | 'cardio' | 'hiit' | 'yoga' | 'stretching' | 'sports' | 'other';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type WeightUnit = 'lbs' | 'kg';

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
    strength: 'Strength',
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

// --- Data Models (as stored in the database) ---

export interface TrainingSetEntry {
    setNumber: number;
    weight?: number;
    reps?: number | string;
    completed: boolean;
    completedAt?: string; // ISO date string
}

export interface TrainingExerciseEntry {
    exerciseId: string;
    name: string;
    notes?: string;
    elapsedMs?: number; // time spent on this exercise
    sets: TrainingSetEntry[];
}

export interface Training {
    id?: string; // convenience for frontend (maps from _id)
    _id?: string; // MongoDB ID as string
    date: string; // YYYY-MM-DD
    type: TrainingType;
    durationMinutes: number; // total duration in minutes
    programName?: string;
    exercises: TrainingExerciseEntry[];
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Meal {
    id?: string;
    _id?: string;
    date: string; // YYYY-MM-DD
    type: MealType;
    name: string;
    calories?: number;
    protein?: number;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface WeightEntry {
    id?: string;
    _id?: string;
    date: string; // YYYY-MM-DD
    weight: number;
    unit: WeightUnit;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

// --- Live Workout & Programs ---

export type ProgramType = 'push' | 'pull' | 'legs';
export type ExerciseType = 'power' | 'hypertrophy' | 'compound' | 'flexibility' | 'cardio';

export interface Exercise {
    id: string;
    name: string;
    sets: number;
    reps: number | string; // e.g., 8 or "8-12"
    restTime: number; // in seconds
    notes?: string;
    exerciseType?: ExerciseType;
}

export interface ExerciseLibraryItem extends Exercise {
    category: ProgramType;
    muscles?: string[];
    equipment?: string;
}

export interface WorkoutProgram {
    id: string;
    name: ProgramType;
    displayName: string;
    exercises: Exercise[];
    createdAt: string; // ISO date string
    updatedAt?: string;
    source?: 'local' | 'api';
}

export interface ExerciseSet {
    setNumber: number;
    completed: boolean;
    completedAt?: string; // ISO date string
    weight?: number;
    actualReps?: number;
}

export interface ActiveExercise {
    exerciseId: string;
    sets: ExerciseSet[];
    currentSet: number;
    elapsedMs?: number;
}

export interface ActiveWorkout {
    programId: string;
    programName: string;
    startTime: string; // ISO date string
    exercises: ActiveExercise[];
    currentExerciseIndex: number;
    isResting: boolean;
    restStartTime?: string; // ISO date string
    restDuration?: number; // in milliseconds
    paused: boolean;
}

export interface WorkoutProgramDocument extends WorkoutProgram {
    _id?: string;
}

export type WorkoutProgramInput = OmitId<WorkoutProgram> & { id?: string };

// --- Onigiri Planner ---

export interface OnigiriItem {
    id: string;
    title: string;
    notes?: string;
    weight: number;
    done: boolean;
    completion?: number;
    updatedAt?: string;
}

export interface OnigiriSection {
    id: string;
    name: string;
    weight: number;
    items: OnigiriItem[];
    completion?: number;
    updatedAt?: string;
}

export interface OnigiriPlanner {
    id: string;
    sections: OnigiriSection[];
    completion?: number;
    updatedAt?: string;
}
