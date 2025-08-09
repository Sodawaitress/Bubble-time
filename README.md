# Pride Calendar (5-minute slots, custom window, repeat, timetable PNG)

Minimal Outlook-like calendar you can deploy on Railway.  
**Differences from Outlook**: 5-minute granularity, custom time window (e.g., 07:40–22:00), daily/weekly repeat, weekly timetable PNG export, and event type colors sourced from pride flags.

## Stack
- React + Vite + FullCalendar (timeGrid/dayGrid/interaction/rrule)
- Node.js + Express
- Prisma + PostgreSQL
- Deploy: Railway

## Local Dev
```
cp .env.example .env
# edit DATABASE_URL to a local Postgres or use docker
npm i
npm run dev  # front-end at http://localhost:5173
# backend:
# in another terminal: npx prisma db push && ts-node server/server.ts (or build then start)
```

## Build & Run (production)
```
npm run build
npm start
```

## Railway
1. Push this repo to GitHub.
2. Create a Railway project, add a PostgreSQL plugin.
3. Set `DATABASE_URL` and (optionally) `PORT` env vars.
4. Deploy from GitHub. Build command: `npm ci && npm run build` Start command: `npm start`.
5. First start will run `prisma db push` via `postinstall` and create tables.

## API
- `GET /api/events?from&to`
- `POST /api/events`
- `PATCH /api/events/:id`
- `DELETE /api/events/:id`
- `GET /api/prefs`
- `PATCH /api/prefs`

## Notes
- Single-user mode, no auth.
- Timezone follows the browser; server stores ISO strings.
- Timetable export uses `dom-to-image-more` to download PNG.
- Repeat rules stored as RRULE string (e.g., `FREQ=DAILY` or `FREQ=WEEKLY;BYDAY=MO`).
```
