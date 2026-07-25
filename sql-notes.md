# Stage 4 — SQL Explored

Queries run manually in DB Browser for SQLite, against tasks.db:

1. `SELECT * FROM tasks;` — listed all tasks.
2. `SELECT * FROM tasks WHERE done = 1;` — listed only completed tasks.
3. `SELECT COUNT(*) FROM tasks;` — returned 3, confirming the seed data loaded correctly.
4. `UPDATE tasks SET done = 1;` — marked every task as completed.
5. `DELETE FROM tasks WHERE done = 1;` — deleted all completed tasks.

Confirmed via Postman that GET /tasks reflected each change immediately, with no server restart —
the API and DB Browser both read the same tasks.db file directly, with no syncing step involved.

Also learned: queries in the same DB Browser session apply to each other even before clicking
"Write Changes" — running UPDATE then DELETE in the same session deleted everything, since the
DELETE saw the UPDATE's effect even though neither was written to disk yet.