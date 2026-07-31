const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("./openapi.json");
const db = require("./db.js");
const { pool, initDb } = require("./db.js");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.get("/", (req, res) => {
  res.json({
    name: "Task API",
    version: "1.0",
    endpoints: ["/tasks"]
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// GET all tasks — now reads from Postgres
app.get("/tasks", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM tasks");
  res.json(rows);
});

// GET a single task by id — now reads from Postgres
app.get("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { rows } = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);

  if (rows.length === 0) {
    return res.status(404).json({ error: "Task not found" });
  }

  res.json(rows[0]);
});

// CREATE a new task — now inserts into SQLite
app.post("/tasks", (req, res) => {
  const { title } = req.body;

  if (!title || title.trim() === "") {
    return res.status(400).json({ error: "Title is required and cannot be empty" });
  }

  const insert = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");
  const result = insert.run(title.trim(), 0);

  const newTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.lastInsertRowid);

  res.status(201).json(newTask);
});

// UPDATE a task — now updates a row in SQLite
app.put("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

  if (!existing) {
    return res.status(404).json({ error: "Task not found" });
  }

  const { title, done } = req.body;

  const newTitle = title !== undefined ? title : existing.title;
  const newDone = done !== undefined ? (done ? 1 : 0) : existing.done;

  if (title !== undefined && (typeof title !== "string" || title.trim() === "")) {
    return res.status(400).json({ error: "Title must be a non-empty string" });
  }
  if (done !== undefined && typeof done !== "boolean") {
    return res.status(400).json({ error: "Done must be true or false" });
  }

  db.prepare("UPDATE tasks SET title = ?, done = ? WHERE id = ?").run(newTitle, newDone, id);

  const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  res.json(updatedTask);
});

// DELETE a task — now removes a row from SQLite
app.delete("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

  if (!existing) {
    return res.status(404).json({ error: "Task not found" });
  }

  db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  res.status(204).send();
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
});
