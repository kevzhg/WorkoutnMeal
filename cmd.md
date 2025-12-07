# Command Reference

## Git basics
- Check branch: `git status`
- Switch/create branch: `git checkout master` ; `git checkout -b workout`
- Update remote URL (HTTPS): `git remote set-url origin https://github.com/kevzhg/Homebase.git`
- Update remote URL (SSH): `git remote set-url origin git@github.com:kevzhg/Homebase.git`
- Push to master: `git push origin master`
- Push current branch (set upstream): `git push -u origin <branch>`

## SSH setup (if using SSH for GitHub)
- Start agent: `eval "$(ssh-agent -s)"`
- Add key: `ssh-add ~/.ssh/id_ed25519`
- Test GitHub SSH: `ssh -T git@github.com`

## Install & build
- Install deps: `npm install`
- Build frontend: `npm run build`
- Build server: `npm run build:server`
- Build all: `npm run build:all`

## Run locally
- Start API: `npm run server` (uses `PORT` or 8000; Mongo default `mongodb://localhost:27017`)
- Start frontend: `npm start` (serves at http://localhost:3000)
- Dev loop: one terminal for API, one for frontend

## MongoDB
- Start local (system service): `sudo systemctl start mongod` (Linux) / `brew services start mongodb-community@7.0` (macOS)
- Start local (Docker): `docker run -d --name mongo -p 27017:27017 -v mongo-data:/data/db mongo:7`
- Test connection: `mongosh --eval "db.runCommand({ ping: 1 })"`

## Render deployment (API)
- Build cmd: `npm install && npm run build:server`
- Start cmd: `node dist-server/server.js`
- Required envs: `MONGODB_URI=<Atlas SRV>`, `MONGODB_DB=homebase`, `MONGODB_COLLECTION_TRAININGS=trainings` (optional override), `PORT` (provided by Render)

## Atlas notes
- Whitelist IPs: Atlas → Security → Network Access → Add IP (use `0.0.0.0/0` for testing or Render egress IPs)
- Copy SRV URI: Atlas → Database → Connect → Drivers (URL-encode password)
- Example SRV: `mongodb+srv://kevzhg:<password>@<cluster>.mongodb.net/homebase?retryWrites=true&w=majority`

## Frontend API target
- Prod (Pages): `window.API_BASE_URL = 'https://homebase-50dv.onrender.com/api'`
- Local default: falls back to `http://localhost:8000/api`
- To hit Render from local frontend: set `window.API_BASE_URL` to the Render URL before loading

## Misc
- Check remote URLs: `git remote -v`
- Case-sensitive Pages URL: `https://kevzhg.github.io/Homebase/`
