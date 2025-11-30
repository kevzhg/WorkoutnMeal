import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';
const app = express();
const PORT = Number(process.env.PORT || 8000);
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGO_DB = process.env.MONGODB_DB || 'homebase';
const MONGO_COLLECTION = process.env.MONGODB_COLLECTION_TRAININGS
    || process.env.MONGODB_COLLECTION_WORKOUTS
    || 'trainings';
const MONGO_COLLECTION_MEALS = process.env.MONGODB_COLLECTION_MEALS || 'meals';
const MONGO_COLLECTION_WEIGHT = process.env.MONGODB_COLLECTION_WEIGHT || 'weight';
const MONGO_COLLECTION_ONIGIRI = process.env.MONGODB_COLLECTION_ONIGIRI || 'onigiri';
const client = new MongoClient(MONGO_URI);
let trainingsCollection = null;
let mealsCollection = null;
let weightCollection = null;
let onigiriCollection = null;
async function connectDb() {
    if (!trainingsCollection) {
        await client.connect();
        const db = client.db(MONGO_DB);
        trainingsCollection = db.collection(MONGO_COLLECTION);
        mealsCollection = db.collection(MONGO_COLLECTION_MEALS);
        weightCollection = db.collection(MONGO_COLLECTION_WEIGHT);
        onigiriCollection = db.collection(MONGO_COLLECTION_ONIGIRI);
        await trainingsCollection.createIndex({ date: 1 });
        await trainingsCollection.createIndex({ createdAt: -1 });
        await mealsCollection.createIndex({ date: 1 });
        await weightCollection.createIndex({ date: 1 });
        await onigiriCollection.createIndex({ id: 1 }, { unique: true });
    }
}
// Middleware
app.use(cors());
app.use(express.json());
app.use(async (_req, res, next) => {
    try {
        await connectDb();
        next();
    }
    catch (error) {
        console.error('Mongo connection error:', error);
        res.status(500).json({ message: 'Failed to connect to database' });
    }
});
// Helpers
function toResponse(doc) {
    const { _id, ...rest } = doc;
    return { id: _id?.toString(), ...rest };
}
function mealToResponse(doc) {
    const { _id, ...rest } = doc;
    return { id: _id?.toString(), ...rest };
}
function weightToResponse(doc) {
    const { _id, ...rest } = doc;
    return { id: _id?.toString(), ...rest };
}
function onigiriToResponse(doc) {
    const { _id, ...rest } = doc;
    const serializeDate = (value) => value ? value.toISOString() : undefined;
    return {
        id: rest.id,
        completion: rest.completion,
        updatedAt: serializeDate(rest.updatedAt),
        sections: (rest.sections || []).map(section => ({
            ...section,
            completion: section.completion,
            updatedAt: serializeDate(section.updatedAt),
            items: (section.items || []).map(item => ({
                ...item,
                completion: item.completion,
                updatedAt: serializeDate(item.updatedAt)
            }))
        }))
    };
}
function parseId(id) {
    try {
        return new ObjectId(id);
    }
    catch {
        return null;
    }
}
function normalizeWeight(weight) {
    if (typeof weight === 'number' && Number.isFinite(weight) && weight > 0) {
        return weight;
    }
    return 1;
}
function calculateSectionCompletion(section) {
    const items = section.items || [];
    if (items.length === 0)
        return 0;
    const totalWeight = items.reduce((sum, item) => sum + normalizeWeight(item.weight), 0);
    if (totalWeight <= 0)
        return 0;
    const completedWeight = items.reduce((sum, item) => sum + (item.done ? normalizeWeight(item.weight) : 0), 0);
    return completedWeight / totalWeight;
}
function calculatePlannerCompletion(sections) {
    if (sections.length === 0)
        return 0;
    const totalWeight = sections.reduce((sum, section) => sum + normalizeWeight(section.weight), 0);
    if (totalWeight <= 0)
        return 0;
    const weightedSum = sections.reduce((sum, section) => sum + normalizeWeight(section.weight) * (section.completion ?? 0), 0);
    return weightedSum / totalWeight;
}
function normalizeItemPayload(raw, now) {
    if (!raw.id || typeof raw.id !== 'string')
        return null;
    if (!raw.title || typeof raw.title !== 'string')
        return null;
    return {
        id: raw.id,
        title: raw.title,
        notes: raw.notes ?? '',
        weight: normalizeWeight(raw.weight),
        done: Boolean(raw.done),
        completion: raw.done ? 1 : 0,
        updatedAt: raw.updatedAt ?? now
    };
}
function normalizeSectionPayload(raw, now) {
    if (!raw.id || typeof raw.id !== 'string')
        return null;
    if (!raw.name || typeof raw.name !== 'string')
        return null;
    const items = [];
    for (const item of raw.items || []) {
        const normalized = normalizeItemPayload(item, now);
        if (!normalized)
            return null;
        items.push(normalized);
    }
    const section = {
        id: raw.id,
        name: raw.name,
        weight: normalizeWeight(raw.weight),
        items,
        updatedAt: now
    };
    section.completion = calculateSectionCompletion(section);
    return section;
}
function buildPlannerDoc(payload, existing) {
    if (!payload.id || typeof payload.id !== 'string')
        return null;
    const now = new Date();
    const sections = [];
    for (const section of payload.sections || []) {
        const normalized = normalizeSectionPayload(section, now);
        if (!normalized)
            return null;
        sections.push(normalized);
    }
    const doc = {
        id: payload.id,
        sections,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
    };
    doc.completion = calculatePlannerCompletion(doc.sections);
    if (existing && existing._id) {
        doc._id = existing._id;
    }
    return doc;
}
// Routes (trainings + backward-compatible workouts alias)
app.get('/api/trainings', async (_req, res) => {
    if (!trainingsCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const docs = await trainingsCollection.find().sort({ createdAt: -1 }).toArray();
    res.json(docs.map(toResponse));
});
app.get('/api/trainings/:id', async (req, res) => {
    if (!trainingsCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const objId = parseId(req.params.id);
    if (!objId)
        return res.status(400).json({ message: 'Invalid id' });
    const doc = await trainingsCollection.findOne({ _id: objId });
    if (!doc)
        return res.status(404).json({ message: 'Training not found' });
    res.json(toResponse(doc));
});
app.post('/api/trainings', async (req, res) => {
    if (!trainingsCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const training = req.body;
    const now = new Date();
    const doc = {
        ...training,
        createdAt: now,
        updatedAt: now
    };
    const result = await trainingsCollection.insertOne(doc);
    const inserted = await trainingsCollection.findOne({ _id: result.insertedId });
    res.status(201).json(inserted ? toResponse(inserted) : { id: result.insertedId.toString(), ...doc });
});
app.put('/api/trainings/:id', async (req, res) => {
    if (!trainingsCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const objId = parseId(req.params.id);
    if (!objId)
        return res.status(400).json({ message: 'Invalid id' });
    const updates = req.body;
    updates.updatedAt = new Date();
    const updated = await trainingsCollection.findOneAndUpdate({ _id: objId }, { $set: updates }, { returnDocument: 'after' });
    if (!updated)
        return res.status(404).json({ message: 'Training not found' });
    res.json(toResponse(updated));
});
app.delete('/api/trainings/:id', async (req, res) => {
    if (!trainingsCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const objId = parseId(req.params.id);
    if (!objId)
        return res.status(400).json({ message: 'Invalid id' });
    const result = await trainingsCollection.deleteOne({ _id: objId });
    if (result.deletedCount === 0)
        return res.status(404).json({ message: 'Training not found' });
    res.status(204).send();
});
// Legacy workout routes (alias to trainings)
app.get('/api/workouts', async (_req, res) => {
    if (!trainingsCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const docs = await trainingsCollection.find().sort({ createdAt: -1 }).toArray();
    res.json(docs.map(toResponse));
});
app.get('/api/workouts/:id', async (req, res) => {
    if (!trainingsCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const objId = parseId(req.params.id);
    if (!objId)
        return res.status(400).json({ message: 'Invalid id' });
    const doc = await trainingsCollection.findOne({ _id: objId });
    if (!doc)
        return res.status(404).json({ message: 'Training not found' });
    res.json(toResponse(doc));
});
app.post('/api/workouts', async (req, res) => {
    if (!trainingsCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const training = req.body;
    const now = new Date();
    const doc = { ...training, createdAt: now, updatedAt: now };
    const result = await trainingsCollection.insertOne(doc);
    const inserted = await trainingsCollection.findOne({ _id: result.insertedId });
    res.status(201).json(inserted ? toResponse(inserted) : { id: result.insertedId.toString(), ...doc });
});
app.put('/api/workouts/:id', async (req, res) => {
    if (!trainingsCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const objId = parseId(req.params.id);
    if (!objId)
        return res.status(400).json({ message: 'Invalid id' });
    const updates = req.body;
    updates.updatedAt = new Date();
    const updated = await trainingsCollection.findOneAndUpdate({ _id: objId }, { $set: updates }, { returnDocument: 'after' });
    if (!updated)
        return res.status(404).json({ message: 'Training not found' });
    res.json(toResponse(updated));
});
app.delete('/api/workouts/:id', async (req, res) => {
    if (!trainingsCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const objId = parseId(req.params.id);
    if (!objId)
        return res.status(400).json({ message: 'Invalid id' });
    const result = await trainingsCollection.deleteOne({ _id: objId });
    if (result.deletedCount === 0)
        return res.status(404).json({ message: 'Training not found' });
    res.status(204).send();
});
// Meals
app.get('/api/meals', async (_req, res) => {
    if (!mealsCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const docs = await mealsCollection.find().sort({ date: -1 }).toArray();
    res.json(docs.map(mealToResponse));
});
app.post('/api/meals', async (req, res) => {
    if (!mealsCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const meal = req.body;
    const now = new Date();
    const doc = { ...meal, createdAt: now, updatedAt: now };
    const result = await mealsCollection.insertOne(doc);
    const inserted = await mealsCollection.findOne({ _id: result.insertedId });
    res.status(201).json(inserted ? mealToResponse(inserted) : { id: result.insertedId.toString(), ...doc });
});
app.put('/api/meals/:id', async (req, res) => {
    if (!mealsCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const objId = parseId(req.params.id);
    if (!objId)
        return res.status(400).json({ message: 'Invalid id' });
    const updates = req.body;
    updates.updatedAt = new Date();
    const updated = await mealsCollection.findOneAndUpdate({ _id: objId }, { $set: updates }, { returnDocument: 'after' });
    if (!updated)
        return res.status(404).json({ message: 'Meal not found' });
    res.json(mealToResponse(updated));
});
app.delete('/api/meals/:id', async (req, res) => {
    if (!mealsCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const objId = parseId(req.params.id);
    if (!objId)
        return res.status(400).json({ message: 'Invalid id' });
    const result = await mealsCollection.deleteOne({ _id: objId });
    if (result.deletedCount === 0)
        return res.status(404).json({ message: 'Meal not found' });
    res.status(204).send();
});
// Weight
app.get('/api/weight', async (_req, res) => {
    if (!weightCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const docs = await weightCollection.find().sort({ date: -1 }).toArray();
    res.json(docs.map(weightToResponse));
});
app.post('/api/weight', async (req, res) => {
    if (!weightCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const entry = req.body;
    const now = new Date();
    const doc = { ...entry, createdAt: now, updatedAt: now };
    const result = await weightCollection.insertOne(doc);
    const inserted = await weightCollection.findOne({ _id: result.insertedId });
    res.status(201).json(inserted ? weightToResponse(inserted) : { id: result.insertedId.toString(), ...doc });
});
app.put('/api/weight/:id', async (req, res) => {
    if (!weightCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const objId = parseId(req.params.id);
    if (!objId)
        return res.status(400).json({ message: 'Invalid id' });
    const updates = req.body;
    updates.updatedAt = new Date();
    const updated = await weightCollection.findOneAndUpdate({ _id: objId }, { $set: updates }, { returnDocument: 'after' });
    if (!updated)
        return res.status(404).json({ message: 'Weight entry not found' });
    res.json(weightToResponse(updated));
});
app.delete('/api/weight/:id', async (req, res) => {
    if (!weightCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const objId = parseId(req.params.id);
    if (!objId)
        return res.status(400).json({ message: 'Invalid id' });
    const result = await weightCollection.deleteOne({ _id: objId });
    if (result.deletedCount === 0)
        return res.status(404).json({ message: 'Weight entry not found' });
    res.status(204).send();
});
// Onigiri Planner
app.get('/api/onigiri', async (_req, res) => {
    if (!onigiriCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const existing = await onigiriCollection.findOne({});
    if (!existing) {
        const now = new Date();
        const doc = {
            id: new ObjectId().toHexString(),
            sections: [],
            completion: 0,
            createdAt: now,
            updatedAt: now
        };
        const result = await onigiriCollection.insertOne(doc);
        return res.json(onigiriToResponse({ ...doc, _id: result.insertedId }));
    }
    res.json(onigiriToResponse(existing));
});
app.put('/api/onigiri', async (req, res) => {
    if (!onigiriCollection)
        return res.status(500).json({ message: 'DB not initialized' });
    const payload = req.body;
    const existing = payload.id
        ? await onigiriCollection.findOne({ id: payload.id })
        : await onigiriCollection.findOne({});
    const doc = buildPlannerDoc(payload, existing || undefined);
    if (!doc)
        return res.status(400).json({ message: 'Invalid payload for Onigiri planner' });
    await onigiriCollection.updateOne({ id: doc.id }, { $set: doc }, { upsert: true });
    const saved = await onigiriCollection.findOne({ id: doc.id });
    res.json(onigiriToResponse(saved || doc));
});
app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map