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

// CREATE a new task — now inserts into Postgres
app.post("/tasks", async (req, res) => {
  const { title } = req.body;

  if (!title || title.trim() === "") {
    return res.status(400).json({ error: "Title is required and cannot be empty" });
  }

  const { rows } = await pool.query(
    "INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *",
    [title.trim(), false]
  );

  res.status(201).json(rows[0]);
});

// UPDATE a task — now updates a row in Postgres
app.put("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { rows: existingRows } = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);

  if (existingRows.length === 0) {
    return res.status(404).json({ error: "Task not found" });
  }

  const existing = existingRows[0];
  const { title, done } = req.body;

  if (title !== undefined && (typeof title !== "string" || title.trim() === "")) {
    return res.status(400).json({ error: "Title must be a non-empty string" });
  }
  if (done !== undefined && typeof done !== "boolean") {
    return res.status(400).json({ error: "Done must be true or false" });
  }

  const newTitle = title !== undefined ? title.trim() : existing.title;
  const newDone = done !== undefined ? done : existing.done;

  const { rows } = await pool.query(
    "UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *",
    [newTitle, newDone, id]
  );

  res.json(rows[0]);
});

// DELETE a task — now removes a row from Postgres
app.delete("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { rows } = await pool.query("DELETE FROM tasks WHERE id = $1 RETURNING *", [id]);

  if (rows.length === 0) {
    return res.status(404).json({ error: "Task not found" });
  }

  res.status(204).send();
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
});
