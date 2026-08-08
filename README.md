# Task API

A CRUD API for managing a to-do list, built with Node.js and Express, backed by a containerized PostgreSQL database, with authentication powered by Supabase.

## What this is

This API lets you create, read, update, and delete tasks, and now includes secure user authentication.
Users sign up and log in through Supabase (which handles password hashing and token signing), and
specific routes are protected — only accessible with a valid access token.

## Project history

1. In-memory array (Assignment 1)
2. SQLite file (Assignment 2)
3. Containerized PostgreSQL (Assignment 3)
4. **Supabase authentication + protected routes (this assignment)**

## How to run it

```bash
git clone https://github.com/HussainAli7858/crud-task-api.git
cd crud-task-api
cp .env.example .env
```

Then fill in your own Supabase project URL and anon key in `.env` (create a free project at supabase.com if you don't have one), then:

```bash
docker compose up --build
```

Server runs at `http://localhost:3000`.

## Environment variables

See `.env.example`:

DATABASE_URL=postgres://postgres:dev@localhost:5432/tasks
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key


Never commit your real `.env` — only `.env.example` with placeholder values.

## Endpoints

| Method | Path                  | Description                  | Auth required |
|--------|-----------------------|-------------------------------|----------------|
| GET    | /                     | API info                     | No |
| GET    | /health               | Health check                  | No |
| GET    | /tasks                | List all tasks                | No |
| GET    | /tasks/:id            | Get a single task             | No |
| POST   | /tasks                | Create a new task             | No |
| PUT    | /tasks/:id            | Update a task                 | No |
| DELETE | /tasks/:id            | Delete a task                 | No |
| POST   | /auth/signup          | Create a new user account     | No |
| POST   | /auth/login           | Authenticate, receive a JWT   | No |
| POST   | /auth/logout          | End the user session          | **Yes (Bearer)** |
| GET    | /public/info          | Public, open info              | No |
| GET    | /protected/profile    | Get logged-in user's profile  | **Yes (Bearer)** |
| GET    | /protected/dashboard  | Protected dashboard example   | **Yes (Bearer)** |

## Example request — signup

```bash
curl -i -X POST http://localhost:3000/auth/signup -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}'
```

Example response:

HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{"id":"...","email":"test@example.com", ...}


## Example request — accessing a protected route

```bash
curl -i http://localhost:3000/protected/profile -H "Authorization: Bearer <your_access_token>"
```

Without a token, or with a tampered token, this returns `401` instead.

## Auth architecture

- Supabase acts as the Identity Provider — it stores accounts, hashes passwords, and issues JWTs. This app never
  handles raw passwords or writes any cryptography itself.
- `/protected/*` routes and `/auth/logout` are guarded by a single reusable Express middleware (`authMiddleware.js`)
  that extracts the bearer token, verifies it with Supabase (`supabase.auth.getUser(token)`), and attaches the
  verified user to the request — or rejects with `401` if the token is missing, malformed, or invalid.
- Adding auth to a new route only requires passing `requireAuth` as middleware — no new verification code needed,
  proven by `/protected/dashboard` reusing the exact same guard as `/protected/profile`.

## Swagger UI

Interactive API docs available at `http://localhost:3000/docs`. Protected routes show a lock icon — click
**Authorize**, paste an access token, and test protected endpoints directly from the browser.

![Swagger UI screenshot](swagger-auth-screenshot.png)

## Database

![Postgres screenshot](postgres-screenshot.png)

## Notes

- Supabase's `anon` key is used here (safe for client/app use) — never the `service_role` key, which bypasses all
  security and must stay server-side only.
- Access tokens are short-lived (Supabase default: 1 hour); the login response also returns a refresh token for
  obtaining a new access token without re-entering credentials.