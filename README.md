# ZamukaPay

Invoice financing platform for Rwandan MSMEs. Suppliers submit unpaid
invoices and get an instant Mobile Money advance once a buyer confirms and
the invoice clears AI risk scoring.

This is the frontend. The API lives in [`backend/`](backend/README.md)
(Django REST Framework + PostgreSQL + Redis).

## Stack

- TanStack Start (React, file-based routing via TanStack Router)
- TanStack Query for server state
- Tailwind CSS + shadcn/ui components
- Vite

## Development

Requires Node.js and the backend running (see `backend/README.md` for the
Docker Compose quickstart).

```sh
npm install
cp .env.example .env.local   # set VITE_API_URL if the backend isn't on :8000
npm run dev
```

The app runs at `http://localhost:8080`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
