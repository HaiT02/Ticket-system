import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("Ticket system", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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

  it.each([true, false])("should clear tickets only after confirmation: %s", async (confirmed) => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(confirmed);
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [
      { code: "ABC123", createdAt: "2026-09-14T12:00:00.000Z", used: true },
    ] });
    render(<App />);
    await screen.findByText("ABC123");
    await user.click(screen.getByRole("button", { name: "Rensa alla biljetter" }));
    expect(confirm).toHaveBeenCalledOnce();
    if (confirmed) {
      expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/tickets", { method: "DELETE" });
      expect(await screen.findByText("Inga biljetter finns.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Rensa alla biljetter" })).toBeDisabled();
    } else {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText("ABC123")).toBeInTheDocument();
    }
  });

  it("should keep tickets when clearing fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [
      { code: "ABC123", createdAt: "2026-09-14T12:00:00.000Z", used: false },
    ] }).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<App />);
    await screen.findByText("ABC123");
    await user.click(screen.getByRole("button", { name: "Rensa alla biljetter" }));
    expect(await screen.findByText("Kunde inte ansluta till servern.")).toBeInTheDocument();
    expect(screen.getByText("ABC123")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rensa alla biljetter" })).toBeEnabled();
  });

  it("should display the ticket system heading", async () => {
    render(<App />);
    await screen.findByText("Inga biljetter finns.");

    expect(
      screen.getByRole("heading", { name: "Biljettsystem" })
    ).toBeInTheDocument();
  });

  it("should prevent repeated submissions and allow retry after a network error", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Inga biljetter finns.");
    let rejectRequest;
    fetch.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectRequest = reject; }));
    const button = screen.getByRole("button", { name: "Skapa ny biljett" });
    await user.dblClick(button);
    expect(button).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(2);
    await act(async () => { rejectRequest(new TypeError("Failed to fetch")); });
    expect(await screen.findByText("Kunde inte skapa biljett.")).toBeInTheDocument();
    expect(button).toBeEnabled();
    await user.click(button);
    expect(await screen.findByText("Biljett skapad! Kod: ABC123")).toBeInTheDocument();
  });

  it("should show a readable error when the server returns non-JSON", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Inga biljetter finns.");
    fetch.mockResolvedValueOnce({ ok: false, json: async () => { throw new SyntaxError("Unexpected token <"); } });
    await user.type(screen.getByLabelText("Biljettkod"), "ABC123{Enter}");
    expect(await screen.findByText("Servern skickade ett ogiltigt svar. Försök igen.")).toBeInTheDocument();
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

  it.each(["button", "Enter"])("should use a ticket with %s", async (method) => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByText("Inga biljetter finns.");

    const input = screen.getByPlaceholderText("Skriv biljettkod");

    await user.type(input, "abc123");

    const useButton = screen.getByRole("button", {
      name: "Använd",
    });

    if (method === "Enter") {
      await user.keyboard("{Enter}");
    } else {
      await user.click(useButton);
    }

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

  it("should use the selected ticket directly from its card", async () => {
    const user = userEvent.setup();
    const ticket = { code: "DEF456", createdAt: "2026-09-14T12:00:00.000Z", used: false };
    const usedTicket = { ...ticket, used: true };
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [ticket] })
      .mockResolvedValueOnce({ ok: true, json: async () => usedTicket })
      .mockResolvedValueOnce({ ok: true, json: async () => [usedTicket] });
    render(<App />);
    const card = (await screen.findByText("DEF456")).closest(".ticket");
    await user.type(screen.getByLabelText("Biljettkod"), "OTHER1");
    await user.click(within(card).getByRole("button", { name: "Använd" }));
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/tickets/use", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "DEF456" }),
    });
    expect(await within(card).findByText("Status: Använd")).toBeInTheDocument();
    expect(card).toHaveClass("ticket-used");
    expect(within(card).queryByRole("button", { name: "Använd" })).not.toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Ta bort" })).toBeInTheDocument();
    expect(screen.getByLabelText("Biljettkod")).toHaveValue("OTHER1");
  });

  it.each([true, false])("should require confirmation to delete a used ticket: %s", async (confirmed) => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(confirmed);
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [
      { code: "ABC123", createdAt: "2026-09-14T12:00:00.000Z", used: true },
    ] });
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Ta bort" }));
    expect(confirm).toHaveBeenCalledWith("Ta bort den använda biljetten ABC123 permanent?");
    if (confirmed) {
      expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/tickets/ABC123", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmUsed: true }),
      });
      expect(await screen.findByText("Inga biljetter finns.")).toBeInTheDocument();
    } else {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText("ABC123")).toBeInTheDocument();
    }
  });

  it("should delete an unused ticket and refresh the list", async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [
      { code: "ABC123", createdAt: "2026-09-14T12:00:00.000Z", used: false },
    ] }).mockResolvedValueOnce({ ok: true, json: async () => ({ message: "Biljetten har tagits bort." }) });
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Ta bort" }));
    expect(await screen.findByText("Biljett ABC123 har tagits bort.")).toBeInTheDocument();
    expect(await screen.findByText("Inga biljetter finns.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/tickets/ABC123", { method: "DELETE" });
    expect(screen.queryByText("ABC123")).not.toBeInTheDocument();
  });

  it("should list statuses and offer deletion for used tickets", async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [
      { code: "ABC123", createdAt: "2026-09-14T12:00:00.000Z", used: false },
      { code: "DEF456", createdAt: "2026-09-14T12:00:00.000Z", used: true },
    ] });
    render(<App />);
    const used = (await screen.findByText("DEF456")).closest(".ticket");
    expect(within(used).getByText("Status: Använd")).toBeInTheDocument();
    expect(within(used).getByRole("button", { name: "Ta bort" })).toBeInTheDocument();
    expect(screen.getByText("Status: Oanvänd")).toBeInTheDocument();
  });

  it("should keep a ticket and display the server error when deletion fails", async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [
      { code: "ABC123", createdAt: "2026-09-14T12:00:00.000Z", used: false },
    ] }).mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Bekräfta borttagningen av den använda biljetten." }) });
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Ta bort" }));
    expect(await screen.findByText("Bekräfta borttagningen av den använda biljetten.")).toBeInTheDocument();
    expect(screen.getByText("ABC123")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("should distinguish a loading error from an empty list and allow retry", async () => {
    const user = userEvent.setup();
    fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<App />);
    expect(await screen.findByText("Kunde inte hämta biljetter.")).toBeInTheDocument();
    expect(screen.queryByText("Inga biljetter finns.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Försök igen" }));
    expect(await screen.findByText("Inga biljetter finns.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("should preserve the created ticket confirmation when refreshing fails", async () => {
    const user = userEvent.setup();
    const ticket = { code: "ABC123", createdAt: "2026-09-14T12:00:00.000Z", used: false };
    render(<App />);
    await screen.findByText("Inga biljetter finns.");
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ticket })
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await user.click(screen.getByRole("button", { name: "Skapa ny biljett" }));
    expect(await screen.findByText("Kunde inte hämta biljetter.")).toBeInTheDocument();
    expect(screen.getByText("Biljett skapad! Kod: ABC123")).toBeInTheDocument();
    expect(screen.queryByText("Inga biljetter finns.")).not.toBeInTheDocument();

    fetch.mockResolvedValueOnce({ ok: true, json: async () => [ticket] });
    await user.click(screen.getByRole("button", { name: "Försök igen" }));
    expect(await screen.findByText("ABC123")).toBeInTheDocument();
    expect(screen.getByText("Biljett skapad! Kod: ABC123")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetch.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
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
