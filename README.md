# Soil Sage

Monorepo: **Vite + React** (`/`) and **Express + MongoDB** API (`/server`).

## Run locally

From the repo root:

```bash
npm install
npm install --prefix server
npm run dev
```

- Web: [http://localhost:5173](http://localhost:5173) (proxies `/api` to the API)
- API: [http://localhost:5000](http://localhost:5000) (or `PORT` from `server/.env`)

## Server environment (`server/.env`)

Copy [`server/.env.example`](server/.env.example) and set at least:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Strong secret for signing JWTs |
| `GEMINI_API_KEY` | Required for **soil/crop diagnosis** (Google Gemini vision + JSON) — create at [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Optional; defaults to **`gemini-2.5-flash`**. If you see **404 model not found**, the id is wrong or retired for your key — open `https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_GEMINI_KEY` in a browser (paste your key) to see valid `name` values, or try `gemini-2.5-flash-lite` / `gemini-flash-latest`. |

Optional: `PORT`, `CORS_ORIGINS`, admin seed vars — see `server/.env.example`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Web + API together |
| `npm run dev:web` | Vite only |
| `npm run dev:api` | API only (`server`) |
| `npm run seed:admin --prefix server` | Create first admin user (see `server/.env.example`) |

---
