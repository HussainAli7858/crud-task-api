# Task API

A simple in-memory CRUD API for managing a to-do list, built with Node.js and Express.

## What this is

This API lets you create, read, update, and delete tasks. Data is stored in memory only —
it resets every time the server restarts (no database yet).

## How to run it

```bash
git clone https://github.com/HussainAli7858/crud-task-api.git
cd crud-task-api
npm install
node index.js
```

Server runs at `http://localhost:3000`.

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