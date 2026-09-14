const API_URL = "http://localhost:3000/api";

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error("Kunde inte ansluta till servern.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Kunde inte utföra åtgärden.");
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

export function deleteTicket(code) {
  return request(`/tickets/${encodeURIComponent(code)}`, { method: "DELETE" });
}
