import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("Ticket system", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url, options) => {
        if (
          url === "http://localhost:3000/api/tickets" &&
          options?.method === "POST"
        ) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                code: "ABC123",
                createdAt: "2026-09-14T12:00:00.000Z",
                used: false,
              }),
          });
        }

        if (
          url === "http://localhost:3000/api/tickets/use" &&
          options?.method === "POST"
        ) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                code: "ABC123",
                createdAt: "2026-09-14T12:00:00.000Z",
                used: true,
              }),
          });
        }

        if (
          url === "http://localhost:3000/api/tickets" &&
          !options?.method
        ) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      })
    );
  });

  it("should display the ticket system heading", async () => {
    render(<App />);
    await screen.findByText("Inga biljetter finns.");

    expect(
      screen.getByRole("heading", { name: "Biljettsystem" })
    ).toBeInTheDocument();
  });

  it("should create a new ticket", async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByText("Inga biljetter finns.");

    const createButton = screen.getByRole("button", {
      name: "Skapa ny biljett",
    });

    await user.click(createButton);

    await waitFor(() => {
      expect(
        screen.getByText("Biljett skapad! Kod: ABC123")
      ).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/tickets",
      {
        method: "POST",
      }
    );
  });

  it("should use a ticket", async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByText("Inga biljetter finns.");

    const input = screen.getByPlaceholderText("Skriv biljettkod");

    await user.type(input, "abc123");

    const useButton = screen.getByRole("button", {
      name: "Använd",
    });

    await user.click(useButton);

    await waitFor(() => {
      expect(
        screen.getByText("Biljett ABC123 är nu använd.")
      ).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/tickets/use",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: "ABC123",
        }),
      }
    );
  });

  it("should delete an unused ticket and refresh the list", async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [
      { code: "ABC123", createdAt: "2026-09-14T12:00:00.000Z", used: false },
    ] }).mockResolvedValueOnce({ ok: true, json: async () => ({ message: "Ticket deleted" }) });
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Ta bort" }));
    expect(await screen.findByText("Biljett ABC123 har tagits bort.")).toBeInTheDocument();
    expect(await screen.findByText("Inga biljetter finns.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/tickets/ABC123", { method: "DELETE" });
    expect(screen.queryByText("ABC123")).not.toBeInTheDocument();
  });

  it("should list statuses and hide deletion for used tickets", async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [
      { code: "ABC123", createdAt: "2026-09-14T12:00:00.000Z", used: false },
      { code: "DEF456", createdAt: "2026-09-14T12:00:00.000Z", used: true },
    ] });
    render(<App />);
    const used = (await screen.findByText("DEF456")).closest(".ticket");
    expect(within(used).getByText("Status: Använd")).toBeInTheDocument();
    expect(within(used).queryByRole("button", { name: "Ta bort" })).not.toBeInTheDocument();
    expect(screen.getByText("Status: Oanvänd")).toBeInTheDocument();
  });

  it("should keep a ticket and display the server error when deletion fails", async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [
      { code: "ABC123", createdAt: "2026-09-14T12:00:00.000Z", used: false },
    ] }).mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Used tickets cannot be deleted" }) });
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Ta bort" }));
    expect(await screen.findByText("Used tickets cannot be deleted")).toBeInTheDocument();
    expect(screen.getByText("ABC123")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("should show a loading error when the server is unavailable", async () => {
    fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<App />);
    expect(await screen.findByText("Kunde inte hämta biljetter.")).toBeInTheDocument();
  });

  it("should reject an empty ticket code without sending a request", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Inga biljetter finns.");
    await user.click(screen.getByRole("button", { name: "Använd" }));
    expect(await screen.findByText("Skriv in en biljettkod.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
