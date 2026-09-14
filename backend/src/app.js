import express from "express";
import cors from "cors";
import db from "./database.js";

const app = express();

app.use(cors());
app.use(express.json());

function generateTicketCode() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
}

app.post("/api/tickets", (req, res) => {
  const code = generateTicketCode();
  const createdAt = new Date().toISOString();

  const statement = db.prepare(`
    INSERT INTO tickets (code, created_at, used)
    VALUES (?, ?, ?)
  `);

  statement.run(code, createdAt, 0);

  res.status(201).json({
    code: code,
    createdAt: createdAt,
    used: false
  });
});

app.post("/api/tickets/use", (req, res) => {
  const { code } = req.body;

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

app.delete("/api/tickets/:code", (req, res) => {
  const { code } = req.params;

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

app.get("/api/tickets", (req, res) => {
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

export default app;