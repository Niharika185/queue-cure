# Queue Cure '26

A real-time clinic queue management system built for the Queue Cure '26 hackathon (Wooble).

## Problem

Clinics run on paper tokens with zero visibility. This app gives receptionists a dashboard to manage the queue and gives patients a live waiting-room screen — both update instantly via Socket.io, with no page refresh.

## Tech Stack

- **Frontend:** React (Vite), React Router, Socket.io-client, Axios
- **Backend:** Node.js, Express, Socket.io, Mongoose
- **Database:** MongoDB Atlas

## How It Works

1. Receptionist adds a patient via `POST /api/queue/add` — gets the next sequential token number.
2. Receptionist clicks **Call Next** — marks the current patient as done, promotes the next waiting patient to "serving", and broadcasts the new state via the `queue:updated` socket event.
3. Both the Receptionist and Waiting Room screens listen for `queue:updated` and re-render instantly — no refresh needed.
4. **Estimated wait time** = (number of people ahead) × (average consultation time), where avg consultation time is set by the receptionist and stored in the database (not hardcoded).

## Concurrency & Edge Cases

- **Simultaneous "Call Next" clicks:** `findOneAndUpdate` is atomic at the document level, so only one request can promote a given patient to "serving".
- **Token number collisions:** the token counter is incremented atomically via `$inc` on the Settings document.
- **Avg time changes mid-queue:** wait estimates are recomputed for everyone on every state broadcast, not cached per-patient.
- **Empty queue:** "Call Next" button is disabled when there are no waiting patients.
- **Server restart:** queue state is persisted in MongoDB, so it survives restarts.

## Running Locally

### Backend
```bash
cd backend
npm install
# create a .env file with PORT, MONGO_URI, CLIENT_URL
npm run dev
```

### Frontend
```bash
cd frontend
npm install
# create a .env file with VITE_API_URL
npm run dev
```

Open two browser tabs: one at `/reception`, one at `/waiting`. Add a patient and click "Call Next" — both screens update live.

## Deployment

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** MongoDB Atlas