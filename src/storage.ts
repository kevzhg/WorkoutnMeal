import {
    Training,
    Meal,
    WeightEntry,
    WorkoutProgram,
    WorkoutProgramDocument,
    WorkoutProgramInput,
    Exercise,
    ExerciseType,
    ActiveWorkout,
    OmitId,
    OnigiriPlanner
} from './types.js';

const ACTIVE_WORKOUT_KEY = 'fitness-tracker-active-workout';
const WORKOUT_PROGRAMS_KEY = 'fitness-tracker-programs';
const ONIGIRI_PLANNER_KEY = 'onigiri-planner';
// Allow overriding the API base URL via a global for prod (GitHub Pages) while keeping localhost as the dev default.
const API_BASE_URL = (typeof window !== 'undefined' && (window as any).API_BASE_URL) || 'http://localhost:8000/api';

function generateProgramId(existingIds?: Set<string>): string {
    const used = existingIds ?? new Set<string>();
    let id = '';
    do {
        id = `program-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    } while (used.has(id));
    return id;
}

function generatePlannerId(): string {
    return `onigiri-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

interface Database {
    trainings: Training[];
    meals: Meal[];
    weight: WeightEntry[];
    onigiriPlanner?: OnigiriPlanner;
}

// This will hold all data fetched from the server
let db: Database = { trainings: [], meals: [], weight: [] };

/**
 * Fetches trainings, meals, and weight entries from the server and populates the local 'db' object.
 * This should be called once when the app starts.
 */
export async function initStorage(): Promise<void> {
    try {
        const [trainings, meals, weight] = await Promise.all([
            apiGet<Training[]>('trainings'),
            apiGet<Meal[]>('meals'),
            apiGet<WeightEntry[]>('weight')
        ]);

        db.trainings = trainings.map(normalizeTraining);
        db.meals = meals.map(normalizeMeal);
        db.weight = weight.map(normalizeWeight);
        console.log('Database initialized from server', db);
    } catch (error) {
        console.error("Error initializing storage:", error);
        // Initialize with empty structure if server fails
        db = { trainings: [], meals: [], weight: [] };
    }
}

// --- Generic API Functions ---

async function apiGet<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`);
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API GET to ${endpoint} failed: ${response.status} ${errorBody}`);
    }
    return response.json();
}

async function apiPost<T>(endpoint: string, data: OmitId<T>): Promise<T> {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API POST to ${endpoint} failed: ${response.status} ${errorBody}`);
    }
    return response.json();
}

async function apiPut<T>(endpoint: string, data: Partial<T>): Promise<T> {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API PUT to ${endpoint} failed: ${response.status} ${errorBody}`);
    }
    return response.json();
}

async function apiDelete(endpoint: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, { method: 'DELETE' });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API DELETE to ${endpoint} failed: ${response.status} ${errorBody}`);
    }
}

// Convert backend _id to id to keep frontend consistent
function normalizeTraining(raw: Training): Training {
    const id = (raw as any).id ?? (raw as any)._id;
    const cleaned = { ...raw, id: id ? String(id) : undefined };
    delete (cleaned as any)._id;
    return cleaned;
}

function normalizeMeal(raw: Meal): Meal {
    const id = (raw as any).id ?? (raw as any)._id;
    const cleaned = { ...raw, id: id ? String(id) : undefined };
    delete (cleaned as any)._id;
    return cleaned;
}

function normalizeWeight(raw: WeightEntry): WeightEntry {
    const id = (raw as any).id ?? (raw as any)._id;
    const cleaned = { ...raw, id: id ? String(id) : undefined };
    delete (cleaned as any)._id;
    return cleaned;
}

function normalizeOnigiriPlanner(raw: OnigiriPlanner): OnigiriPlanner {
    const plannerId = (raw as any).id ?? (raw as any)._id ?? generatePlannerId();
    const sections = Array.isArray(raw.sections) ? raw.sections : [];
    const normalizedSections = sections.map(section => {
        const sectionId = (section as any).id ?? generatePlannerId();
        const items = Array.isArray(section.items) ? section.items : [];
        const normalizedItems = items.map(item => ({
            id: (item as any).id ?? generatePlannerId(),
            title: item.title ?? 'New Item',
            notes: item.notes ?? '',
            weight: typeof item.weight === 'number' && Number.isFinite(item.weight) && item.weight > 0 ? item.weight : 1,
            done: Boolean(item.done),
            completion: item.completion,
            updatedAt: item.updatedAt
        }));

        return {
            id: sectionId,
            name: section.name ?? 'Untitled Section',
            weight: typeof section.weight === 'number' && Number.isFinite(section.weight) && section.weight > 0 ? section.weight : 1,
            items: normalizedItems,
            completion: section.completion,
            updatedAt: section.updatedAt
        };
    });

    return {
        id: String(plannerId),
        sections: normalizedSections,
        completion: raw.completion,
        updatedAt: raw.updatedAt
    };
}

function normalizeWorkoutProgram(raw: WorkoutProgramDocument): WorkoutProgram {
    const id = (raw as any).id ?? (raw as any)._id ?? `program-${Date.now()}`;
    const cleaned: WorkoutProgram = ensureExerciseTypes({
        ...raw,
        id: String(id),
        createdAt: raw.createdAt ?? new Date().toISOString(),
        updatedAt: raw.updatedAt,
        source: raw.source ?? 'local'
    });
    delete (cleaned as any)._id;
    return cleaned;
}

function normalizeAndDedupePrograms(rawPrograms: WorkoutProgramDocument[]): { programs: WorkoutProgram[]; updated: boolean } {
    const seen = new Set<string>();
    const programs: WorkoutProgram[] = [];
    let updated = false;

    for (const raw of rawPrograms) {
        const normalized = normalizeWorkoutProgram(raw);
        let programId = normalized.id;
        if (!programId || seen.has(programId)) {
            programId = generateProgramId(seen);
            normalized.id = programId;
            updated = true;
        }
        seen.add(programId);
        programs.push(normalized);
    }

    return { programs, updated };
}

function ensureExerciseTypes<T extends { exercises: Exercise[] }>(program: T): T {
    const withTypes = {
        ...program,
        exercises: program.exercises.map(ex => ({
            ...ex,
            exerciseType: ex.exerciseType ?? ('compound' as ExerciseType)
        }))
    };
    return withTypes;
}

// --- Training Management ---

export const getTrainings = (): Training[] => db.trainings;
export const getTrainingsByDate = (date: string): Training[] => db.trainings.filter(w => w.date === date);
export const getTrainingById = (id: string): Training | undefined => db.trainings.find(w => w.id === id);

export async function addTraining(trainingData: OmitId<Training>): Promise<void> {
    try {
        const payload = { ...trainingData } as Record<string, unknown>;
        delete payload.id;
        delete payload._id;

        const newTraining = normalizeTraining(await apiPost<Training>('trainings', payload as OmitId<Training>));
        db.trainings.push(newTraining);
        console.log('Training saved successfully via API');
    } catch (error) {
        console.error('Error in addTraining:', error);
        alert('Could not save training. Please check the server connection and try again.');
        throw error; // Re-throw to stop calling function
    }
}

export async function updateTraining(id: string, updates: Partial<Training>): Promise<Training | null> {
    try {
        const payload = { ...updates } as Record<string, unknown>;
        delete payload.id;
        delete payload._id;

        const updated = normalizeTraining(await apiPut<Training>(`trainings/${id}`, payload as Partial<Training>));
        db.trainings = db.trainings.map(w => w.id === id ? updated : w);
        return updated;
    } catch (error) {
        console.error('Error in updateTraining:', error);
        alert('Could not update training. Please check the server connection and try again.');
        return null;
    }
}

export async function deleteTraining(id: string): Promise<void> {
    try {
        await apiDelete(`trainings/${id}`);
        db.trainings = db.trainings.filter(w => w.id !== id);
    } catch (error) {
        console.error('Error in deleteTraining:', error);
        alert('Could not delete training. Please check the server connection and try again.');
        throw error;
    }
}

// --- Meal Management ---

export const getMeals = (): Meal[] => db.meals;
export const getMealsByDate = (date: string): Meal[] => db.meals.filter(m => m.date === date);

export async function addMeal(mealData: OmitId<Meal>): Promise<void> {
    try {
        const payload = { ...mealData } as Record<string, unknown>;
        delete payload.id;
        delete payload._id;

        const newMeal = normalizeMeal(await apiPost<Meal>('meals', payload as OmitId<Meal>));
        db.meals.push(newMeal);
    } catch (error) {
        console.error('Error in addMeal:', error);
        alert('Could not save meal. Please check the server connection and try again.');
        throw error;
    }
}

export async function deleteMeal(id: string): Promise<void> {
    try {
        await apiDelete(`meals/${id}`);
        db.meals = db.meals.filter(m => m.id !== id);
    } catch (error) {
        console.error('Error in deleteMeal:', error);
        alert('Could not delete meal. Please check the server connection and try again.');
        throw error;
    }
}

// --- Weight Management ---

export const getWeightEntries = (): WeightEntry[] => db.weight;
export const getWeightByDate = (date: string): WeightEntry | undefined => db.weight.find(w => w.date === date);

export async function addWeightEntry(weightData: OmitId<WeightEntry>): Promise<void> {
    try {
        const payload = { ...weightData } as Record<string, unknown>;
        delete payload.id;
        delete payload._id;

        const newWeight = normalizeWeight(await apiPost<WeightEntry>('weight', payload as OmitId<WeightEntry>));
        db.weight.push(newWeight);
    } catch (error) {
        console.error('Error in addWeightEntry:', error);
        alert('Could not save weight entry. Please check the server connection and try again.');
        throw error;
    }
}

export async function deleteWeightEntry(id:string): Promise<void> {
    try {
        await apiDelete(`weight/${id}`);
        db.weight = db.weight.filter(w => w.id !== id);
    } catch (error) {
        console.error('Error in deleteWeightEntry:', error);
        alert('Could not delete weight entry. Please check the server connection and try again.');
        throw error;
    }
}

// --- Workout Program Management (uses localStorage) ---
// These are fine to keep in localStorage as they are more like app configuration,
// but persistence hooks are ready for a future Mongo-backed collection.

export function getWorkoutPrograms(): WorkoutProgram[] {
    try {
        const data = localStorage.getItem(WORKOUT_PROGRAMS_KEY);
        if (!data) return [];
        const rawPrograms = JSON.parse(data) as WorkoutProgramDocument[];
        const { programs, updated } = normalizeAndDedupePrograms(rawPrograms);
        const withTypes = programs.map(p => ensureExerciseTypes(p));
        if (updated) {
            localStorage.setItem(WORKOUT_PROGRAMS_KEY, JSON.stringify(withTypes));
        }
        return withTypes;
    } catch (error) {
        console.error('Error loading workout programs:', error);
        return [];
    }
}

export function getWorkoutProgramById(id: string): WorkoutProgram | undefined {
    return getWorkoutPrograms().find(p => p.id === id);
}

export async function addWorkoutProgram(programData: WorkoutProgramInput): Promise<WorkoutProgram> {
    const programs = getWorkoutPrograms();
    const existingIds = new Set(programs.map(p => p.id).filter(Boolean) as string[]);
    const now = new Date().toISOString();
    const newProgram: WorkoutProgram = ensureExerciseTypes({
        ...programData,
        id: programData.id ?? generateProgramId(existingIds),
        createdAt: programData.createdAt ?? now,
        updatedAt: now,
        source: programData.source ?? 'local'
    });
    programs.push(newProgram);
    await persistWorkoutPrograms(programs);
    return newProgram;
}

export async function updateWorkoutProgram(id: string, updates: Partial<WorkoutProgram>): Promise<WorkoutProgram | null> {
    const programs = getWorkoutPrograms();
    const idx = programs.findIndex(p => p.id === id);
    if (idx === -1) return null;

    const updated: WorkoutProgram = ensureExerciseTypes({
        ...programs[idx],
        ...updates,
        updatedAt: new Date().toISOString()
    });

    programs[idx] = updated;
    await persistWorkoutPrograms(programs);
    return updated;
}

export async function deleteWorkoutProgram(id: string): Promise<void> {
    const programs = getWorkoutPrograms().filter(p => p.id !== id);
    await persistWorkoutPrograms(programs);
}

export async function cloneWorkoutProgram(id: string): Promise<WorkoutProgram | null> {
    const programs = getWorkoutPrograms();
    const program = programs.find(p => p.id === id);
    if (!program) return null;

    const now = new Date().toISOString();
    const clonedExercises: Exercise[] = program.exercises.map(ex => ({ ...ex, exerciseType: ex.exerciseType ?? 'compound' }));
    const existingIds = new Set(programs.map(p => p.id).filter(Boolean) as string[]);
    const clone: WorkoutProgram = {
        ...program,
        id: generateProgramId(existingIds),
        displayName: `${program.displayName} (Copy)`,
        createdAt: now,
        updatedAt: now,
        exercises: clonedExercises,
        source: 'local'
    };

    const nextPrograms = [...programs, clone];
    await persistWorkoutPrograms(nextPrograms);
    return clone;
}

async function persistWorkoutPrograms(programs: WorkoutProgram[]): Promise<void> {
    localStorage.setItem(WORKOUT_PROGRAMS_KEY, JSON.stringify(programs));
    await persistWorkoutProgramsToApi(programs);
}

async function persistWorkoutProgramsToApi(_programs: WorkoutProgramDocument[]): Promise<void> {
    // Stub for future Mongo-backed persistence when an API endpoint exists.
    return Promise.resolve();
}

// --- Onigiri Planner (API-first with local fallback) ---

function getLocalOnigiriPlanner(): OnigiriPlanner | null {
    try {
        const data = localStorage.getItem(ONIGIRI_PLANNER_KEY);
        return data ? normalizeOnigiriPlanner(JSON.parse(data)) : null;
    } catch (error) {
        console.error('Error loading local Onigiri planner:', error);
        return null;
    }
}

function saveLocalOnigiriPlanner(planner: OnigiriPlanner): void {
    try {
        localStorage.setItem(ONIGIRI_PLANNER_KEY, JSON.stringify(planner));
    } catch (error) {
        console.error('Error saving local Onigiri planner:', error);
    }
}

export async function getOnigiriPlanner(): Promise<OnigiriPlanner> {
    try {
        const remote = await apiGet<OnigiriPlanner>('onigiri');
        const normalized = normalizeOnigiriPlanner(remote);
        db.onigiriPlanner = normalized;
        saveLocalOnigiriPlanner(normalized);
        return normalized;
    } catch (error) {
        console.error('Error fetching Onigiri planner from API:', error);
        const local = getLocalOnigiriPlanner();
        if (local) {
            db.onigiriPlanner = local;
            return local;
        }
        throw error;
    }
}

export async function saveOnigiriPlanner(planner: OnigiriPlanner): Promise<OnigiriPlanner> {
    try {
        const payload = { ...planner } as Record<string, unknown>;
        delete payload._id;
        const saved = normalizeOnigiriPlanner(await apiPut<OnigiriPlanner>('onigiri', payload as Partial<OnigiriPlanner>));
        db.onigiriPlanner = saved;
        saveLocalOnigiriPlanner(saved);
        return saved;
    } catch (error) {
        console.error('Error saving Onigiri planner:', error);
        saveLocalOnigiriPlanner(planner);
        throw error;
    }
}

// --- Active Workout Management (uses localStorage) ---
// This is session state, so localStorage is the perfect place for it.

export function getActiveWorkout(): ActiveWorkout | null {
    try {
        const data = localStorage.getItem(ACTIVE_WORKOUT_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error getting active workout:', error);
        return null;
    }
}

export function saveActiveWorkout(workout: ActiveWorkout): void {
    localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(workout));
}

export function clearActiveWorkout(): void {
    localStorage.removeItem(ACTIVE_WORKOUT_KEY);
}
