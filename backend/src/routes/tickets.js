import { Router } from "express";
import { randomInt } from "node:crypto";
import db from "../database.js";

const router = Router();

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
  for (let attempt = 0; attempt < 10; attempt++) {
    code = generateTicketCode();
    try {
      statement.run(code, createdAt, 0);
      break;
    } catch (error) {
      if (error.code !== "SQLITE_CONSTRAINT_UNIQUE" || attempt === 9) throw error;
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
  if (!code) return res.status(400).json({ error: "Enter a six-character ticket code" });

  const ticket = db
    .prepare("SELECT * FROM tickets WHERE code = ?")
    .get(code);

  if (!ticket) {
    return res.status(404).json({
      error: "Ticket not found"
    });
  }

  if (ticket.used === 1) {
    return res.status(400).json({
      error: "Ticket has already been used"
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

router.delete("/:code", (req, res) => {
  const code = normalizeCode(req.params.code);
  if (!code) return res.status(400).json({ error: "Enter a six-character ticket code" });

  const ticket = db
    .prepare("SELECT * FROM tickets WHERE code = ?")
    .get(code);

  if (!ticket) {
    return res.status(404).json({
      error: "Ticket not found"
    });
  }

  if (ticket.used === 1) {
    return res.status(400).json({
      error: "Used tickets cannot be deleted"
    });
  }

  db.prepare(`
    DELETE FROM tickets
    WHERE code = ?
  `).run(code);

  res.status(200).json({
    message: "Ticket deleted"
  });
});

router.get("/", (req, res) => {
  const tickets = db.prepare(`
    SELECT
      code,
      created_at,
      used
    FROM tickets
    ORDER BY id ASC
  `).all();

  const formattedTickets = tickets.map((ticket) => ({
    code: ticket.code,
    createdAt: ticket.created_at,
    used: ticket.used === 1
  }));

  res.status(200).json(formattedTickets);
});

export default router;
