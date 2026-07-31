# Task API

A CRUD API for managing a to-do list, built with Node.js and Express, backed by a containerized PostgreSQL database.

## What this is

This API lets you create, read, update, and delete tasks. Data is stored in PostgreSQL, running in a
Docker container alongside the app itself — the whole stack starts with a single command, and data
survives even a full container restart.

## Storage history

This project has used three storage engines as it evolved:
1. In-memory array (Assignment 1) — lost on every restart.
2. SQLite file (Assignment 2) — survived app restarts, single file on disk.
3. **PostgreSQL in Docker (this assignment)** — a real database server, running in its own container,
   with persistent storage via a Docker volume.

The API itself never changed across any of these three swaps — only the storage layer underneath it did.

## How to run it

```bash
git clone https://github.com/HussainAli7858/crud-task-api.git
cd crud-task-api
cp .env.example .env
docker compose up
```

That's it — one command starts both the app and its database. The database table is created automatically,
and 3 example tasks are seeded on first run only.

Server runs at `http://localhost:3000`.

## Environment variables

See `.env.example` for the required variable:

DATABASE_URL=postgres://postgres:dev@localhost:5432/tasks


(Note: inside Docker Compose, the app actually connects to the database using the service name `db`
instead of `localhost` — this is set automatically in `compose.yaml` and doesn't require any manual change.)

## Endpoints

| Method | Path         | Description             |
|--------|--------------|--------------------------|
| GET    | /            | API info                |
| GET    | /health      | Health check             |
| GET    | /tasks       | List all tasks           |
| GET    | /tasks/:id   | Get a single task        |
| POST   | /tasks       | Create a new task        |
| PUT    | /tasks/:id   | Update a task            |
| DELETE | /tasks/:id   | Delete a task            |

## Example request

```bash
curl -i -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{"title":"Buy milk"}'
```

Example response:

HTTP/1.1 201 Created
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 40
ETag: W/"28-gPXr/tBcmKMXZwSEhav9o8e9gYc"
Date: Fri, 31 Jul 2026 12:27:09 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":5,"title":"Buy milk","done":false}


## Database

Tasks are stored in PostgreSQL, running in its own Docker container (`db` service in `compose.yaml`),
with a named volume (`taskdata`) so data survives a full `docker compose down` and `docker compose up`
cycle.

id |           title            | done
----+----------------------------+------
  1 | Buy milk                   | f
  2 | Walk the dog                | t
  3 | Finish CRUD API assignment | f
  5 | Buy milk                   | f
(4 rows)


![Postgres screenshot](postgres-screenshot.png)

### Persistence proof

Tested by creating a task, running `docker compose down` (stopping and removing both containers), then
`docker compose up` again. The created task was still present in `GET /tasks` afterward — confirming the
volume preserved the data even though the containers themselves were fully recreated.

### Architecture note

The service and route logic (`index.js`) did not change in shape when moving from SQLite to Postgres —
only the database queries inside the routes changed (placeholder syntax `?` → `$1`, and the driver
itself). This is the same principle proven across all three storage swaps in this project: the API is the
promise, the database is just where that promise is kept.

## Swagger UI

Interactive API docs available at `http://localhost:3000/docs` once the server is running.

![Swagger UI screenshot](swagger-screenshot.png)

## Notes

Running `docker compose down -v` (with the `-v` flag) removes the volume too, which would permanently
delete all data — useful to know, and dangerous to do by accident.