# WorkoutnMeal

A web application for tracking daily workouts, meal plans, and weight changes with a calendar view.

## Features

- **Dashboard**: Overview of today's activities and weekly progress
- **Workout Tracker**: Log workouts with type, duration, exercises, and notes
- **Meal Plan**: Track meals with calories, protein, and descriptions
- **Weight Calendar**: Visual calendar showing daily weight entries with statistics
- **JSON Database**: Data persisted to a local JSON file via REST API

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build both frontend and server:
   ```bash
   npm run build:all
   ```

### Running the Application

You need to run **two servers** - the API server and the frontend server:

**Terminal 1 - Start the API Server:**
```bash
npm run server
```
This starts the backend API at `http://localhost:3001`

**Terminal 2 - Start the Frontend:**
```bash
npm start
```
This serves the frontend at `http://localhost:3000`

**Open your browser to `http://localhost:3000`** to use the app.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build frontend TypeScript |
| `npm run build:server` | Build server TypeScript |
| `npm run build:all` | Build both frontend and server |
| `npm run server` | Start API server (port 3001) |
| `npm start` | Start frontend server (port 3000) |
| `npm run watch` | Watch frontend for changes |

## Project Structure

```
WorkoutnMeal/
|-- index.html              # Main HTML file
|-- styles.css              # Application styles
|-- package.json            # Project dependencies
|-- tsconfig.json           # Frontend TypeScript config
|-- tsconfig.server.json    # Server TypeScript config
|-- src/
|   |-- app.ts              # Main application logic
|   |-- types.ts            # TypeScript type definitions
|   |-- storage.ts          # API client with localStorage fallback
|   |-- server.ts           # Express API server
|-- data/
|   |-- db.json             # JSON database file
|-- dist/                   # Compiled frontend JS (generated)
|-- dist-server/            # Compiled server JS (generated)
```

## API Endpoints

The API server provides REST endpoints for data management:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data` | Get all data |
| GET | `/api/workouts` | List all workouts |
| POST | `/api/workouts` | Add a workout |
| DELETE | `/api/workouts/:id` | Delete a workout |
| GET | `/api/meals` | List all meals |
| POST | `/api/meals` | Add a meal |
| DELETE | `/api/meals/:id` | Delete a meal |
| GET | `/api/weight` | List all weight entries |
| POST | `/api/weight` | Add/update weight entry |
| DELETE | `/api/weight/:id` | Delete weight entry |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |

## Data Storage

Data is stored in `data/db.json` as a JSON file. The frontend connects to the API server to read/write data. If the API server is unavailable, the app falls back to browser localStorage.

### Viewing Your Data

You can view your data directly by:
1. Opening `data/db.json` in any text editor
2. Using the API: `curl http://localhost:3001/api/data`
3. Visiting `http://localhost:3001/api/data` in your browser

### Backup Your Data

Simply copy the `data/db.json` file to back up all your workout, meal, and weight data.
