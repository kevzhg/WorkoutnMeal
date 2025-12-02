import { getOnigiriPlanner as fetchOnigiriPlanner, saveOnigiriPlanner as persistOnigiriPlanner } from './storage.js';
const LOCAL_STORAGE_KEY = 'onigiri-planner';
const DEFAULT_SECTIONS = [
    'Business Plan',
    'Food Cost',
    'Receipt Planning',
    'Apply for Permit',
    'Marketing',
    'Logistic'
];
let planner = null;
let initialized = false;
let saveStatus = 'idle';
let saveMessage = '';
let saveTimer = null;
let isSaving = false;
let overflowListenerAttached = false;
let pendingSave = false;
let retryTimer = null;
function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `onigiri-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
function normalizeWeight(weight) {
    if (typeof weight === 'number' && Number.isFinite(weight) && weight > 0) {
        return weight;
    }
    return 1;
}
function getDefaultSections() {
    return DEFAULT_SECTIONS.map(name => ({
        id: generateId(),
        name,
        weight: 1,
        items: []
    }));
}
function createDefaultPlanner() {
    return {
        id: generateId(),
        sections: getDefaultSections(),
        completion: 0,
        updatedAt: new Date().toISOString()
    };
}
function loadLocalPlanner() {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw)
            return createDefaultPlanner();
        return normalizePlanner(JSON.parse(raw), false);
    }
    catch (error) {
        console.error('Failed to load local Onigiri planner', error);
        return createDefaultPlanner();
    }
}
function persistLocalPlanner(current) {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
    }
    catch (error) {
        console.error('Failed to save Onigiri planner locally', error);
    }
}
function normalizeItem(item) {
    return {
        id: item.id || generateId(),
        title: item.title || 'New Item',
        notes: item.notes ?? '',
        weight: normalizeWeight(item.weight),
        done: Boolean(item.done),
        completion: item.completion ?? (item.done ? 1 : 0),
        updatedAt: item.updatedAt
    };
}
function normalizeSection(section) {
    const normalizedItems = (section.items || []).map(normalizeItem);
    return {
        id: section.id || generateId(),
        name: section.name || 'Untitled Section',
        weight: normalizeWeight(section.weight),
        items: normalizedItems,
        completion: section.completion,
        updatedAt: section.updatedAt
    };
}
function normalizePlanner(raw, fillDefaults = true) {
    const normalizedSections = Array.isArray(raw.sections) ? raw.sections.map(normalizeSection) : [];
    const sections = normalizedSections.length > 0 ? normalizedSections : (fillDefaults ? getDefaultSections() : []);
    return {
        id: raw.id || generateId(),
        sections,
        completion: raw.completion,
        updatedAt: raw.updatedAt
    };
}
function calculateSectionCompletion(section) {
    if (!section.items || section.items.length === 0)
        return 0;
    const totalWeight = section.items.reduce((sum, item) => sum + normalizeWeight(item.weight), 0);
    if (totalWeight <= 0)
        return 0;
    const completedWeight = section.items.reduce((sum, item) => sum + (item.done ? normalizeWeight(item.weight) : 0), 0);
    return completedWeight / totalWeight;
}
function withCompletions(base) {
    const sectionsWithCompletion = base.sections.map(section => {
        const items = section.items.map(item => ({
            ...item,
            weight: normalizeWeight(item.weight),
            completion: item.done ? 1 : 0
        }));
        const completion = calculateSectionCompletion({ ...section, items });
        return {
            ...section,
            items,
            completion
        };
    });
    const totalWeight = sectionsWithCompletion.reduce((sum, section) => sum + normalizeWeight(section.weight), 0);
    const plannerCompletion = totalWeight > 0
        ? sectionsWithCompletion.reduce((sum, section) => sum + normalizeWeight(section.weight) * (section.completion ?? 0), 0) / totalWeight
        : 0;
    return {
        ...base,
        sections: sectionsWithCompletion,
        completion: plannerCompletion
    };
}
function updateSaveStatus(status, message = '') {
    saveStatus = status;
    saveMessage = message;
    const el = document.getElementById('onigiri-save-status');
    if (el) {
        const text = status === 'saving'
            ? 'Saving...'
            : status === 'saved'
                ? 'Saved'
                : status === 'error'
                    ? message || 'Offline - not saved'
                    : '';
        el.textContent = text;
        el.className = `onigiri-save-status ${status}`;
    }
}
function extractErrorMessage(error) {
    if (error instanceof Error && error.message)
        return error.message;
    return 'Unable to reach server';
}
async function persistPlanner() {
    if (!planner)
        return;
    if (isSaving) {
        pendingSave = true;
        return;
    }
    isSaving = true;
    pendingSave = false;
    try {
        updateSaveStatus('saving');
        const saved = await persistOnigiriPlanner(planner);
        planner = withCompletions(normalizePlanner(saved));
        persistLocalPlanner(planner);
        updateSaveStatus('saved');
        renderProgress();
    }
    catch (error) {
        console.error('Failed to save Onigiri planner', error);
        pendingSave = true;
        updateSaveStatus('error', `Save failed - stored locally (${extractErrorMessage(error)})`);
        queueRetry();
    }
    finally {
        isSaving = false;
        if (pendingSave) {
            pendingSave = false;
            void persistPlanner();
        }
    }
}
function queueRetry() {
    if (retryTimer) {
        window.clearTimeout(retryTimer);
    }
    retryTimer = window.setTimeout(() => {
        retryTimer = null;
        if (!isSaving && pendingSave && planner) {
            void persistPlanner();
        }
    }, 3000);
}
function scheduleSave() {
    pendingSave = true;
    if (saveTimer) {
        window.clearTimeout(saveTimer);
    }
    if (!isSaving) {
        saveTimer = window.setTimeout(() => {
            saveTimer = null;
            void persistPlanner();
        }, 400);
    }
    updateSaveStatus('saving');
}
function closeAllOverflows(except) {
    document.querySelectorAll('.onigiri-overflow.open').forEach(el => {
        if (!except || el !== except) {
            el.classList.remove('open');
        }
    });
}
function attachOverflowCloseListener() {
    if (overflowListenerAttached)
        return;
    document.addEventListener('click', (event) => {
        const target = event.target;
        closeAllOverflows(target?.closest('.onigiri-overflow'));
    });
    window.addEventListener('online', () => {
        if (planner) {
            pendingSave = true;
            void persistPlanner();
        }
    });
    overflowListenerAttached = true;
}
function setPlanner(next, options) {
    const { render = true, save = false, touchUpdatedAt = false } = options || {};
    const base = touchUpdatedAt ? { ...next, updatedAt: new Date().toISOString() } : next;
    planner = withCompletions(normalizePlanner(base));
    persistLocalPlanner(planner);
    if (render) {
        renderPlanner();
    }
    if (save) {
        scheduleSave();
    }
}
function renderProgress() {
    if (!planner)
        return;
    const percent = Math.round((planner.completion ?? 0) * 100);
    const fillEl = document.getElementById('onigiri-fill');
    const percentText = document.getElementById('onigiri-progress-number');
    const progressPill = document.getElementById('onigiri-progress-pill');
    const itemCountEl = document.getElementById('onigiri-item-count');
    if (fillEl) {
        fillEl.style.height = `${Math.min(100, Math.max(0, percent))}%`;
    }
    if (percentText) {
        percentText.textContent = `${percent}%`;
    }
    if (progressPill) {
        progressPill.textContent = `${percent}% complete`;
    }
    if (itemCountEl) {
        const total = planner.sections.reduce((sum, section) => sum + section.items.length, 0);
        const done = planner.sections.reduce((sum, section) => sum + section.items.filter(item => item.done).length, 0);
        itemCountEl.textContent = total === 0 ? 'No items yet' : `${done} of ${total} items done`;
    }
}
function renderItems(section, container) {
    container.innerHTML = '';
    if (section.items.length === 0) {
        const emptyState = document.createElement('p');
        emptyState.className = 'no-data';
        emptyState.textContent = 'No items yet. Add your first task.';
        container.appendChild(emptyState);
        return;
    }
    section.items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = `onigiri-item${item.done ? ' done' : ''}`;
        itemEl.dataset.itemId = item.id;
        itemEl.innerHTML = `
            <div class="onigiri-item-main">
                <label class="onigiri-checkbox-row">
                    <input type="checkbox" class="item-toggle" />
                    <input type="text" class="onigiri-input item-title" placeholder="Task title" />
                </label>
                <div class="onigiri-item-meta">
                    <div class="onigiri-config item-config">
                        <div class="onigiri-config-panel">
                            <div class="onigiri-weight-input">
                                <label class="label-caps">Weight</label>
                                <input type="number" class="onigiri-input item-weight-input" min="0" step="0.1" />
                                <div class="onigiri-config-actions">
                                    <button class="btn btn-primary btn-small save-item-weight" type="button">Save</button>
                                    <button class="btn btn-secondary btn-small close-item-config" type="button">Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="onigiri-overflow">
                        <button class="onigiri-overflow-toggle" type="button" aria-haspopup="true" aria-expanded="false">⋮</button>
                        <div class="onigiri-overflow-menu">
                            <button class="onigiri-menu-item configure-item" type="button">Configure weight</button>
                            <button class="onigiri-menu-item delete-item-btn" type="button">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
            <textarea class="onigiri-textarea item-notes" rows="2" placeholder="Notes..."></textarea>
        `;
        const toggle = itemEl.querySelector('.item-toggle');
        const titleInput = itemEl.querySelector('.item-title');
        const notesInput = itemEl.querySelector('.item-notes');
        const weightInput = itemEl.querySelector('.item-weight-input');
        const deleteBtn = itemEl.querySelector('.delete-item-btn');
        const config = itemEl.querySelector('.item-config');
        const saveWeightBtn = itemEl.querySelector('.save-item-weight');
        const closeConfigBtn = itemEl.querySelector('.close-item-config');
        const overflow = itemEl.querySelector('.onigiri-overflow');
        const overflowToggle = itemEl.querySelector('.onigiri-overflow-toggle');
        const configureBtn = itemEl.querySelector('.configure-item');
        if (toggle) {
            toggle.checked = item.done;
            toggle.addEventListener('change', () => toggleItemDone(section.id, item.id, toggle.checked));
        }
        if (titleInput) {
            titleInput.value = item.title;
            titleInput.addEventListener('input', () => updateItemTitle(section.id, item.id, titleInput.value));
        }
        if (notesInput) {
            notesInput.value = item.notes || '';
            notesInput.addEventListener('input', () => updateItemNotes(section.id, item.id, notesInput.value));
        }
        if (weightInput) {
            weightInput.value = String(normalizeWeight(item.weight));
        }
        const toggleConfig = (open) => {
            if (config) {
                if (open) {
                    config.classList.add('open');
                    overflowToggle?.setAttribute('aria-expanded', 'true');
                    weightInput?.focus();
                }
                else {
                    config.classList.remove('open');
                    overflowToggle?.setAttribute('aria-expanded', 'false');
                }
            }
        };
        if (saveWeightBtn && weightInput) {
            saveWeightBtn.addEventListener('click', () => {
                updateItemWeight(section.id, item.id, weightInput.value);
                toggleConfig(false);
            });
        }
        if (closeConfigBtn && weightInput) {
            closeConfigBtn.addEventListener('click', () => {
                weightInput.value = String(normalizeWeight(item.weight));
                toggleConfig(false);
            });
        }
        const toggleOverflow = (open) => {
            if (overflow) {
                if (open) {
                    config?.classList.remove('open');
                    overflow.classList.add('open');
                    overflowToggle?.setAttribute('aria-expanded', 'true');
                }
                else {
                    overflow.classList.remove('open');
                    overflowToggle?.setAttribute('aria-expanded', 'false');
                }
            }
        };
        if (overflowToggle) {
            overflowToggle.addEventListener('click', (event) => {
                event.stopPropagation();
                closeAllOverflows(overflow || undefined);
                toggleOverflow(!overflow?.classList.contains('open'));
            });
        }
        if (configureBtn) {
            configureBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                closeAllOverflows();
                toggleOverflow(false);
                toggleConfig(true);
            });
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleOverflow(false);
                deleteItem(section.id, item.id);
            });
        }
        container.appendChild(itemEl);
    });
}
function renderSections() {
    if (!planner)
        return;
    const container = document.getElementById('onigiri-sections');
    if (!container)
        return;
    container.innerHTML = '';
    if (planner.sections.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'onigiri-empty card';
        empty.innerHTML = `
            <p class="eyebrow">Onigiri Planner</p>
            <h3>Start with a section</h3>
            <p class="small-text">Add a section like "Suppliers" or "Permits" to begin tracking tasks.</p>
        `;
        container.appendChild(empty);
        renderProgress();
        return;
    }
    planner.sections.forEach(section => {
        const sectionEl = document.createElement('div');
        sectionEl.className = 'onigiri-section card';
        sectionEl.dataset.sectionId = section.id;
        sectionEl.innerHTML = `
            <div class="onigiri-section-header">
                <div class="onigiri-section-title">
                    <span class="label-caps onigiri-section-name"></span>
                </div>
                <div class="onigiri-section-actions">
                    <span class="onigiri-progress-chip">${Math.round((section.completion ?? 0) * 100)}%</span>
                    <div class="onigiri-config section-config">
                        <div class="onigiri-config-panel">
                            <div class="onigiri-weight-input">
                                <label class="label-caps">Weight</label>
                                <input type="number" class="onigiri-input section-weight-input" min="0" step="0.1" />
                                <div class="onigiri-config-actions">
                                    <button class="btn btn-primary btn-small save-section-weight" type="button">Save</button>
                                    <button class="btn btn-secondary btn-small close-section-config" type="button">Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="onigiri-overflow">
                        <button class="onigiri-overflow-toggle" type="button" aria-haspopup="true" aria-expanded="false">⋮</button>
                        <div class="onigiri-overflow-menu">
                            <button class="onigiri-menu-item rename-section" type="button">Rename section</button>
                            <button class="onigiri-menu-item configure-section" type="button">Configure weight</button>
                            <button class="onigiri-menu-item delete-section-btn" type="button">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="onigiri-item-list"></div>
            <div class="onigiri-add-item">
                <input type="text" class="onigiri-input add-item-title" placeholder="Add item title" />
                <input type="text" class="onigiri-input add-item-notes" placeholder="Notes (optional)" />
                <button class="btn btn-primary btn-small add-item-btn" type="button">Add Item</button>
            </div>
        `;
        const nameDisplay = sectionEl.querySelector('.onigiri-section-name');
        const weightInput = sectionEl.querySelector('.section-weight-input');
        const deleteBtn = sectionEl.querySelector('.delete-section-btn');
        const renameBtn = sectionEl.querySelector('.rename-section');
        const addItemBtn = sectionEl.querySelector('.add-item-btn');
        const addItemTitle = sectionEl.querySelector('.add-item-title');
        const addItemNotes = sectionEl.querySelector('.add-item-notes');
        const itemList = sectionEl.querySelector('.onigiri-item-list');
        const config = sectionEl.querySelector('.section-config');
        const saveWeightBtn = sectionEl.querySelector('.save-section-weight');
        const closeConfigBtn = sectionEl.querySelector('.close-section-config');
        const overflow = sectionEl.querySelector('.onigiri-overflow');
        const overflowToggle = sectionEl.querySelector('.onigiri-overflow-toggle');
        const configureBtn = sectionEl.querySelector('.configure-section');
        if (nameDisplay) {
            nameDisplay.textContent = section.name;
        }
        if (weightInput) {
            weightInput.value = String(normalizeWeight(section.weight));
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                closeAllOverflows();
                deleteSection(section.id);
            });
        }
        if (renameBtn && nameDisplay) {
            renameBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                const next = window.prompt('Rename section', nameDisplay.textContent || section.name || 'Section');
                closeAllOverflows();
                if (next && next.trim()) {
                    nameDisplay.textContent = next.trim();
                    updateSectionName(section.id, next.trim());
                }
            });
        }
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => {
                const title = (addItemTitle?.value || '').trim();
                const notes = (addItemNotes?.value || '').trim();
                if (!title) {
                    addItemTitle?.focus();
                    return;
                }
                addItem(section.id, title, notes);
                if (addItemTitle)
                    addItemTitle.value = '';
                if (addItemNotes)
                    addItemNotes.value = '';
            });
        }
        if (addItemTitle) {
            addItemTitle.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    addItemBtn?.click();
                }
            });
        }
        const toggleConfig = (open) => {
            if (config) {
                if (open) {
                    config.classList.add('open');
                    overflowToggle?.setAttribute('aria-expanded', 'true');
                    weightInput?.focus();
                }
                else {
                    config.classList.remove('open');
                    overflowToggle?.setAttribute('aria-expanded', 'false');
                }
            }
        };
        const toggleOverflow = (open) => {
            if (overflow) {
                if (open) {
                    config?.classList.remove('open');
                    closeAllOverflows(overflow);
                    overflow.classList.add('open');
                    overflowToggle?.setAttribute('aria-expanded', 'true');
                }
                else {
                    overflow.classList.remove('open');
                    overflowToggle?.setAttribute('aria-expanded', 'false');
                }
            }
        };
        if (configureBtn) {
            configureBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                closeAllOverflows();
                toggleOverflow(false);
                toggleConfig(true);
            });
        }
        if (overflowToggle) {
            overflowToggle.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleOverflow(!overflow?.classList.contains('open'));
            });
        }
        if (saveWeightBtn && weightInput) {
            saveWeightBtn.addEventListener('click', () => {
                updateSectionWeight(section.id, weightInput.value);
                toggleConfig(false);
            });
        }
        if (closeConfigBtn && weightInput) {
            closeConfigBtn.addEventListener('click', () => {
                weightInput.value = String(normalizeWeight(section.weight));
                toggleConfig(false);
            });
        }
        if (itemList) {
            renderItems(section, itemList);
        }
        container.appendChild(sectionEl);
    });
    renderProgress();
}
function renderPlanner() {
    renderSections();
    renderProgress();
}
function addSection(name) {
    if (!planner)
        return;
    const now = new Date().toISOString();
    const newSection = {
        id: generateId(),
        name: name || 'Untitled Section',
        weight: 1,
        items: [],
        updatedAt: now
    };
    setPlanner({
        ...planner,
        sections: [...planner.sections, newSection]
    }, { save: true, touchUpdatedAt: true });
}
function updateSectionName(sectionId, name) {
    if (!planner)
        return;
    const now = new Date().toISOString();
    setPlanner({
        ...planner,
        sections: planner.sections.map(section => section.id === sectionId ? { ...section, name: name || 'Untitled Section', updatedAt: now } : section)
    }, { save: true, render: false, touchUpdatedAt: true });
    renderProgress();
}
function updateSectionWeight(sectionId, weightInput) {
    if (!planner)
        return;
    const weight = normalizeWeight(Number(weightInput));
    const now = new Date().toISOString();
    setPlanner({
        ...planner,
        sections: planner.sections.map(section => section.id === sectionId ? { ...section, weight, updatedAt: now } : section)
    }, { save: true, touchUpdatedAt: true });
}
function deleteSection(sectionId) {
    if (!planner)
        return;
    setPlanner({
        ...planner,
        sections: planner.sections.filter(section => section.id !== sectionId)
    }, { save: true, touchUpdatedAt: true });
}
function addItem(sectionId, title, notes) {
    if (!planner)
        return;
    const now = new Date().toISOString();
    setPlanner({
        ...planner,
        sections: planner.sections.map(section => section.id === sectionId
            ? {
                ...section,
                updatedAt: now,
                items: [
                    ...section.items,
                    {
                        id: generateId(),
                        title,
                        notes,
                        weight: 1,
                        done: false,
                        updatedAt: now
                    }
                ]
            }
            : section)
    }, { save: true, touchUpdatedAt: true });
}
function updateItemTitle(sectionId, itemId, title) {
    if (!planner)
        return;
    const now = new Date().toISOString();
    setPlanner({
        ...planner,
        sections: planner.sections.map(section => section.id === sectionId
            ? {
                ...section,
                updatedAt: now,
                items: section.items.map(item => item.id === itemId ? { ...item, title: title || 'Untitled Item', updatedAt: now } : item)
            }
            : section)
    }, { save: true, render: false, touchUpdatedAt: true });
}
function updateItemNotes(sectionId, itemId, notes) {
    if (!planner)
        return;
    const now = new Date().toISOString();
    setPlanner({
        ...planner,
        sections: planner.sections.map(section => section.id === sectionId
            ? {
                ...section,
                updatedAt: now,
                items: section.items.map(item => item.id === itemId ? { ...item, notes, updatedAt: now } : item)
            }
            : section)
    }, { save: true, render: false, touchUpdatedAt: true });
}
function updateItemWeight(sectionId, itemId, weightInput) {
    if (!planner)
        return;
    const weight = normalizeWeight(Number(weightInput));
    const now = new Date().toISOString();
    setPlanner({
        ...planner,
        sections: planner.sections.map(section => section.id === sectionId
            ? {
                ...section,
                updatedAt: now,
                items: section.items.map(item => item.id === itemId ? { ...item, weight, updatedAt: now } : item)
            }
            : section)
    }, { save: true, touchUpdatedAt: true });
}
function toggleItemDone(sectionId, itemId, done) {
    if (!planner)
        return;
    const now = new Date().toISOString();
    setPlanner({
        ...planner,
        sections: planner.sections.map(section => section.id === sectionId
            ? {
                ...section,
                updatedAt: now,
                items: section.items.map(item => item.id === itemId ? { ...item, done, updatedAt: now } : item)
            }
            : section)
    }, { save: true, touchUpdatedAt: true });
}
function deleteItem(sectionId, itemId) {
    if (!planner)
        return;
    const now = new Date().toISOString();
    setPlanner({
        ...planner,
        sections: planner.sections.map(section => section.id === sectionId
            ? { ...section, updatedAt: now, items: section.items.filter(item => item.id !== itemId) }
            : section)
    }, { save: true, touchUpdatedAt: true });
}
function bindAddSection() {
    const nameInput = document.getElementById('onigiri-section-name');
    const addButton = document.getElementById('onigiri-add-section');
    if (addButton) {
        addButton.addEventListener('click', () => {
            const name = (nameInput?.value || '').trim();
            if (!name) {
                nameInput?.focus();
                return;
            }
            addSection(name);
            if (nameInput)
                nameInput.value = '';
        });
    }
    if (nameInput) {
        nameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                addButton?.click();
            }
        });
    }
}
export async function initializeOnigiriPlanner() {
    if (initialized)
        return;
    try {
        const remote = await fetchOnigiriPlanner();
        setPlanner(remote, { render: false });
        updateSaveStatus('saved');
    }
    catch (error) {
        console.error('Falling back to local Onigiri planner', error);
        const local = loadLocalPlanner();
        setPlanner(local, { render: false });
        updateSaveStatus('error', 'Offline - using local copy');
    }
    initialized = true;
    renderPlanner();
    bindAddSection();
    attachOverflowCloseListener();
}
export function refreshOnigiriPlanner() {
    if (!initialized) {
        void initializeOnigiriPlanner();
        return;
    }
    renderPlanner();
}
//# sourceMappingURL=onigiri.js.map