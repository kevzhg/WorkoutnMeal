import express, { Request, Response } from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

// Middleware
app.use(cors());
app.use(express.json());

// Types
interface Workout {
  id: string;
  date: string;
  type: string;
  duration: number;
  exercises: string;
  notes: string;
  createdAt: string;
}

interface Meal {
  id: string;
  date: string;
  type: string;
  name: string;
  calories?: number;
  protein?: number;
  description: string;
  createdAt: string;
}

interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  unit: string;
  notes: string;
  createdAt: string;
}

interface Database {
  workouts: Workout[];
  meals: Meal[];
  weightEntries: WeightEntry[];
  settings: {
    defaultWeightUnit: string;
  };
}

// Helper functions
function readDB(): Database {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      workouts: [],
      meals: [],
      weightEntries: [],
      settings: { defaultWeightUnit: 'lbs' }
    };
  }
}

function writeDB(data: Database): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Routes

// Get all data
app.get('/api/data', (_req: Request, res: Response) => {
  const db = readDB();
  res.json(db);
});

// === WORKOUTS ===
app.get('/api/workouts', (_req: Request, res: Response) => {
  const db = readDB();
  res.json(db.workouts);
});

app.post('/api/workouts', (req: Request, res: Response) => {
  const db = readDB();
  const workout: Workout = {
    ...req.body,
    id: generateId(),
    createdAt: new Date().toISOString()
  };
  db.workouts.push(workout);
  db.workouts.sort((a, b) => b.date.localeCompare(a.date));
  writeDB(db);
  res.status(201).json(workout);
});

app.delete('/api/workouts/:id', (req: Request, res: Response) => {
  const db = readDB();
  const index = db.workouts.findIndex(w => w.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Workout not found' });
  }
  db.workouts.splice(index, 1);
  writeDB(db);
  res.status(204).send();
});

// === MEALS ===
app.get('/api/meals', (_req: Request, res: Response) => {
  const db = readDB();
  res.json(db.meals);
});

app.post('/api/meals', (req: Request, res: Response) => {
  const db = readDB();
  const meal: Meal = {
    ...req.body,
    id: generateId(),
    createdAt: new Date().toISOString()
  };
  db.meals.push(meal);
  db.meals.sort((a, b) => b.date.localeCompare(a.date));
  writeDB(db);
  res.status(201).json(meal);
});

app.delete('/api/meals/:id', (req: Request, res: Response) => {
  const db = readDB();
  const index = db.meals.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Meal not found' });
  }
  db.meals.splice(index, 1);
  writeDB(db);
  res.status(204).send();
});

// === WEIGHT ENTRIES ===
app.get('/api/weight', (_req: Request, res: Response) => {
  const db = readDB();
  res.json(db.weightEntries);
});

app.post('/api/weight', (req: Request, res: Response) => {
  const db = readDB();
  const entry: WeightEntry = {
    ...req.body,
    id: generateId(),
    createdAt: new Date().toISOString()
  };

  // Replace existing entry for the same date
  const existingIndex = db.weightEntries.findIndex(e => e.date === entry.date);
  if (existingIndex !== -1) {
    db.weightEntries[existingIndex] = entry;
  } else {
    db.weightEntries.push(entry);
  }

  db.weightEntries.sort((a, b) => a.date.localeCompare(b.date));
  writeDB(db);
  res.status(201).json(entry);
});

app.delete('/api/weight/:id', (req: Request, res: Response) => {
  const db = readDB();
  const index = db.weightEntries.findIndex(e => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Weight entry not found' });
  }
  db.weightEntries.splice(index, 1);
  writeDB(db);
  res.status(204).send();
});

// === SETTINGS ===
app.get('/api/settings', (_req: Request, res: Response) => {
  const db = readDB();
  res.json(db.settings);
});

app.put('/api/settings', (req: Request, res: Response) => {
  const db = readDB();
  db.settings = { ...db.settings, ...req.body };
  writeDB(db);
  res.json(db.settings);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Database file: ${DB_PATH}`);
});
