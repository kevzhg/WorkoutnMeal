import { Training, Meal, WeightEntry, WorkoutProgram, WorkoutProgramInput, ActiveWorkout, OmitId, OnigiriPlanner } from './types.js';
/**
 * Fetches trainings, meals, and weight entries from the server and populates the local 'db' object.
 * This should be called once when the app starts.
 */
export declare function initStorage(): Promise<void>;
export declare const getTrainings: () => Training[];
export declare const getTrainingsByDate: (date: string) => Training[];
export declare const getTrainingById: (id: string) => Training | undefined;
export declare function addTraining(trainingData: OmitId<Training>): Promise<void>;
export declare function updateTraining(id: string, updates: Partial<Training>): Promise<Training | null>;
export declare function deleteTraining(id: string): Promise<void>;
export declare const getMeals: () => Meal[];
export declare const getMealsByDate: (date: string) => Meal[];
export declare function addMeal(mealData: OmitId<Meal>): Promise<void>;
export declare function deleteMeal(id: string): Promise<void>;
export declare const getWeightEntries: () => WeightEntry[];
export declare const getWeightByDate: (date: string) => WeightEntry | undefined;
export declare function addWeightEntry(weightData: OmitId<WeightEntry>): Promise<void>;
export declare function deleteWeightEntry(id: string): Promise<void>;
export declare function getWorkoutPrograms(): WorkoutProgram[];
export declare function getWorkoutProgramById(id: string): WorkoutProgram | undefined;
export declare function addWorkoutProgram(programData: WorkoutProgramInput): Promise<WorkoutProgram>;
export declare function updateWorkoutProgram(id: string, updates: Partial<WorkoutProgram>): Promise<WorkoutProgram | null>;
export declare function deleteWorkoutProgram(id: string): Promise<void>;
export declare function cloneWorkoutProgram(id: string): Promise<WorkoutProgram | null>;
export declare function getOnigiriPlanner(): Promise<OnigiriPlanner>;
export declare function saveOnigiriPlanner(planner: OnigiriPlanner): Promise<OnigiriPlanner>;
export declare function getActiveWorkout(): ActiveWorkout | null;
export declare function saveActiveWorkout(workout: ActiveWorkout): void;
export declare function clearActiveWorkout(): void;
//# sourceMappingURL=storage.d.ts.map