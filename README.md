# SoundBound

SoundBound is a multi-source music search and streaming app with a plugin-based backend and a React frontend.

## Structure

- `backend/` Express API, auth middleware, plugin loader, plugins, and byte-range proxy
- `frontend/` Vite React app with login, search, source filters, results, and custom player

## Backend setup

1. Copy `backend/.env.example` to `backend/.env`
2. Set `API_KEY` to your chosen key
3. Install dependencies:

```bash
cd backend
npm install
```

4. Start the server:

```bash
npm run dev
```

The backend runs on `http://localhost:4000`.

## Frontend setup

1. Copy `frontend/.env.example` to `frontend/.env`
2. Install dependencies:

```bash
cd frontend
npm install
```

3. Start the frontend:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173`.

## Flow

1. Open the frontend
2. Enter the API key from `backend/.env`
3. Search across enabled plugins
4. Select a track
5. The frontend requests `/stream`
6. The backend resolves the source URL and rewrites it to `/proxy`
7. The browser streams audio through the backend proxy with range support
