import { Router } from "express";
import { randomInt } from "node:crypto";
import db from "../database.js";

const router = Router();
const MAX_ATTEMPTS = 10;

function normalizeCode(value) {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}

function generateTicketCode() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    const randomIndex = randomInt(characters.length);
    code += characters[randomIndex];
  }

  return code;
}

router.post("/", (req, res) => {
  let code;
  const createdAt = new Date().toISOString();

  const statement = db.prepare(`
    INSERT INTO tickets (code, created_at, used)
    VALUES (?, ?, ?)
  `);

  // Retry only code collisions; other database failures must reach the error handler.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    code = generateTicketCode();
    try {
      statement.run(code, createdAt, 0);
      break;
    } catch (error) {
      if (error.code !== "SQLITE_CONSTRAINT_UNIQUE" || attempt === MAX_ATTEMPTS - 1) throw error;
    }
  }

  res.status(201).json({
    code: code,
    createdAt: createdAt,
    used: false
  });
});

router.post("/use", (req, res) => {
  const code = normalizeCode(req.body?.code);
  if (!code) return res.status(400).json({ error: "Ange en biljettkod med sex bokstäver eller siffror." });

  const ticket = db
    .prepare("SELECT * FROM tickets WHERE code = ?")
    .get(code);

  if (!ticket) {
    return res.status(404).json({
      error: "Biljetten finns inte."
    });
  }

  if (ticket.used === 1) {
    return res.status(400).json({
      error: "Biljetten har redan använts."
    });
  }

  db.prepare(`
    UPDATE tickets
    SET used = 1
    WHERE code = ?
  `).run(code);

  res.status(200).json({
    code: ticket.code,
    createdAt: ticket.created_at,
    used: true
  });
});

// Explicit reset action for the entire list.
router.delete("/", (req, res) => {
  const result = db.prepare("DELETE FROM tickets").run();
  res.status(200).json({ deletedCount: result.changes });
});

router.delete("/:code", (req, res) => {
  const code = normalizeCode(req.params.code);
  if (!code) return res.status(400).json({ error: "Ange en biljettkod med sex bokstäver eller siffror." });

  const ticket = db
    .prepare("SELECT * FROM tickets WHERE code = ?")
    .get(code);

  if (!ticket) {
    return res.status(404).json({
      error: "Biljetten finns inte."
    });
  }

  if (ticket.used === 1 && req.body?.confirmUsed !== true) {
    return res.status(400).json({
      error: "Bekräfta borttagningen av den använda biljetten."
    });
  }

  db.prepare(`
    DELETE FROM tickets
    WHERE code = ?
  `).run(code);

  res.status(200).json({
    message: "Biljetten har tagits bort."
  });
});

router.get("/", (req, res) => {
  const tickets = db.prepare(`
    SELECT
      code,
      created_at,
      used
    FROM tickets
    ORDER BY used ASC, id ASC
  `).all();

  const formattedTickets = tickets.map((ticket) => ({
    code: ticket.code,
    createdAt: ticket.created_at,
    used: ticket.used === 1
  }));

  res.status(200).json(formattedTickets);
});

export default router;
