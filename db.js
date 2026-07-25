const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("tasks.db");

// Create the table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0
  )
`);

// Seed 3 example tasks, but only if the table is empty
const countRow = db.prepare("SELECT COUNT(*) AS count FROM tasks").get();

if (countRow.count === 0) {
  const insert = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");
  insert.run("Buy milk", 0);
  insert.run("Walk the dog", 1);
  insert.run("Finish CRUD API assignment", 0);
}

module.exports = db;
