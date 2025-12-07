# Homebase

A web application for tracking daily workouts, meal plans, and weight changes with a calendar view.

## 🚀 Live Demo

- **Frontend**: [https://kevzhg.github.io/Homebase/](https://kevzhg.github.io/Homebase/)
- **Backend API**: Deployed on Render (auto-deployed from `master` branch)

## Features

- **Dashboard**: Overview of today's activities and weekly progress
- **Live Training Builder**: Create and run workouts with exercise library, rest timers, and progress tracking
- **Training Tracker**: Log training sessions with type, duration, exercises, and notes
- **Meal Plan**: Track meals with calories, protein, and descriptions
- **Weight Calendar**: Visual calendar showing daily weight entries with statistics
- **Onigiri Planner**: Task management with weighted sections and completion tracking
- **MongoDB backend**: Express API backed by MongoDB (local or Atlas via Render)

## 🌐 Deployment & CI/CD

This project uses **free** continuous deployment:
- ✅ **Frontend**: GitHub Pages (auto-deploy via GitHub Actions)
- ✅ **Backend**: Render.com (auto-deploy on push to `master`)
- ✅ **Database**: MongoDB Atlas (free M0 tier)

**📖 See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete setup instructions.**

Quick links:
- [MongoDB Atlas Setup](./DEPLOYMENT.md#part-1-mongodb-atlas-setup-free-database)
- [Render Backend Setup](./DEPLOYMENT.md#part-2-backend-deployment-on-render-free)
- [GitHub Pages Setup](./DEPLOYMENT.md#part-3-frontend-deployment-on-github-pages-free)

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
This starts the backend API at `http://localhost:8000` (or `PORT` if set).

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
| `npm run server` | Start API server (port 8000 or `PORT`) |
| `npm start` | Start frontend server (port 3000) |
| `npm run watch` | Watch frontend for changes |

### Local setup: MongoDB quick start

- Start a user-level `mongod` in this repo (no sudo needed):  
  `mkdir -p data/mongodb && mongod --dbpath data/mongodb --bind_ip 127.0.0.1 --port 27017 --fork --logpath data/mongodb/mongod.log`
- Verify it is up:  
  `mongosh --eval "db.runCommand({ ping: 1 })"`
- Stop when done:  
  `mongod --dbpath data/mongodb --shutdown`
- If your environment blocks binding without elevation, start the system service instead: `sudo systemctl start mongod` (or `sudo service mongod start`). Log file for the user-level instance lives at `data/mongodb/mongod.log`.

## Environment / API config (notes)

- **Prod (GitHub Pages → Render)**: `index.html` sets `window.API_BASE_URL` to `https://homebase-50dv.onrender.com/api` when hosted on `github.io`, so Pages talks to Render. Render uses Atlas via `MONGODB_URI` + `MONGODB_DB=homebase`.
- **Local dev default**: `API_BASE_URL` falls back to `http://localhost:8000/api`; the server uses `MONGODB_URI` default `mongodb://localhost:27017` and `MONGODB_DB=homebase`. Run `mongod`, then `npm run server` and `npm start`.
- **Local hitting cloud**: to use the Render API from local frontend, set `window.API_BASE_URL` to the Render URL before loading the app (or temporarily edit `index.html`), then `npm start`. To run the server against Atlas locally, export `MONGODB_URI=<Atlas SRV>` and start `npm run server`.
- **Switching APIs**: change the `window.API_BASE_URL` value (or let the `github.io` check do it), then rebuild for deploy with `npm run build`. Pages URL is case-sensitive: `https://kevzhg.github.io/Homebase/`.
- **CORS**: if you restrict CORS in `src/server.ts`, allow `http://localhost:3000` and your Pages origin (`https://kevzhg.github.io`).
- **Terminology**: “Training” = a saved session (stored via `/api/trainings`, default Mongo collection `trainings`). Templates remain the local programs/workouts you pick for live sessions.
- **Collection envs**: training collection uses `MONGODB_COLLECTION_TRAININGS` (default `trainings`); meals `MONGODB_COLLECTION_MEALS`; weight `MONGODB_COLLECTION_WEIGHT`.

## Project Structure

```
Homebase/
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
| GET | `/api/trainings` | List training sessions |
| GET | `/api/trainings/:id` | Get a training session |
| POST | `/api/trainings` | Add a training session |
| PUT | `/api/trainings/:id` | Update a training session |
| DELETE | `/api/trainings/:id` | Delete a training session |
| GET | `/api/meals` | List meals |
| POST | `/api/meals` | Add a meal |
| PUT | `/api/meals/:id` | Update a meal |
| DELETE | `/api/meals/:id` | Delete a meal |
| GET | `/api/weight` | List weight entries |
| POST | `/api/weight` | Add a weight entry |
| PUT | `/api/weight/:id` | Update a weight entry |
| DELETE | `/api/weight/:id` | Delete a weight entry |

## Data Storage

- Backend: MongoDB. Local dev defaults to `mongodb://localhost:27017` (DB `homebase`). Render uses Atlas via `MONGODB_URI`.
- Frontend fallback: localStorage is used only for transient live training state and program definitions if the API is unavailable.
# Test
