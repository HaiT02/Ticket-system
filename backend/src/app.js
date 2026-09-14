import express from "express";
import cors from "cors";
import ticketsRouter from "./routes/tickets.js";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "10kb" }));
app.use("/api/tickets", ticketsRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Express recognizes error middleware by its four parameters.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  if (error.status === 413) {
    return res.status(413).json({ error: "Request body too large" });
  }
  console.error(error);
  res.status(500).json({ error: "An unexpected server error occurred" });
});

export default app;
