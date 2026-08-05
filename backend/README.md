# ZamukaPay backend

Django REST Framework API for the ZamukaPay invoice financing platform. Pairs
with the frontend in the repo root (`../src`).

## Stack

- Django 5 + Django REST Framework
- PostgreSQL 15 (data), Redis 7 (cache, DRF throttling, Celery broker for later)
- JWT auth via `djangorestframework-simplejwt` — short-lived access tokens,
  rotating refresh tokens delivered as an httpOnly cookie
- Docker Compose for local dev

## Project layout

```
backend/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .env.example
├── manage.py
├── core/                 # response envelope, exception handler, shared permissions
├── zamukapay/
│   ├── settings/{base,local,production}.py
│   ├── urls.py
│   └── wsgi.py
└── apps/
    ├── users/            # custom User model, roles, JWT auth endpoints
    ├── invoices/         # Invoice, InvoiceAdvance, Transaction, Dispute
    ├── scoring/          # RiskScoreService — rule-based risk scoring
    └── notifications/    # MoMo payout simulation, email
```

## Quickstart (Docker)

```sh
cd backend
cp .env.example .env        # edit SECRET_KEY / POSTGRES_PASSWORD before real use
docker compose up --build
```

In another terminal:

```sh
docker compose exec web python manage.py migrate
docker compose exec web python manage.py createsuperuser
```

The API is now at `http://localhost:8000/api/` and the admin at
`http://localhost:8000/admin/`.

## Quickstart (without Docker)

Requires a local PostgreSQL and Redis instance; point `.env` at them.

```sh
cd backend
python -m venv .venv
.venv/Scripts/activate   # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Environment variables

See `.env.example`. Notable ones:

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Django signing key — set a real random value outside dev |
| `DJANGO_SETTINGS_MODULE` | `zamukapay.settings.local` or `zamukapay.settings.production` |
| `POSTGRES_*` | Database connection, matches the `db` compose service |
| `REDIS_URL` | Cache/throttle backend, matches the `redis` compose service |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins allowed to send credentials |
| `ACCESS_TOKEN_LIFETIME_MINUTES` / `REFRESH_TOKEN_LIFETIME_DAYS` | JWT lifetimes |
| `REFRESH_COOKIE_SECURE` | Set `True` once serving over HTTPS |

Nothing secret is committed — `.env` is gitignored, `.env.example` documents
the shape.

## Auth flow

1. `POST /api/auth/register/` or `POST /api/auth/login/` returns
   `{ user, access }` in the body and sets an httpOnly `zamukapay_refresh_token`
   cookie (scoped to `/api/auth/`).
2. Send `Authorization: Bearer <access>` on every subsequent request. Access
   tokens expire in 15 minutes.
3. On a 401, call `POST /api/auth/token/refresh/` (cookie sent automatically
   by the browser) to get a new access token; the refresh token itself
   rotates and is blacklisted after use.
4. `POST /api/auth/logout/` blacklists the current refresh token and clears
   the cookie.

## API surface

All responses share one envelope:

```json
{ "success": true, "data": {}, "message": "string", "errors": null }
```

| Endpoint | Method | Who | Purpose |
|---|---|---|---|
| `/api/auth/register/` | POST | anyone | Create a Supplier or Buyer account |
| `/api/auth/login/` | POST | anyone | Sign in, get access token + refresh cookie |
| `/api/auth/logout/` | POST | authenticated | Blacklist refresh token, clear cookie |
| `/api/auth/token/refresh/` | POST | anyone (cookie) | Rotate the refresh token, issue new access token |
| `/api/auth/me/` | GET | authenticated | Current user profile |
| `/api/users/buyers/` | GET | authenticated | Buyer list for the invoice submission dropdown |
| `/api/invoices/` | GET, POST | supplier (own), buyer (own) | List / submit invoices |
| `/api/invoices/{id}/` | GET | owner | Invoice detail incl. advance + dispute |
| `/api/invoices/{id}/confirm/` | POST | buyer (owner) | "Confirm — I owe this" |
| `/api/invoices/{id}/dispute/` | POST | buyer (owner) | "Dispute" |
| `/api/invoices/pending/` | GET | buyer | Buyer dashboard's pending confirmations |
| `/api/invoices/stats/` | GET | supplier | Supplier dashboard stat cards |
| `/api/transactions/` | GET | authenticated | Recent transactions list |
| `/api/scoring/invoices/{id}/score/` | POST | supplier (owner) | Run AI risk scoring |
| `/api/scoring/invoices/{id}/` | GET | invoice party | Fetch an existing score breakdown |
| `/api/notifications/payout/{id}/` | POST | supplier (owner) | "Confirm & Receive via MoMo" — simulates disbursement |
| `/api/notifications/notifications/` | GET | authenticated | In-app notification list |

## Risk scoring

`apps/scoring/services.py::RiskScoreService.score_invoice(invoice_id)` is a
rule-based, weighted stand-in for a future ML model:

- Buyer payment history — up to 35 pts
- Relationship age (supplier ↔ buyer) — up to 20 pts
- Invoice amount vs the supplier's historical average — up to 20 pts
- Buyer verification status — up to 25 pts

Score ≥ 70 → `APPROVE` (80% advance), 40–69 → `REVIEW` (50% advance), < 40 →
`DECLINE` (0%). Swap the internals of `score_invoice` for a model call later
without touching the API contract.

## Security notes

- CORS is locked to `CORS_ALLOWED_ORIGINS`, credentials required for the
  refresh cookie to be sent
- `login`, `register`, and `token_refresh` are rate-limited via DRF's
  `ScopedRateThrottle` backed by Redis
- PDF uploads are validated for content-type, extension, and a 10 MB cap
  (`apps/invoices/validators.py`)
- All secrets come from environment variables, never hardcoded
- Every endpoint enforces role (`SUPPLIER` / `BUYER` / `ADMIN`) and, where
  relevant, object ownership (`core/permissions.py`)
