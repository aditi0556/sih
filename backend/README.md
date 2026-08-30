# SIH Backend

FastAPI auth service (email/password + admin roles) using PostgreSQL, SQLAlchemy,
Authlib (JOSE/JWT), and passlib (bcrypt).

## Setup

```bash
uv sync                     # installs deps from uv.lock into .venv
cp .env.example .env        # then edit values, especially DATABASE_URL and JWT_SECRET
```

Make sure the Postgres database in `DATABASE_URL` exists first, e.g.:

```bash
createuser sih_user --pwprompt
createdb sih -O sih_user
```

## Run

```bash
uv run uvicorn main:app --reload --port 3001
```

Tables are created automatically on startup (swap for Alembic migrations once the
schema stabilizes).

## Bootstrap the first admin

Public signup always creates a `"user"` role. Since `/admin/promote` requires an
existing admin to call it, create the first one directly:

```bash
uv run -m scripts.create_admin "Your Name" you@example.com "StrongPassword123"
```

After that, log in as that account and promote/demote others:

```
POST /admin/promote   { "email": "someone@example.com" }
POST /admin/demote    { "email": "someone@example.com" }
GET  /admin/users
```

## Structure

```
main.py            # app entry point, mounts routers + CORS
core/
  config.py         # env-driven settings
  security.py       # password hashing + JWT create/verify
db/
  database.py       # SQLAlchemy engine/session
models/
  user.py           # User table
schemas/
  user.py           # Pydantic request/response shapes
routers/
  auth.py           # /auth/signup, /auth/login, /auth/logout, /auth/session
  admin.py          # /admin/users, /admin/promote, /admin/demote
dependencies.py     # get_current_user, require_admin
scripts/
  create_admin.py   # one-off CLI to bootstrap the first admin
```
