import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import db from "../src/database.js";

describe("Tickets API", () => {
  beforeEach(() => {
    db.prepare("DELETE FROM tickets").run();
  });

  it("should create a new ticket", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .send();

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("code");
    expect(response.body.code).toHaveLength(6);
  });

  it("should create tickets with different codes", async () => {
    const firstResponse = await request(app)
      .post("/api/tickets")
      .send();

    const secondResponse = await request(app)
      .post("/api/tickets")
      .send();

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);

    expect(firstResponse.body.code).not.toBe(secondResponse.body.code);
  });

  it("should use a ticket once", async () => {
    const createResponse = await request(app)
      .post("/api/tickets")
      .send();

    const code = createResponse.body.code;

    const useResponse = await request(app)
      .post("/api/tickets/use")
      .send({ code });

    expect(useResponse.status).toBe(200);
    expect(useResponse.body.used).toBe(true);
  });

  it("should not allow a ticket to be used twice", async () => {
    const createResponse = await request(app)
      .post("/api/tickets")
      .send();

    const code = createResponse.body.code;

    const firstUseResponse = await request(app)
      .post("/api/tickets/use")
      .send({ code });

    expect(firstUseResponse.status).toBe(200);

    const secondUseResponse = await request(app)
      .post("/api/tickets/use")
      .send({ code });

    expect(secondUseResponse.status).toBe(400);
  });

  it("should delete an unused ticket", async () => {
    const createResponse = await request(app)
      .post("/api/tickets")
      .send();

    const code = createResponse.body.code;

    const deleteResponse = await request(app)
      .delete(`/api/tickets/${code}`);

    expect(deleteResponse.status).toBe(200);
  });

  it("should not allow a used ticket to be deleted", async () => {
    const createResponse = await request(app)
      .post("/api/tickets")
      .send();

    const code = createResponse.body.code;

    const useResponse = await request(app)
      .post("/api/tickets/use")
      .send({ code });

    expect(useResponse.status).toBe(200);

    const deleteResponse = await request(app)
      .delete(`/api/tickets/${code}`);

    expect(deleteResponse.status).toBe(400);
  });

  it("should list all tickets with their used status", async () => {
    const firstTicket = await request(app)
      .post("/api/tickets")
      .send();

    const secondTicket = await request(app)
      .post("/api/tickets")
      .send();

    await request(app)
      .post("/api/tickets/use")
      .send({ code: firstTicket.body.code });

    const response = await request(app)
      .get("/api/tickets");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);

    const usedTicket = response.body.find(
      (ticket) => ticket.code === firstTicket.body.code
    );

    const unusedTicket = response.body.find(
      (ticket) => ticket.code === secondTicket.body.code
    );

    expect(usedTicket.used).toBe(true);
    expect(unusedTicket.used).toBe(false);
  });
});