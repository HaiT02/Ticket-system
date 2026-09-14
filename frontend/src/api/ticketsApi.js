const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, "");

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error("Kunde inte ansluta till servern.");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Servern skickade ett ogiltigt svar. Försök igen.");
  }
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Kunde inte utföra åtgärden.");
  }
  return data;
}

export function listTickets() {
  return request("/tickets");
}

export function createTicket() {
  return request("/tickets", { method: "POST" });
}

export function useTicket(code) {
  return request("/tickets/use", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

export function deleteTicket(code, confirmUsed = false) {
  const options = { method: "DELETE" };
  if (confirmUsed) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify({ confirmUsed: true });
  }
  return request(`/tickets/${encodeURIComponent(code)}`, options);
}

export function clearTickets() {
  return request("/tickets", { method: "DELETE" });
}
