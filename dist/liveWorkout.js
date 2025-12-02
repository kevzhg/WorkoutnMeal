// Live Workout Module
// Handles active workout session, timers, and exercise tracking
import { getActiveWorkout, saveActiveWorkout, clearActiveWorkout, getWorkoutPrograms, getWorkoutProgramById, addTraining, addWorkoutProgram, updateWorkoutProgram, cloneWorkoutProgram, deleteWorkoutProgram, getTrainings, getExerciseLibraryItems, addExerciseDefinition, updateExerciseDefinition } from './storage.js';
// Default workout programs (placeholder until user provides specifics)
const DEFAULT_PROGRAMS = [
    {
        id: 'program-default-push',
        name: 'push',
        displayName: 'Push: Power + Shoulder Care',
        exercises: [
            { id: 'push-warmup-external-rotations', name: 'Dumbbell External Rotations', sets: 2, reps: '15 each arm', restTime: 45, notes: 'Rotator cuff rehab; control, not strength.', exerciseType: 'flexibility' },
            { id: 'push-a-bench-press', name: 'Bench Press', sets: 4, reps: 5, restTime: 150, notes: 'Power/Strength; heavy focus.', exerciseType: 'power' },
            { id: 'push-b-incline-dumbbell-press', name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', restTime: 90, notes: 'Hypertrophy; shoulder-friendly ROM.', exerciseType: 'hypertrophy' },
            { id: 'push-c-stand-ohp', name: 'Dumbbell Overhead Press (Standing)', sets: 3, reps: '8-10', restTime: 90, notes: 'Shoulders; controlled tempo.', exerciseType: 'compound' },
            { id: 'push-d1-reverse-fly', name: 'Incline Dumbbell Reverse Fly', sets: 3, reps: '12-15', restTime: 60, notes: 'Rear delt/cuff health; squeeze shoulder blades.', exerciseType: 'hypertrophy' },
            { id: 'push-d2-weighted-dips', name: 'Weighted Dips', sets: 3, reps: '8-12', restTime: 90, notes: 'Compound triceps/chest; control depth to avoid shoulder pain.', exerciseType: 'compound' }
        ],
        createdAt: new Date().toISOString()
    },
    {
        id: 'program-default-pull',
        name: 'pull',
        displayName: 'Pull: Strength + Grip',
        exercises: [
            { id: 'pull-warmup-scapular-pullups', name: 'Scapular Pull-ups (or Hangs)', sets: 2, reps: 10, restTime: 45, notes: 'Shoulder blade control; depress shoulders fully.', exerciseType: 'flexibility' },
            { id: 'pull-a-deadlift', name: 'Deadlift (Conventional or Sumo)', sets: 4, reps: '3-5', restTime: 180, notes: 'Power/full-body strength; prioritize form.', exerciseType: 'power' },
            { id: 'pull-b-weighted-pullups', name: 'Weighted Pull-ups (or Band-Assisted)', sets: 4, reps: '5-8', restTime: 120, notes: 'Strength/back width; progress weight or assistance.', exerciseType: 'power' },
            { id: 'pull-c-single-arm-rows', name: 'Single-Arm Dumbbell Rows', sets: 3, reps: '10-12 each arm', restTime: 90, notes: 'Unilateral back; stability.', exerciseType: 'compound' },
            { id: 'pull-d1-bicep-curl', name: 'Dumbbell Bicep Curl', sets: 3, reps: '10-12', restTime: 60, notes: 'Biceps focus.', exerciseType: 'hypertrophy' },
            { id: 'pull-d2-farmers-carries', name: 'Dumbbell Farmer\'s Carries', sets: 3, reps: '40-60 sec', restTime: 75, notes: 'Grip/core/traps; walk for time or distance.', exerciseType: 'compound' }
        ],
        createdAt: new Date().toISOString()
    },
    {
        id: 'program-default-legs',
        name: 'legs',
        displayName: 'Legs: Mobility + Strength',
        exercises: [
            { id: 'legs-warmup-straight-leg-raise', name: 'Active Straight Leg Raise & 90/90 Hip Rotations', sets: 1, reps: '5 mins', restTime: 30, notes: 'Leg mobility; gentle ROM increase.', exerciseType: 'flexibility' },
            { id: 'legs-a-goblet-squat', name: 'Goblet Squat (or Box Squat)', sets: 4, reps: '8-12', restTime: 120, notes: 'Mobility-friendly; box limits depth safely.', exerciseType: 'compound' },
            { id: 'legs-b-reverse-lunge', name: 'Reverse Lunges (or Split Squats)', sets: 3, reps: '10-12 each leg', restTime: 90, notes: 'Unilateral/stability; knee/hip friendly.', exerciseType: 'compound' },
            { id: 'legs-c1-dumbbell-rdl', name: 'Dumbbell RDL (Romanian Deadlift)', sets: 3, reps: '10-12', restTime: 90, notes: 'Hamstrings/hips; slow, controlled hinge.', exerciseType: 'hypertrophy' },
            { id: 'legs-c2-low-box-jumps', name: 'Low Box Jumps/Step-ups', sets: 3, reps: '8-10', restTime: 75, notes: 'Plyometric/quads; soft landings or quick step-ups.', exerciseType: 'power' },
            { id: 'legs-d-calves-core', name: 'Calves/Core Circuit', sets: 3, reps: 'Calf raises + plank 30-60s', restTime: 45, notes: 'Standing calf raises (with DBs) plus plank (30-60 sec).', exerciseType: 'compound' }
        ],
        createdAt: new Date().toISOString()
    }
];
const DEFAULT_EXERCISE_LIBRARY = buildDefaultExerciseLibrary();
let exerciseLibrary = [];
let builderExercises = [];
let editingProgramId = null;
let builderCategory = 'push';
const CATEGORY_LABELS = { push: 'Push', pull: 'Pull', legs: 'Legs' };
const expandedCategories = new Set();
let libraryFilterCategory = 'all';
let libraryFilterType = 'all';
let librarySearchTerm = '';
let activeTab = 'start';
let editingLibraryExerciseId = null;
function buildDefaultExerciseLibrary() {
    const seen = new Map();
    const meta = {
        'Dumbbell External Rotations': { muscles: ['Rotator Cuff'], equipment: 'Light Dumbbells', exerciseType: 'flexibility' },
        'Bench Press': { muscles: ['Chest', 'Triceps', 'Shoulders'], equipment: 'Barbell, Bench', exerciseType: 'power' },
        'Incline Dumbbell Press': { muscles: ['Chest', 'Shoulders'], equipment: 'Dumbbells, Bench', exerciseType: 'hypertrophy' },
        'Dumbbell Overhead Press (Standing)': { muscles: ['Shoulders', 'Triceps'], equipment: 'Dumbbells', exerciseType: 'compound' },
        'Incline Dumbbell Reverse Fly': { muscles: ['Rear Delts', 'Upper Back'], equipment: 'Dumbbells, Bench', exerciseType: 'hypertrophy' },
        'Weighted Dips': { muscles: ['Chest', 'Triceps', 'Shoulders'], equipment: 'Dip Bars/Bench, Weight Belt', exerciseType: 'compound' },
        'Scapular Pull-ups (or Hangs)': { muscles: ['Upper Back', 'Scapular Stabilizers'], equipment: 'Pull-up Bar', exerciseType: 'flexibility' },
        'Deadlift (Conventional or Sumo)': { muscles: ['Back', 'Glutes', 'Hamstrings'], equipment: 'Barbell or Dumbbells', exerciseType: 'power' },
        'Weighted Pull-ups (or Band-Assisted)': { muscles: ['Back', 'Biceps'], equipment: 'Pull-up Bar, Weight/Band', exerciseType: 'power' },
        'Single-Arm Dumbbell Rows': { muscles: ['Lats', 'Back', 'Core'], equipment: 'Dumbbells, Bench', exerciseType: 'compound' },
        'Dumbbell Bicep Curl': { muscles: ['Biceps'], equipment: 'Dumbbells', exerciseType: 'hypertrophy' },
        'Dumbbell Farmer\'s Carries': { muscles: ['Grip', 'Traps', 'Core'], equipment: 'Heavy Dumbbells', exerciseType: 'compound' },
        'Active Straight Leg Raise & 90/90 Hip Rotations': { muscles: ['Hips', 'Hamstrings'], equipment: 'Floor', exerciseType: 'flexibility' },
        'Goblet Squat (or Box Squat)': { muscles: ['Quads', 'Glutes'], equipment: 'Dumbbell, Low Box', exerciseType: 'compound' },
        'Reverse Lunges (or Split Squats)': { muscles: ['Quads', 'Glutes'], equipment: 'Dumbbells', exerciseType: 'compound' },
        'Dumbbell RDL (Romanian Deadlift)': { muscles: ['Hamstrings', 'Glutes'], equipment: 'Dumbbells', exerciseType: 'hypertrophy' },
        'Low Box Jumps/Step-ups': { muscles: ['Quads', 'Glutes', 'Calves'], equipment: 'Low Box', exerciseType: 'power' },
        'Calves/Core Circuit': { muscles: ['Calves', 'Core'], equipment: 'Dumbbells, Bodyweight', exerciseType: 'compound' }
    };
    DEFAULT_PROGRAMS.forEach(program => {
        program.exercises.forEach(ex => {
            const key = ex.name.toLowerCase();
            if (!seen.has(key)) {
                const info = meta[ex.name] || {};
                seen.set(key, { ...ex, category: program.name, muscles: info.muscles, equipment: info.equipment, exerciseType: info.exerciseType ?? ex.exerciseType ?? 'compound' });
            }
        });
    });
    return Array.from(seen.values());
}
function mergeExerciseLibrary(items) {
    const map = new Map();
    const add = (ex) => {
        if (!ex || !ex.name)
            return;
        const key = (ex.id || ex.name).toLowerCase();
        if (!map.has(key)) {
            map.set(key, { ...ex, category: ex.category ?? 'push', exerciseType: ex.exerciseType ?? 'compound' });
        }
        else {
            map.set(key, { ...map.get(key), ...ex, category: ex.category ?? map.get(key).category ?? 'push', exerciseType: ex.exerciseType ?? map.get(key).exerciseType ?? 'compound' });
        }
    };
    items.forEach(add);
    DEFAULT_EXERCISE_LIBRARY.forEach(add);
    return Array.from(map.values());
}
function setExerciseLibrary(items) {
    exerciseLibrary = mergeExerciseLibrary(items);
    renderExerciseLibrary();
    renderExerciseOptions();
}
function resetExerciseForm() {
    const newName = document.getElementById('new-exercise-name');
    const newCategory = document.getElementById('new-exercise-category');
    const newType = document.getElementById('new-exercise-type');
    const newMuscles = document.getElementById('new-exercise-muscles');
    const newEquipment = document.getElementById('new-exercise-equipment');
    const newSets = document.getElementById('new-exercise-sets');
    const newReps = document.getElementById('new-exercise-reps');
    const newRest = document.getElementById('new-exercise-rest');
    const saveBtn = document.getElementById('save-exercise-btn');
    const cancelBtn = document.getElementById('cancel-exercise-btn');
    editingLibraryExerciseId = null;
    if (newName)
        newName.value = '';
    if (newCategory)
        newCategory.value = 'push';
    if (newType)
        newType.value = 'compound';
    if (newMuscles)
        newMuscles.value = '';
    if (newEquipment)
        newEquipment.value = '';
    if (newSets)
        newSets.value = '3';
    if (newReps)
        newReps.value = '10';
    if (newRest)
        newRest.value = '60';
    if (saveBtn)
        saveBtn.textContent = 'Save Exercise';
    if (cancelBtn)
        cancelBtn.style.display = 'none';
}
// Timer state
let workoutTimer = null;
let restTimer = null;
let workoutStartTime = null;
let restEndTime = null;
let restBeepCtx = null;
let restBeepSource = null;
let restAudioPrimed = false;
const REST_LABEL_DEFAULT = 'Rest Time';
const WARMUP_LABEL = 'Warm Up';
const INITIAL_SESSION_REST_SECONDS = 300;
const DEFAULT_SET_REST_SECONDS = 60;
const LAST_SESSION_WEIGHTS_KEY = 'fitness-tracker-last-session-weights';
let lastSessionWeights = {};
// Weight memory - stores last used weight per exercise
const EXERCISE_WEIGHTS_KEY = 'fitness-tracker-exercise-weights';
function getRestSeconds(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : DEFAULT_SET_REST_SECONDS;
}
function unlockRestAudioContext() {
    if (restAudioPrimed)
        return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx)
        return;
    try {
        let ctx = restBeepCtx;
        if (!ctx) {
            ctx = new Ctx();
            restBeepCtx = ctx;
        }
        if (!ctx)
            return;
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => { });
        }
        restAudioPrimed = ctx.state === 'running';
    }
    catch (error) {
        console.error('Unable to initialize rest audio context', error);
    }
}
['touchstart', 'mousedown', 'keydown'].forEach(evt => {
    window.addEventListener(evt, () => unlockRestAudioContext(), { once: false, passive: true });
});
function toggleLiveHero(show) {
    const hero = document.getElementById('live-hero');
    if (hero) {
        hero.style.display = show ? '' : 'none';
    }
}
function getLastUsedWeight(exerciseId) {
    try {
        const stored = localStorage.getItem(EXERCISE_WEIGHTS_KEY);
        if (stored) {
            const weights = JSON.parse(stored);
            return weights[exerciseId];
        }
    }
    catch (error) {
        console.error('Error loading exercise weights:', error);
    }
    return undefined;
}
function saveLastUsedWeight(exerciseId, weight) {
    try {
        const stored = localStorage.getItem(EXERCISE_WEIGHTS_KEY);
        const weights = stored ? JSON.parse(stored) : {};
        weights[exerciseId] = weight;
        localStorage.setItem(EXERCISE_WEIGHTS_KEY, JSON.stringify(weights));
    }
    catch (error) {
        console.error('Error saving exercise weight:', error);
    }
}
function loadLastSessionWeights() {
    try {
        const stored = localStorage.getItem(LAST_SESSION_WEIGHTS_KEY);
        lastSessionWeights = stored ? JSON.parse(stored) : {};
    }
    catch (error) {
        console.error('Error loading last session weights:', error);
        lastSessionWeights = {};
    }
}
function persistLastSessionWeights() {
    try {
        localStorage.setItem(LAST_SESSION_WEIGHTS_KEY, JSON.stringify(lastSessionWeights));
    }
    catch (error) {
        console.error('Error saving last session weights:', error);
    }
}
function hydrateLastSessionWeightsFromTrainings() {
    const trainings = getTrainings();
    for (const training of trainings) {
        for (const exercise of training.exercises || []) {
            const lastSet = [...(exercise.sets || [])].reverse().find(s => typeof s.weight === 'number' && Number.isFinite(s.weight));
            if (lastSet && typeof exercise.exerciseId === 'string' && lastSessionWeights[exercise.exerciseId] === undefined) {
                lastSessionWeights[exercise.exerciseId] = Number(lastSet.weight);
            }
        }
    }
    persistLastSessionWeights();
}
function getPreferredWeight(exerciseId) {
    if (lastSessionWeights[exerciseId] !== undefined)
        return lastSessionWeights[exerciseId];
    return getLastUsedWeight(exerciseId);
}
function updateWeightCaches(exerciseId, weight) {
    if (typeof weight === 'number' && Number.isFinite(weight)) {
        saveLastUsedWeight(exerciseId, weight);
        lastSessionWeights[exerciseId] = weight;
        persistLastSessionWeights();
    }
}
function getTargetReps(reps) {
    if (typeof reps === 'number' && Number.isFinite(reps))
        return reps;
    if (typeof reps === 'string') {
        const match = reps.match(/(\d+)/);
        if (match) {
            const val = parseInt(match[1], 10);
            return Number.isFinite(val) ? val : undefined;
        }
    }
    return undefined;
}
export async function initializeLiveWorkout() {
    await ensureDefaultPrograms();
    setExerciseLibrary(getExerciseLibraryItems());
    loadLastSessionWeights();
    hydrateLastSessionWeightsFromTrainings();
    setupLiveTabs();
    setupProgramBuilder();
    setupExerciseLibrary();
    renderProgramCards();
    renderExerciseLibrary();
    setupWorkoutControls();
    // Check for active workout and resume if exists
    const activeWorkout = getActiveWorkout();
    if (activeWorkout) {
        const program = getWorkoutProgramById(activeWorkout.programId);
        if (program) {
            resumeWorkout(activeWorkout);
        }
        else {
            clearActiveWorkout();
        }
    }
}
async function ensureDefaultPrograms() {
    const programs = getWorkoutPrograms();
    if (programs.length === 0) {
        console.log('Initializing default workout programs...');
        for (const program of DEFAULT_PROGRAMS) {
            await addWorkoutProgram(program);
        }
    }
}
function renderProgramCards() {
    const container = document.getElementById('program-list');
    if (!container)
        return;
    const programs = getWorkoutPrograms();
    if (programs.length === 0) {
        container.innerHTML = '<p class="no-data">Create your first training session with the builder.</p>';
        return;
    }
    const categoryIcons = { push: '🔺', pull: '🔻', legs: '🦵' };
    const grouped = { push: [], pull: [], legs: [] };
    programs.forEach(p => grouped[p.name].push(p));
    container.innerHTML = Object.keys(grouped).map(cat => {
        const catPrograms = grouped[cat];
        const isExpanded = expandedCategories.has(cat);
        const count = catPrograms.length;
        const body = catPrograms.map(program => {
            const focus = computeProgramFocus(program);
            const exerciseDetails = program.exercises.map(ex => `
                <li>
                    <strong>${ex.name}</strong>
                    <span class="program-exercise-meta">${ex.sets}×${ex.reps} • ${getRestSeconds(ex.restTime)}s rest</span>
                </li>
            `).join('');
            return `
                <div class="program-card" data-program-id="${program.id}">
                    <div class="program-icon">${categoryIcons[program.name] ?? '🏋️'}</div>
                    <h3>${program.displayName}</h3>
                    <p class="program-meta">${CATEGORY_LABELS[program.name] ?? program.name} • ${program.exercises.length} exercises</p>
                    <div class="program-focus">
                        <span class="chip focus-chip">${focus.label}</span>
                        <span class="program-focus-meta">${focus.detail}</span>
                    </div>
                    <div class="program-actions">
                        <button class="btn btn-primary start-program-btn" data-program-id="${program.id}">Start</button>
                        <button class="btn btn-secondary edit-program-btn" data-program-id="${program.id}">Edit</button>
                        <button class="btn btn-secondary clone-program-btn" data-program-id="${program.id}">Clone</button>
                        <button class="btn btn-danger delete-program-btn" data-program-id="${program.id}">Delete</button>
                        <button class="btn btn-secondary details-program-btn" data-program-id="${program.id}">Details</button>
                    </div>
                    <div class="program-details" data-program-id="${program.id}" style="display: none;">
                        <ul class="program-exercise-list">
                            ${exerciseDetails}
                        </ul>
                    </div>
                </div>
            `;
        }).join('');
        return `
            <div class="program-category" data-category="${cat}">
                <button class="program-category-toggle" data-category="${cat}">
                    <span>${CATEGORY_LABELS[cat] ?? cat} (${count})</span>
                    <span class="program-category-caret">${isExpanded ? '▲' : '▼'}</span>
                </button>
                <div class="program-category-body" data-category-body="${cat}" style="display: ${isExpanded ? 'grid' : 'none'};">
                    ${body || '<p class="no-data">No sessions yet for this category.</p>'}
                </div>
            </div>
        `;
    }).join('');
    bindProgramCardActions(container);
    bindCategoryToggles(container);
}
function bindProgramCardActions(container) {
    const startButtons = container.querySelectorAll('.start-program-btn');
    startButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const programId = e.currentTarget.getAttribute('data-program-id');
            if (programId)
                startWorkout(programId);
        });
    });
    const editButtons = container.querySelectorAll('.edit-program-btn');
    editButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const programId = e.currentTarget.getAttribute('data-program-id');
            if (programId) {
                enterEditMode(programId);
            }
        });
    });
    const cloneButtons = container.querySelectorAll('.clone-program-btn');
    cloneButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const programId = e.currentTarget.getAttribute('data-program-id');
            if (programId) {
                await cloneProgram(programId);
            }
        });
    });
    const detailButtons = container.querySelectorAll('.details-program-btn');
    detailButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const programId = e.currentTarget.getAttribute('data-program-id');
            if (programId)
                toggleProgramDetails(programId);
        });
    });
    const deleteButtons = container.querySelectorAll('.delete-program-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const programId = e.currentTarget.getAttribute('data-program-id');
            if (programId) {
                await handleDeleteProgram(programId);
            }
        });
    });
}
function bindCategoryToggles(container) {
    const toggles = container.querySelectorAll('.program-category-toggle');
    toggles.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.currentTarget.getAttribute('data-category');
            const body = container.querySelector(`.program-category-body[data-category-body="${category}"]`);
            const caret = e.currentTarget.querySelector('.program-category-caret');
            if (!body)
                return;
            const isExpanded = expandedCategories.has(category);
            const nextExpanded = !isExpanded;
            body.style.display = nextExpanded ? 'grid' : 'none';
            if (caret)
                caret.textContent = nextExpanded ? '▲' : '▼';
            if (nextExpanded) {
                expandedCategories.add(category);
            }
            else {
                expandedCategories.delete(category);
            }
        });
    });
}
function setActiveTab(tab) {
    activeTab = tab;
    const startPanel = document.getElementById('tab-start');
    const buildPanel = document.getElementById('tab-build');
    const tabButtons = document.querySelectorAll('.tab-btn');
    if (startPanel)
        startPanel.classList.toggle('active', tab === 'start');
    if (buildPanel)
        buildPanel.classList.toggle('active', tab === 'build');
    tabButtons.forEach(btn => {
        const btnTab = btn.getAttribute('data-tab');
        btn.classList.toggle('active', btnTab === tab);
    });
}
function setupExerciseLibrary() {
    const search = document.getElementById('library-search');
    const chips = document.querySelectorAll('[data-library-category]');
    const typeChips = document.querySelectorAll('[data-library-type]');
    const toggle = document.getElementById('library-toggle');
    const libraryList = document.getElementById('exercise-library-list');
    const newName = document.getElementById('new-exercise-name');
    const newCategory = document.getElementById('new-exercise-category');
    const newType = document.getElementById('new-exercise-type');
    const newMuscles = document.getElementById('new-exercise-muscles');
    const newEquipment = document.getElementById('new-exercise-equipment');
    const newSets = document.getElementById('new-exercise-sets');
    const newReps = document.getElementById('new-exercise-reps');
    const newRest = document.getElementById('new-exercise-rest');
    const saveExerciseBtn = document.getElementById('save-exercise-btn');
    const cancelExerciseBtn = document.getElementById('cancel-exercise-btn');
    search?.addEventListener('input', (e) => {
        librarySearchTerm = e.target.value.toLowerCase();
        renderExerciseLibrary();
    });
    chips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            chips.forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const category = e.currentTarget.getAttribute('data-library-category');
            libraryFilterCategory = category;
            renderExerciseLibrary();
        });
    });
    typeChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            typeChips.forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const type = e.currentTarget.getAttribute('data-library-type');
            libraryFilterType = type;
            renderExerciseLibrary();
        });
    });
    toggle?.addEventListener('click', () => {
        if (!libraryList)
            return;
        const isHidden = libraryList.style.display === 'none';
        libraryList.style.display = isHidden ? 'grid' : 'none';
    });
    saveExerciseBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!newName || !newCategory)
            return;
        const name = newName.value.trim();
        const category = newCategory.value || 'push';
        if (!name) {
            alert('Exercise name is required.');
            return;
        }
        const muscles = (newMuscles?.value || '')
            .split(',')
            .map(m => m.trim())
            .filter(Boolean);
        const equipment = newEquipment?.value.trim() || undefined;
        const exerciseType = (newType?.value || 'compound');
        const setsVal = parseInt(newSets?.value || '', 10);
        const restVal = parseInt(newRest?.value || '', 10);
        const repsVal = newReps?.value.trim() || '10';
        try {
            if (editingLibraryExerciseId) {
                await updateExerciseDefinition(editingLibraryExerciseId, {
                    name,
                    category,
                    muscles: muscles.length ? muscles : undefined,
                    equipment,
                    exerciseType,
                    sets: Number.isFinite(setsVal) && setsVal > 0 ? setsVal : undefined,
                    reps: repsVal,
                    restTime: Number.isFinite(restVal) && restVal >= 0 ? restVal : undefined
                });
                showLiveToast(`${name} updated`);
            }
            else {
                await addExerciseDefinition({
                    name,
                    category,
                    muscles: muscles.length ? muscles : undefined,
                    equipment,
                    exerciseType,
                    sets: Number.isFinite(setsVal) && setsVal > 0 ? setsVal : 3,
                    reps: repsVal,
                    restTime: Number.isFinite(restVal) && restVal >= 0 ? restVal : 60
                });
                showLiveToast(`${name} added to your library`);
            }
            setExerciseLibrary(getExerciseLibraryItems());
            resetExerciseForm();
        }
        catch (error) {
            console.error('Failed to save exercise', error);
        }
    });
    cancelExerciseBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        resetExerciseForm();
    });
    resetExerciseForm();
}
function renderExerciseLibrary() {
    const container = document.getElementById('exercise-library-list');
    if (!container)
        return;
    const filtered = exerciseLibrary.filter(ex => {
        const matchCategory = libraryFilterCategory === 'all' || ex.category === libraryFilterCategory;
        const term = librarySearchTerm.trim().toLowerCase();
        const matchSearch = !term || ex.name.toLowerCase().includes(term) || (ex.muscles || []).some(m => m.toLowerCase().includes(term)) || (ex.equipment || '').toLowerCase().includes(term);
        const matchType = libraryFilterType === 'all' || (ex.exerciseType ?? 'compound') === libraryFilterType;
        return matchCategory && matchSearch && matchType;
    });
    if (filtered.length === 0) {
        container.innerHTML = '<p class="no-data">No exercises found. Try a different filter.</p>';
        return;
    }
    container.innerHTML = filtered.map(ex => {
        const muscles = ex.muscles?.join(', ');
        const typeLabel = (ex.exerciseType ?? 'compound');
        return `
            <div class="library-item" data-exercise-id="${ex.id}">
                <div>
                    <div class="library-name">${ex.name}</div>
                    <div class="library-meta">
                        <span class="chip subtle">${CATEGORY_LABELS[ex.category]}</span>
                        <span class="chip subtle type-chip">${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}</span>
                        ${muscles ? `<span class="chip subtle">${muscles}</span>` : ''}
                        ${ex.equipment ? `<span class="chip subtle">${ex.equipment}</span>` : ''}
                    </div>
                </div>
                <div class="library-actions">
                    <button class="btn btn-secondary btn-small library-add-btn" data-exercise-id="${ex.id}" type="button">+ Add</button>
                    <button class="btn btn-ghost btn-small library-edit-btn" data-exercise-id="${ex.id}" type="button">Edit</button>
                </div>
            </div>
        `;
    }).join('');
    container.querySelectorAll('.library-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-exercise-id');
            if (id) {
                addExerciseFromLibrary(id);
            }
        });
    });
    container.querySelectorAll('.library-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-exercise-id');
            const target = exerciseLibrary.find(ex => ex.id === id);
            if (!id || !target)
                return;
            editingLibraryExerciseId = id;
            const newName = document.getElementById('new-exercise-name');
            const newCategory = document.getElementById('new-exercise-category');
            const newType = document.getElementById('new-exercise-type');
            const newMuscles = document.getElementById('new-exercise-muscles');
            const newEquipment = document.getElementById('new-exercise-equipment');
            const newSets = document.getElementById('new-exercise-sets');
            const newReps = document.getElementById('new-exercise-reps');
            const newRest = document.getElementById('new-exercise-rest');
            const saveBtn = document.getElementById('save-exercise-btn');
            const cancelBtn = document.getElementById('cancel-exercise-btn');
            if (newName)
                newName.value = target.name;
            if (newCategory)
                newCategory.value = target.category;
            if (newType)
                newType.value = target.exerciseType ?? 'compound';
            if (newMuscles)
                newMuscles.value = (target.muscles || []).join(', ');
            if (newEquipment)
                newEquipment.value = target.equipment ?? '';
            if (newSets)
                newSets.value = String(target.sets ?? 3);
            if (newReps)
                newReps.value = typeof target.reps === 'number' ? String(target.reps) : (target.reps ?? '10');
            if (newRest)
                newRest.value = String(target.restTime ?? 60);
            if (saveBtn)
                saveBtn.textContent = 'Update Exercise';
            if (cancelBtn)
                cancelBtn.style.display = 'inline-block';
            newName?.focus();
        });
    });
}
function computeProgramFocus(program) {
    const priority = ['power', 'hypertrophy', 'compound', 'flexibility', 'cardio'];
    const counts = {
        power: 0,
        hypertrophy: 0,
        compound: 0,
        flexibility: 0,
        cardio: 0
    };
    program.exercises.forEach(ex => {
        const type = (ex.exerciseType ?? 'compound');
        counts[type] = (counts[type] || 0) + 1;
    });
    const dominant = priority.reduce((best, current) => {
        if (counts[current] > counts[best])
            return current;
        return best;
    }, priority[0]);
    const detailParts = priority
        .filter(t => counts[t] > 0)
        .map(t => `${counts[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}`);
    return {
        label: `${dominant.charAt(0).toUpperCase() + dominant.slice(1)}-focused`,
        detail: detailParts.join(' / ') || 'No exercises'
    };
}
function toggleProgramDetails(programId) {
    const details = document.querySelector(`.program-details[data-program-id="${programId}"]`);
    if (!details)
        return;
    const isHidden = details.style.display === 'none' || details.style.display === '';
    details.style.display = isHidden ? 'block' : 'none';
    const btn = document.querySelector(`.details-program-btn[data-program-id="${programId}"]`);
    if (btn) {
        btn.textContent = isHidden ? 'Hide Details' : 'Details';
    }
}
function showLiveToast(message) {
    const existing = document.querySelector('.live-toast');
    if (existing)
        existing.remove();
    const toast = document.createElement('div');
    toast.className = 'live-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}
async function cloneProgram(programId) {
    const result = await cloneWorkoutProgram(programId);
    if (!result) {
        alert('Unable to clone this workout.');
        return;
    }
    renderProgramCards();
}
async function handleDeleteProgram(programId) {
    const program = getWorkoutProgramById(programId);
    if (!program)
        return;
    if (!confirm(`Delete "${program.displayName}"?`))
        return;
    await deleteWorkoutProgram(programId);
    renderProgramCards();
    // If the active workout was tied to this program, clear it and reset UI
    const activeWorkout = getActiveWorkout();
    if (activeWorkout?.programId === programId) {
        stopWorkoutTimer();
        stopResting();
        clearActiveWorkout();
        hideActiveWorkoutScreen();
    }
}
function setupProgramBuilder() {
    const addBtn = document.getElementById('builder-add-exercise');
    const saveBtn = document.getElementById('builder-save');
    const resetBtn = document.getElementById('builder-reset');
    const cancelEditBtn = document.getElementById('builder-cancel-edit');
    const segmented = document.querySelectorAll('#builder-segmented .segment-btn');
    const searchInput = document.getElementById('builder-exercise-search');
    segmented.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const value = e.currentTarget.getAttribute('data-category');
            segmented.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            builderCategory = value;
            renderExerciseOptions();
        });
    });
    addBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        addExerciseToBuilder();
    });
    saveBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        await saveBuilderProgram();
    });
    resetBtn?.addEventListener('click', () => resetBuilderForm());
    cancelEditBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        resetBuilderForm();
    });
    searchInput?.addEventListener('input', (e) => {
        builderFilterExercises(e.target.value || '');
    });
    renderExerciseOptions();
    resetBuilderForm();
}
function setupLiveTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.getAttribute('data-tab');
            setActiveTab(tab);
        });
    });
    setActiveTab(activeTab);
}
function renderExerciseOptions() {
    const select = document.getElementById('builder-exercise');
    if (!select)
        return;
    const options = exerciseLibrary.filter(ex => !builderCategory || ex.category === builderCategory);
    select.innerHTML = `<option value="">Pick exercise...</option>` + options
        .map(ex => `<option value="${ex.id}">${ex.name} (${ex.category})</option>`)
        .join('');
}
function builderFilterExercises(term) {
    const select = document.getElementById('builder-exercise');
    if (!select)
        return;
    const normalized = term.trim().toLowerCase();
    const options = exerciseLibrary.filter(ex => {
        const matchCategory = !builderCategory || ex.category === builderCategory;
        const matchSearch = !normalized || ex.name.toLowerCase().includes(normalized) || (ex.muscles || []).some(m => m.toLowerCase().includes(normalized));
        return matchCategory && matchSearch;
    });
    select.innerHTML = `<option value="">Pick exercise...</option>` + options
        .map(ex => `<option value="${ex.id}">${ex.name} (${ex.category})</option>`)
        .join('');
}
function setBuilderEditingState(program) {
    const label = document.getElementById('builder-editing-label');
    const cancelBtn = document.getElementById('builder-cancel-edit');
    const saveBtn = document.getElementById('builder-save');
    const segmented = document.querySelectorAll('#builder-segmented .segment-btn');
    if (program) {
        builderCategory = program.name;
        if (label) {
            label.style.display = 'block';
            label.textContent = `Editing: ${program.displayName} (${CATEGORY_LABELS[program.name] ?? program.name})`;
        }
        if (cancelBtn)
            cancelBtn.style.display = 'inline-block';
        if (saveBtn)
            saveBtn.textContent = 'Update Workout';
        segmented.forEach(btn => {
            const cat = btn.getAttribute('data-category');
            if (cat === program.name)
                btn.classList.add('active');
            else
                btn.classList.remove('active');
        });
    }
    else {
        if (label) {
            label.style.display = 'none';
            label.textContent = '';
        }
        if (cancelBtn)
            cancelBtn.style.display = 'none';
        if (saveBtn)
            saveBtn.textContent = 'Save Workout';
        builderCategory = 'push';
        segmented.forEach((btn, idx) => {
            if (idx === 0)
                btn.classList.add('active');
            else
                btn.classList.remove('active');
        });
    }
}
function addExerciseToBuilder() {
    const select = document.getElementById('builder-exercise');
    const setsInput = document.getElementById('builder-sets');
    const repsInput = document.getElementById('builder-reps');
    if (!select || !setsInput || !repsInput)
        return;
    const exerciseId = select.value;
    if (!exerciseId) {
        alert('Choose an exercise to add.');
        return;
    }
    const template = exerciseLibrary.find(ex => ex.id === exerciseId);
    const sets = parseInt(setsInput.value || '', 10) || template?.sets || 3;
    const reps = repsInput.value.trim() || String(template?.reps ?? 10);
    const restTime = getRestSeconds(template?.restTime);
    const name = template?.name ?? 'Exercise';
    const uniqueId = builderExercises.some(ex => ex.id === exerciseId)
        ? `${exerciseId}-${Date.now()}`
        : exerciseId;
    builderExercises.push({
        id: uniqueId,
        name,
        sets,
        reps,
        restTime,
        notes: template?.notes,
        exerciseType: template?.exerciseType ?? 'compound'
    });
    select.value = '';
    renderBuilderExercises();
}
function addExerciseFromLibrary(exerciseId) {
    const template = exerciseLibrary.find(ex => ex.id === exerciseId);
    if (!template)
        return;
    const setsInput = document.getElementById('builder-sets');
    const repsInput = document.getElementById('builder-reps');
    if (setsInput)
        setsInput.value = String(template.sets);
    if (repsInput)
        repsInput.value = String(template.reps);
    const select = document.getElementById('builder-exercise');
    if (select)
        select.value = template.id;
    addExerciseToBuilder();
}
function enterEditMode(programId) {
    const program = getWorkoutProgramById(programId);
    if (!program) {
        alert('Workout not found to edit.');
        return;
    }
    editingProgramId = programId;
    const nameInput = document.getElementById('builder-name');
    builderCategory = program.name;
    if (nameInput)
        nameInput.value = program.displayName;
    builderExercises = program.exercises.map(ex => ({
        ...ex,
        restTime: getRestSeconds(ex.restTime),
        exerciseType: ex.exerciseType ?? 'compound'
    }));
    setBuilderEditingState(program);
    setActiveTab('build');
    const segmented = document.querySelectorAll('#builder-segmented .segment-btn');
    segmented.forEach(btn => {
        const cat = btn.getAttribute('data-category');
        if (cat === program.name)
            btn.classList.add('active');
        else
            btn.classList.remove('active');
    });
    renderExerciseOptions();
    renderBuilderExercises();
    const selection = document.getElementById('program-selection');
    selection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function renderBuilderExercises() {
    const list = document.getElementById('builder-exercise-list');
    if (!list)
        return;
    if (builderExercises.length === 0) {
        list.innerHTML = '<p class="no-data">No exercises added yet.</p>';
        updateBuilderSummary();
        return;
    }
    list.innerHTML = builderExercises.map((ex, idx) => {
        const rest = getRestSeconds(ex.restTime);
        const isFirst = idx === 0;
        const isLast = idx === builderExercises.length - 1;
        return `
        <div class="builder-exercise-row" data-index="${idx}">
            <div>
                <div class="exercise-name">${ex.name}</div>
                <div class="builder-exercise-meta">
                    <span class="builder-chip">${ex.sets} sets</span>
                    <span class="builder-chip">${ex.reps} reps</span>
                    <span class="builder-chip">${rest}s rest</span>
                </div>
            </div>
            <div class="builder-exercise-actions">
                <div class="builder-reorder">
                    <button class="btn btn-ghost btn-small move-up-btn" data-index="${idx}" type="button" title="Move up" ${isFirst ? 'disabled' : ''}>↑</button>
                    <button class="btn btn-ghost btn-small move-down-btn" data-index="${idx}" type="button" title="Move down" ${isLast ? 'disabled' : ''}>↓</button>
                </div>
                <input type="number" class="builder-set-input" data-index="${idx}" min="1" value="${ex.sets}">
                <input type="text" class="builder-reps-input" data-index="${idx}" value="${ex.reps}">
                <input type="number" class="builder-rest-input" data-index="${idx}" min="0" value="${rest}" title="Rest (sec)">
                <button class="btn btn-secondary btn-small remove-builder-exercise" data-index="${idx}" type="button">Remove</button>
            </div>
        </div>
    `;
    }).join('');
    list.querySelectorAll('.builder-set-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target;
            const index = parseInt(target.getAttribute('data-index') || '0', 10);
            const value = Math.max(1, parseInt(target.value || '1', 10));
            builderExercises[index].sets = value;
            renderBuilderExercises();
        });
    });
    list.querySelectorAll('.builder-reps-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target;
            const index = parseInt(target.getAttribute('data-index') || '0', 10);
            builderExercises[index].reps = target.value || builderExercises[index].reps;
            renderBuilderExercises();
        });
    });
    list.querySelectorAll('.builder-rest-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target;
            const index = parseInt(target.getAttribute('data-index') || '0', 10);
            const parsed = parseInt(target.value || '', 10);
            const value = Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_SET_REST_SECONDS;
            builderExercises[index].restTime = value;
            renderBuilderExercises();
        });
    });
    list.querySelectorAll('.move-up-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const index = parseInt(e.currentTarget.getAttribute('data-index') || '0', 10);
            if (index <= 0)
                return;
            const [item] = builderExercises.splice(index, 1);
            builderExercises.splice(index - 1, 0, item);
            renderBuilderExercises();
        });
    });
    list.querySelectorAll('.move-down-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const index = parseInt(e.currentTarget.getAttribute('data-index') || '0', 10);
            if (index >= builderExercises.length - 1)
                return;
            const [item] = builderExercises.splice(index, 1);
            builderExercises.splice(index + 1, 0, item);
            renderBuilderExercises();
        });
    });
    list.querySelectorAll('.remove-builder-exercise').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const index = parseInt(e.currentTarget.getAttribute('data-index') || '0', 10);
            builderExercises.splice(index, 1);
            renderBuilderExercises();
        });
    });
    updateBuilderSummary();
}
function updateBuilderSummary() {
    const countEl = document.getElementById('builder-summary-count');
    const setsEl = document.getElementById('builder-summary-sets');
    const totalExercises = builderExercises.length;
    const totalSets = builderExercises.reduce((acc, ex) => acc + (Number(ex.sets) || 0), 0);
    if (countEl)
        countEl.textContent = `${totalExercises} ${totalExercises === 1 ? 'exercise' : 'exercises'}`;
    if (setsEl)
        setsEl.textContent = `${totalSets} ${totalSets === 1 ? 'set' : 'sets'} total`;
}
function resetBuilderForm() {
    const nameInput = document.getElementById('builder-name');
    const setsInput = document.getElementById('builder-sets');
    const repsInput = document.getElementById('builder-reps');
    editingProgramId = null;
    builderExercises = [];
    builderCategory = 'push';
    if (nameInput)
        nameInput.value = `${CATEGORY_LABELS['push']} Session`;
    if (setsInput)
        setsInput.value = '4';
    if (repsInput)
        repsInput.value = '8';
    setBuilderEditingState(null);
    renderExerciseOptions();
    renderBuilderExercises();
}
async function saveBuilderProgram() {
    const nameInput = document.getElementById('builder-name');
    const category = builderCategory || 'push';
    const displayName = nameInput?.value.trim() || `${CATEGORY_LABELS[category] ?? category} Session`;
    if (builderExercises.length === 0) {
        alert('Add at least one exercise before saving.');
        return;
    }
    const programExercises = builderExercises.map(ex => ({
        ...ex,
        restTime: getRestSeconds(ex.restTime)
    }));
    if (editingProgramId) {
        const updated = await updateWorkoutProgram(editingProgramId, {
            name: category,
            displayName,
            exercises: programExercises
        });
        if (!updated) {
            alert('Could not update this workout. Please try again.');
            return;
        }
    }
    else {
        await addWorkoutProgram({
            name: category,
            displayName,
            exercises: programExercises,
            createdAt: new Date().toISOString()
        });
    }
    renderProgramCards();
    showLiveToast(`${displayName} saved. Ready to start now?`);
    resetBuilderForm();
}
function setupWorkoutControls() {
    const resetBtn = document.getElementById('reset-workout-btn');
    const pauseBtn = document.getElementById('pause-workout-btn');
    const endBtn = document.getElementById('end-workout-btn');
    const skipRestBtn = document.getElementById('skip-rest-btn');
    const addRestBtn = document.getElementById('add-rest-time-btn');
    resetBtn?.addEventListener('click', resetWorkout);
    pauseBtn?.addEventListener('click', togglePauseWorkout);
    endBtn?.addEventListener('click', finishWorkout);
    skipRestBtn?.addEventListener('click', skipRest);
    addRestBtn?.addEventListener('click', () => addRestTime(30));
}
function startWorkout(programId) {
    const program = getWorkoutProgramById(programId);
    if (!program) {
        console.error('Program not found:', programId);
        return;
    }
    // Create active workout state
    const activeWorkout = createActiveWorkout(program);
    const normalized = normalizeActiveWorkoutTiming(activeWorkout);
    saveActiveWorkout(normalized);
    workoutStartTime = new Date(normalized.startTime);
    // Show active workout screen
    showActiveWorkoutScreen(program.displayName);
    renderExercises(program, normalized);
    attachSetEventListeners();
    startResting(INITIAL_SESSION_REST_SECONDS, WARMUP_LABEL);
    startWorkoutTimer();
}
function resumeWorkout(activeWorkout) {
    const program = getWorkoutProgramById(activeWorkout.programId);
    if (!program)
        return;
    const normalized = normalizeActiveWorkoutTiming(activeWorkout);
    saveActiveWorkout(normalized);
    workoutStartTime = new Date(normalized.startTime);
    showActiveWorkoutScreen(normalized.programName);
    renderExercises(program, normalized);
    attachSetEventListeners();
    const pauseBtn = document.getElementById('pause-workout-btn');
    if (pauseBtn)
        pauseBtn.textContent = normalized.paused ? '▶️ Resume' : '⏸️ Pause';
    if (!normalized.paused) {
        startWorkoutTimer();
        if (normalized.isResting && normalized.restStartTime && normalized.restDuration) {
            const restStart = new Date(normalized.restStartTime).getTime();
            const elapsed = Date.now() - restStart;
            const remaining = normalized.restDuration - elapsed;
            if (remaining > 0) {
                startRestTimer(Math.floor(remaining / 1000), normalized.restLabel ?? REST_LABEL_DEFAULT);
            }
            else {
                stopResting();
            }
        }
    }
}
function showActiveWorkoutScreen(programName) {
    const selection = document.getElementById('program-selection');
    const activeScreen = document.getElementById('active-workout-screen');
    const programNameEl = document.getElementById('active-program-name');
    if (selection)
        selection.style.display = 'none';
    if (activeScreen)
        activeScreen.style.display = 'block';
    if (programNameEl)
        programNameEl.textContent = programName;
    toggleLiveHero(false);
}
function hideActiveWorkoutScreen() {
    const selection = document.getElementById('program-selection');
    const activeScreen = document.getElementById('active-workout-screen');
    if (selection)
        selection.style.display = 'block';
    if (activeScreen)
        activeScreen.style.display = 'none';
    toggleLiveHero(true);
}
function renderExercises(program, activeWorkout) {
    const container = document.getElementById('exercise-list');
    if (!container)
        return;
    renderCompletedChips(program, activeWorkout);
    container.innerHTML = program.exercises.map((exercise, index) => {
        const restSeconds = getRestSeconds(exercise.restTime);
        const activeExercise = activeWorkout.exercises[index];
        const isActive = index === activeWorkout.currentExerciseIndex;
        const allCompleted = activeExercise.sets.every(s => s.completed);
        const completedSummary = `${activeExercise.sets.filter(s => s.completed).length}/${exercise.sets} done`;
        return `
            <div class="exercise-card ${isActive ? 'active' : ''} ${allCompleted ? 'completed collapsed-completed' : ''}" data-exercise-index="${index}" ${allCompleted ? 'style="display: none;"' : ''}>
                <div class="exercise-card-header">
                    <div>
                        <div class="exercise-name">${exercise.name}</div>
                        <div class="exercise-info">${exercise.sets} sets × ${exercise.reps} reps • ${restSeconds}s rest</div>
                        ${exercise.notes ? `<div class="exercise-info"><em>${exercise.notes}</em></div>` : ''}
                    </div>
                    <div class="exercise-header-actions">
                        <span class="exercise-badge">${completedSummary}</span>
                        ${allCompleted ? `<button class="btn btn-secondary btn-small toggle-sets-btn" data-exercise-index="${index}">View sets</button>` : ''}
                    </div>
                </div>
                <div class="sets-grid" data-exercise-index="${index}" ${allCompleted ? 'style="display: none;"' : ''}>
                    ${activeExercise.sets.map((set, setIndex) => renderSet(exercise, set, setIndex, index, activeWorkout)).join('')}
                </div>
            </div>
        `;
    }).join('');
    // Bind toggles for completed exercises
    container.querySelectorAll('.toggle-sets-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const exIndex = parseInt(btn.getAttribute('data-exercise-index') || '0');
            const grid = container.querySelector(`.sets-grid[data-exercise-index="${exIndex}"]`);
            if (!grid)
                return;
            const isHidden = grid.style.display === 'none';
            grid.style.display = isHidden ? 'grid' : 'none';
            btn.textContent = isHidden ? 'Hide sets' : 'View sets';
        });
    });
}
function renderCompletedChips(program, activeWorkout) {
    const chipContainer = document.getElementById('completed-exercise-chips');
    if (!chipContainer)
        return;
    const completed = program.exercises
        .map((exercise, index) => ({ exercise, index, active: activeWorkout.exercises[index] }))
        .filter(item => item.active.sets.every(s => s.completed));
    if (completed.length === 0) {
        chipContainer.style.display = 'none';
        chipContainer.innerHTML = '';
        return;
    }
    chipContainer.style.display = 'flex';
    chipContainer.innerHTML = completed.map(item => `
        <button class="completed-chip" data-exercise-index="${item.index}">
            ${item.exercise.name} • ${item.exercise.sets}×${item.exercise.reps}
        </button>
    `).join('');
    chipContainer.querySelectorAll('.completed-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const exIndex = parseInt(btn.getAttribute('data-exercise-index') || '0');
            const card = document.querySelector(`.exercise-card[data-exercise-index="${exIndex}"]`);
            const grid = card?.querySelector('.sets-grid');
            const toggle = card?.querySelector('.toggle-sets-btn');
            if (card) {
                card.style.display = 'block';
                card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            if (grid) {
                grid.style.display = 'grid';
            }
            if (toggle) {
                toggle.textContent = 'Hide sets';
            }
        });
    });
}
function renderSet(exercise, set, setIndex, exerciseIndex, activeWorkout) {
    const isActive = exerciseIndex === activeWorkout.currentExerciseIndex &&
        setIndex === activeWorkout.exercises[exerciseIndex].currentSet &&
        !set.completed &&
        !activeWorkout.isResting;
    const hasStarted = set.completed || set.partial || set.actualReps !== undefined || set.weight !== undefined || set.completedAt !== undefined;
    const isPending = !hasStarted && !isActive;
    const lastWeight = set.weight ?? getPreferredWeight(exercise.id);
    const partialSelected = Boolean(set.partial) || set.actualReps !== undefined;
    const targetReps = getTargetReps(exercise.reps);
    const isResting = activeWorkout.isResting;
    return `
        <div class="set-item ${set.completed ? 'completed' : ''} ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}" 
             data-exercise-index="${exerciseIndex}" 
             data-set-index="${setIndex}">
            <div class="set-header">
                <div class="set-title">Set ${set.setNumber} • ${exercise.reps} reps</div>
                ${set.completed ? `<span class="set-status-tag">${set.partial ? (set.actualReps && targetReps ? `Partial (${set.actualReps}/${targetReps})` : 'Partial') : 'All reps'}</span>` : ''}
            </div>
            ${!set.completed ? `
                <div class="set-completion-toggle">
                    <label>
                        <input type="radio" name="set-status-${exerciseIndex}-${setIndex}" value="full" ${!partialSelected ? 'checked' : ''}/>
                        All reps
                    </label>
                    <label>
                        <input type="radio" name="set-status-${exerciseIndex}-${setIndex}" value="partial" ${partialSelected ? 'checked' : ''}/>
                        Partial
                    </label>
                </div>
                <div class="partial-rep-row" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}" style="${partialSelected ? '' : 'display:none;'}">
                    ${(targetReps ? Array.from({ length: targetReps }, (_, i) => {
        const rep = i + 1;
        const active = set.actualReps === rep ? 'active' : '';
        return `<button class="partial-rep-btn ${active}" type="button" data-reps="${rep}" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}">${rep}</button>`;
    }).join('') : '')}
                </div>
                <div class="set-weight-row">
                    <input type="number" 
                           class="set-weight-input" 
                           placeholder="Weight (lbs)" 
                           value="${lastWeight ?? ''}"
                           data-exercise-index="${exerciseIndex}" 
                           data-set-index="${setIndex}">
                    <div class="set-weight-quick">
                        <button class="quick-add-weight" type="button" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}" data-add="10">+10</button>
                        <button class="quick-add-weight" type="button" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}" data-add="5">+5</button>
                        <button class="quick-add-weight" type="button" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}" data-add="2.5">+2.5</button>
                    </div>
                </div>
                <button class="btn btn-primary btn-small set-complete-btn" 
                        data-exercise-index="${exerciseIndex}" 
                        data-set-index="${setIndex}"
                        ${!isActive ? 'disabled' : ''}>
                    ${isResting ? 'Resting…' : isActive ? 'Complete Set' : 'Locked'}
                </button>
            ` : `
                <div class="set-complete-meta">
                    <div class="set-complete-line">✓ Done${set.partial ? set.actualReps && targetReps ? ` (${set.actualReps}/${targetReps})` : ' (partial)' : ''}</div>
                    ${set.weight ? `<div class="set-weight-label">${set.weight} lbs</div>` : ''}
                </div>
            `}
        </div>
    `;
}
export function refreshLiveWorkout() {
    const activeWorkout = getActiveWorkout();
    if (!activeWorkout) {
        hideActiveWorkoutScreen();
        return;
    }
    const program = getWorkoutProgramById(activeWorkout.programId);
    if (program) {
        renderExercises(program, activeWorkout);
        // Re-attach event listeners
        attachSetEventListeners();
    }
}
function attachSetEventListeners() {
    const completeButtons = document.querySelectorAll('.set-complete-btn');
    completeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const exerciseIndex = parseInt(e.target.getAttribute('data-exercise-index') || '0');
            const setIndex = parseInt(e.target.getAttribute('data-set-index') || '0');
            completeSet(exerciseIndex, setIndex);
        });
    });
    const quickButtons = document.querySelectorAll('.quick-add-weight');
    quickButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const exerciseIndex = btn.getAttribute('data-exercise-index');
            const setIndex = btn.getAttribute('data-set-index');
            const delta = Number(btn.getAttribute('data-add') || '0');
            if (!exerciseIndex || !setIndex)
                return;
            const input = document.querySelector(`.set-weight-input[data-exercise-index="${exerciseIndex}"][data-set-index="${setIndex}"]`);
            if (!input)
                return;
            const current = Number(input.value) || 0;
            const next = current + delta;
            input.value = next.toString();
        });
    });
    const radios = document.querySelectorAll('.set-completion-toggle input[type="radio"]');
    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            const exerciseIndex = parseInt(radio.name.split('-')[2] || '0');
            const setIndex = parseInt(radio.name.split('-')[3] || '0');
            const mode = radio.value === 'partial' ? 'partial' : 'full';
            handleSetModeChange(exerciseIndex, setIndex, mode);
        });
    });
    const partialButtons = document.querySelectorAll('.partial-rep-btn');
    partialButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const exerciseIndex = parseInt(btn.getAttribute('data-exercise-index') || '0');
            const setIndex = parseInt(btn.getAttribute('data-set-index') || '0');
            const reps = parseInt(btn.getAttribute('data-reps') || '0');
            handlePartialRepsSelection(exerciseIndex, setIndex, reps);
        });
    });
}
function completeSet(exerciseIndex, setIndex) {
    const activeWorkout = getActiveWorkout();
    if (!activeWorkout)
        return;
    const program = getWorkoutProgramById(activeWorkout.programId);
    if (!program)
        return;
    // Get weight input
    const weightInput = document.querySelector(`.set-weight-input[data-exercise-index="${exerciseIndex}"][data-set-index="${setIndex}"]`);
    const weight = weightInput?.value ? parseFloat(weightInput.value) : undefined;
    const statusRadios = document.getElementsByName(`set-status-${exerciseIndex}-${setIndex}`);
    const selectedStatus = Array.from(statusRadios).find(r => r.checked)?.value ?? 'full';
    const partial = selectedStatus === 'partial';
    const partialButtons = document.querySelectorAll(`.partial-rep-btn[data-exercise-index="${exerciseIndex}"][data-set-index="${setIndex}"]`);
    const activePartial = Array.from(partialButtons).find(btn => btn.classList.contains('active'));
    const partialReps = partial ? (activePartial ? parseInt(activePartial.getAttribute('data-reps') || '0') || undefined : undefined) : undefined;
    // Mark set as completed
    activeWorkout.exercises[exerciseIndex].sets[setIndex].completed = true;
    activeWorkout.exercises[exerciseIndex].sets[setIndex].completedAt = new Date().toISOString();
    activeWorkout.exercises[exerciseIndex].sets[setIndex].weight = weight;
    activeWorkout.exercises[exerciseIndex].sets[setIndex].partial = partial;
    activeWorkout.exercises[exerciseIndex].sets[setIndex].actualReps = partialReps;
    // Save weight to memory for future use
    if (weight) {
        const exercise = program.exercises[exerciseIndex];
        updateWeightCaches(exercise.id, weight);
    }
    // Move to next set
    const exercise = activeWorkout.exercises[exerciseIndex];
    const nextSetIndex = exercise.sets.findIndex(s => !s.completed);
    let nextExerciseIndex = -1;
    if (nextSetIndex !== -1) {
        exercise.currentSet = nextSetIndex;
    }
    else {
        // All sets completed for this exercise, move to next exercise
        nextExerciseIndex = activeWorkout.exercises.findIndex((ex, idx) => idx > exerciseIndex && ex.sets.some(s => !s.completed));
        if (nextExerciseIndex !== -1) {
            activeWorkout.currentExerciseIndex = nextExerciseIndex;
        }
    }
    const restTime = getRestSeconds(program.exercises[exerciseIndex]?.restTime);
    const shouldRest = (nextSetIndex !== -1 || nextExerciseIndex !== -1) && restTime > 0;
    const restLabel = nextExerciseIndex !== -1 && nextSetIndex === -1
        ? `Next: ${program.exercises[nextExerciseIndex].name}`
        : REST_LABEL_DEFAULT;
    saveActiveWorkout(activeWorkout);
    if (shouldRest) {
        startResting(restTime, restLabel, activeWorkout);
    }
    refreshLiveWorkout();
}
function startResting(seconds, label = REST_LABEL_DEFAULT, activeWorkoutOverride) {
    const activeWorkout = activeWorkoutOverride ?? getActiveWorkout();
    if (!activeWorkout)
        return;
    unlockRestAudioContext();
    const duration = getRestSeconds(seconds);
    activeWorkout.isResting = true;
    activeWorkout.restStartTime = new Date().toISOString();
    activeWorkout.restDuration = duration * 1000;
    activeWorkout.restLabel = label;
    saveActiveWorkout(activeWorkout);
    if (duration <= 0)
        return;
    startRestTimer(duration, label);
}
function startRestTimer(seconds, label = REST_LABEL_DEFAULT) {
    const container = document.getElementById('rest-timer-container');
    const countdown = document.getElementById('rest-countdown');
    const title = document.getElementById('rest-title');
    if (!container || !countdown)
        return;
    container.style.display = 'block';
    if (title)
        title.textContent = label;
    restEndTime = Date.now() + (seconds * 1000);
    // Clear existing timer
    if (restTimer)
        clearInterval(restTimer);
    // Update countdown display
    const updateRestDisplay = () => {
        if (!restEndTime)
            return;
        const remaining = Math.max(0, Math.floor((restEndTime - Date.now()) / 1000));
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        countdown.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        if (remaining === 0) {
            playRestBeep();
            stopResting();
        }
    };
    updateRestDisplay();
    restTimer = window.setInterval(updateRestDisplay, 100);
}
function stopRestBeep() {
    if (restBeepSource) {
        restBeepSource.stop();
        restBeepSource.disconnect();
        restBeepSource = null;
    }
}
function playRestBeep() {
    try {
        stopRestBeep();
        unlockRestAudioContext();
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!restBeepCtx && Ctx) {
            restBeepCtx = new Ctx();
        }
        if (!restBeepCtx)
            return;
        if (restBeepCtx.state === 'suspended') {
            restBeepCtx.resume().catch(() => { });
        }
        const ctx = restBeepCtx;
        const duration = 0.12; // seconds per beep
        const gap = 0.08;
        const pause = 0.4; // between triplets
        const frequency = 1050;
        const now = ctx.currentTime;
        const scheduleBeep = (start) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = frequency;
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.2, start);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
            osc.start(start);
            osc.stop(start + duration + 0.05);
        };
        // Three beeps, pause, three beeps
        let t = now;
        for (let i = 0; i < 3; i++) {
            scheduleBeep(t);
            t += duration + gap;
        }
        t += pause;
        for (let i = 0; i < 3; i++) {
            scheduleBeep(t);
            t += duration + gap;
        }
    }
    catch (error) {
        console.error('Unable to play rest beep', error);
    }
}
function stopResting() {
    if (restTimer) {
        clearInterval(restTimer);
        restTimer = null;
    }
    const container = document.getElementById('rest-timer-container');
    if (container)
        container.style.display = 'none';
    const activeWorkout = getActiveWorkout();
    if (activeWorkout) {
        activeWorkout.isResting = false;
        activeWorkout.restStartTime = undefined;
        activeWorkout.restDuration = undefined;
        activeWorkout.restLabel = undefined;
        saveActiveWorkout(activeWorkout);
    }
    restEndTime = null;
    stopRestBeep();
    refreshLiveWorkout();
}
function skipRest() {
    stopResting();
}
function addRestTime(seconds) {
    if (restEndTime) {
        restEndTime += seconds * 1000;
        const activeWorkout = getActiveWorkout();
        if (activeWorkout && activeWorkout.restDuration) {
            activeWorkout.restDuration += seconds * 1000;
            saveActiveWorkout(activeWorkout);
        }
    }
}
function startWorkoutTimer() {
    const durationEl = document.getElementById('workout-duration');
    if (!durationEl || !workoutStartTime)
        return;
    // Clear existing timer
    if (workoutTimer)
        clearInterval(workoutTimer);
    const updateDuration = () => {
        const activeWorkout = getActiveWorkout();
        if (!workoutStartTime || !activeWorkout)
            return;
        const { totalMs } = computeWorkoutDurations(activeWorkout);
        durationEl.textContent = formatMsToClock(totalMs);
    };
    updateDuration();
    workoutTimer = window.setInterval(updateDuration, 1000);
}
function stopWorkoutTimer() {
    if (workoutTimer) {
        clearInterval(workoutTimer);
        workoutTimer = null;
    }
}
function togglePauseWorkout() {
    const activeWorkout = getActiveWorkout();
    if (!activeWorkout)
        return;
    const pauseBtn = document.getElementById('pause-workout-btn');
    if (!pauseBtn)
        return;
    if (!activeWorkout.paused) {
        activeWorkout.paused = true;
        activeWorkout.pauseStartedAt = new Date().toISOString();
        saveActiveWorkout(activeWorkout);
        stopWorkoutTimer();
        if (activeWorkout.isResting) {
            stopResting();
        }
        pauseBtn.textContent = '▶️ Resume';
    }
    else {
        const pauseStarted = activeWorkout.pauseStartedAt ? new Date(activeWorkout.pauseStartedAt).getTime() : Date.now();
        const pausedMs = Math.max(0, Date.now() - pauseStarted);
        activeWorkout.totalPausedMs = (activeWorkout.totalPausedMs ?? 0) + pausedMs;
        activeWorkout.paused = false;
        activeWorkout.pauseStartedAt = undefined;
        saveActiveWorkout(activeWorkout);
        startWorkoutTimer();
        if (activeWorkout.isResting && activeWorkout.restStartTime && activeWorkout.restDuration) {
            const restStart = new Date(activeWorkout.restStartTime).getTime();
            const elapsed = Date.now() - restStart;
            const remaining = Math.max(0, activeWorkout.restDuration - elapsed);
            if (remaining > 0) {
                startRestTimer(Math.floor(remaining / 1000), activeWorkout.restLabel ?? REST_LABEL_DEFAULT);
            }
        }
        pauseBtn.textContent = '⏸️ Pause';
    }
}
async function finishWorkout() {
    const activeWorkout = getActiveWorkout();
    if (!activeWorkout)
        return;
    const program = getWorkoutProgramById(activeWorkout.programId);
    if (!program)
        return;
    if (!confirm('Finish this workout?'))
        return;
    const { totalMs, activeMs } = computeWorkoutDurations(activeWorkout);
    const durationMinutes = Math.floor(totalMs / 60000);
    const activeMinutes = Math.floor(activeMs / 60000);
    const completedSets = activeWorkout.exercises.flatMap(ex => ex.sets.filter(s => s.completed)).length;
    const totalSets = activeWorkout.exercises.flatMap(ex => ex.sets).length;
    // Format a simple summary for the notes
    const notesSummary = `Live training - ${new Date(activeWorkout.startTime).toLocaleTimeString()} | ${activeWorkout.programName} | Duration: ${durationMinutes} min (active ${activeMinutes} min) | Sets: ${completedSets}/${totalSets}`;
    // Build structured exercises with timing and set detail
    const structuredExercises = activeWorkout.exercises.map((ex, idx) => {
        const programExercise = program.exercises.find(e => e.id === ex.exerciseId);
        const elapsedMs = calculateExerciseElapsedMs(ex.sets);
        return {
            exerciseId: ex.exerciseId,
            name: programExercise?.name ?? `Exercise ${idx + 1}`,
            notes: programExercise?.notes,
            elapsedMs,
            sets: ex.sets.map(set => ({
                setNumber: set.setNumber,
                weight: set.weight,
                reps: programExercise?.reps,
                completed: set.completed,
                completedAt: set.completedAt
            }))
        };
    });
    // Save as regular workout with detailed data
    await addTraining({
        date: activeWorkout.startTime.split('T')[0],
        type: 'strength',
        durationMinutes,
        programName: activeWorkout.programName,
        exercises: structuredExercises,
        notes: notesSummary
    });
    // Clean up
    stopWorkoutTimer();
    stopResting();
    clearActiveWorkout();
    workoutStartTime = null;
    // Show notification
    alert(`Training saved! ${durationMinutes} min, ${completedSets}/${totalSets} sets`);
    // Reload page to refresh UI and show saved workout
    window.location.reload();
}
function resetWorkout() {
    if (!confirm('Reset this workout? All progress will be lost.'))
        return;
    const activeWorkout = getActiveWorkout();
    if (!activeWorkout) {
        console.warn('No active workout to reset.');
        return;
    }
    const program = getWorkoutProgramById(activeWorkout.programId);
    if (!program) {
        console.error('Program not found for reset:', activeWorkout.programId);
        return;
    }
    // Clean up timers and rest state
    stopWorkoutTimer();
    stopResting();
    restEndTime = null;
    // Build a fresh workout for the same program and persist it
    const freshWorkout = createActiveWorkout(program);
    saveActiveWorkout(freshWorkout);
    workoutStartTime = new Date(freshWorkout.startTime);
    // Ensure UI reflects reset state
    showActiveWorkoutScreen(program.displayName);
    renderExercises(program, freshWorkout);
    attachSetEventListeners();
    startResting(INITIAL_SESSION_REST_SECONDS, WARMUP_LABEL);
    startWorkoutTimer();
    // Reset pause button label
    const pauseBtn = document.getElementById('pause-workout-btn');
    if (pauseBtn)
        pauseBtn.textContent = '⏸️ Pause';
}
// Cleanup timers on page unload
window.addEventListener('beforeunload', () => {
    if (workoutTimer)
        clearInterval(workoutTimer);
    if (restTimer)
        clearInterval(restTimer);
});
function calculateExerciseElapsedMs(sets) {
    const completedTimestamps = sets
        .filter(s => s.completed && s.completedAt)
        .map(s => new Date(s.completedAt).getTime());
    if (completedTimestamps.length === 0)
        return undefined;
    const earliest = Math.min(...completedTimestamps);
    const latest = Math.max(...completedTimestamps);
    return Math.max(0, latest - earliest);
}
function handleSetModeChange(exerciseIndex, setIndex, mode) {
    const activeWorkout = getActiveWorkout();
    if (!activeWorkout)
        return;
    const targetSet = activeWorkout.exercises[exerciseIndex]?.sets[setIndex];
    if (!targetSet)
        return;
    if (mode === 'full') {
        targetSet.partial = false;
        targetSet.actualReps = undefined;
    }
    else {
        targetSet.partial = true;
    }
    saveActiveWorkout(activeWorkout);
    const partialRow = document.querySelector(`.partial-rep-row[data-exercise-index="${exerciseIndex}"][data-set-index="${setIndex}"]`);
    if (partialRow) {
        partialRow.style.display = mode === 'partial' ? '' : 'none';
    }
}
function handlePartialRepsSelection(exerciseIndex, setIndex, reps) {
    const activeWorkout = getActiveWorkout();
    if (!activeWorkout)
        return;
    const targetSet = activeWorkout.exercises[exerciseIndex]?.sets[setIndex];
    if (!targetSet)
        return;
    targetSet.partial = true;
    targetSet.actualReps = reps;
    saveActiveWorkout(activeWorkout);
    document.querySelectorAll(`.partial-rep-btn[data-exercise-index="${exerciseIndex}"][data-set-index="${setIndex}"]`).forEach(btn => {
        const btnReps = parseInt(btn.getAttribute('data-reps') || '0');
        if (btnReps === reps) {
            btn.classList.add('active');
        }
        else {
            btn.classList.remove('active');
        }
    });
    const partialRadio = document.querySelector(`input[name="set-status-${exerciseIndex}-${setIndex}"][value="partial"]`);
    if (partialRadio) {
        partialRadio.checked = true;
    }
}
// Helper: create a fresh active workout state from a program
function createActiveWorkout(program) {
    return {
        programId: program.id,
        programName: program.displayName,
        startTime: new Date().toISOString(),
        exercises: program.exercises.map(exercise => ({
            exerciseId: exercise.id,
            sets: Array.from({ length: exercise.sets }, (_, i) => ({
                setNumber: i + 1,
                completed: false
            })),
            currentSet: 0
        })),
        currentExerciseIndex: 0,
        isResting: false,
        paused: false,
        totalPausedMs: 0
    };
}
function normalizeActiveWorkoutTiming(activeWorkout) {
    const paused = Boolean(activeWorkout.paused);
    const totalPausedMs = activeWorkout.totalPausedMs ?? 0;
    let pauseStartedAt = activeWorkout.pauseStartedAt;
    if (!paused) {
        pauseStartedAt = undefined;
    }
    else if (!pauseStartedAt) {
        pauseStartedAt = new Date().toISOString();
    }
    return {
        ...activeWorkout,
        paused,
        totalPausedMs,
        pauseStartedAt
    };
}
function computeWorkoutDurations(activeWorkout) {
    const startMs = new Date(activeWorkout.startTime).getTime();
    const now = Date.now();
    const totalMs = Math.max(0, now - startMs);
    const pausedAccum = activeWorkout.totalPausedMs ?? 0;
    const currentPaused = activeWorkout.paused && activeWorkout.pauseStartedAt
        ? Math.max(0, now - new Date(activeWorkout.pauseStartedAt).getTime())
        : 0;
    const activeMs = Math.max(0, totalMs - pausedAccum - currentPaused);
    return { totalMs, activeMs };
}
function formatMsToClock(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
//# sourceMappingURL=liveWorkout.js.map