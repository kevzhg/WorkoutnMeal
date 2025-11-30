export type OmitId<T> = Omit<T, 'id'>;
export type TrainingType = 'strength' | 'cardio' | 'hiit' | 'yoga' | 'stretching' | 'sports' | 'other';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type WeightUnit = 'lbs' | 'kg';
export declare const TRAINING_TYPE_LABELS: Record<TrainingType, string>;
export declare const MEAL_TYPE_LABELS: Record<MealType, string>;
export interface TrainingSetEntry {
    setNumber: number;
    weight?: number;
    reps?: number | string;
    completed: boolean;
    completedAt?: string;
}
export interface TrainingExerciseEntry {
    exerciseId: string;
    name: string;
    notes?: string;
    elapsedMs?: number;
    sets: TrainingSetEntry[];
}
export interface Training {
    id?: string;
    _id?: string;
    date: string;
    type: TrainingType;
    durationMinutes: number;
    programName?: string;
    exercises: TrainingExerciseEntry[];
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface Meal {
    id?: string;
    _id?: string;
    date: string;
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
    date: string;
    weight: number;
    unit: WeightUnit;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}
export type ProgramType = 'push' | 'pull' | 'legs';
export type ExerciseType = 'power' | 'hypertrophy' | 'compound' | 'flexibility' | 'cardio';
export interface Exercise {
    id: string;
    name: string;
    sets: number;
    reps: number | string;
    restTime: number;
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
    createdAt: string;
    updatedAt?: string;
    source?: 'local' | 'api';
}
export interface ExerciseSet {
    setNumber: number;
    completed: boolean;
    completedAt?: string;
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
    startTime: string;
    exercises: ActiveExercise[];
    currentExerciseIndex: number;
    isResting: boolean;
    restStartTime?: string;
    restDuration?: number;
    paused: boolean;
}
export interface WorkoutProgramDocument extends WorkoutProgram {
    _id?: string;
}
export type WorkoutProgramInput = OmitId<WorkoutProgram> & {
    id?: string;
};
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
//# sourceMappingURL=types.d.ts.map