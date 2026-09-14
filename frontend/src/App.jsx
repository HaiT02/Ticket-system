import { useEffect, useState } from "react";
import "./App.css";

import * as ticketsApi from "./api/ticketsApi";

function App() {
  const [tickets, setTickets] = useState([]);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  async function loadTickets() {
    try {
      const data = await ticketsApi.listTickets();
      setTickets(data);
    } catch {
      setMessage("Kunde inte hämta biljetter.");
    }
  }

  async function createTicket() {
    try {
      const data = await ticketsApi.createTicket();

      setMessage(`Biljett skapad! Kod: ${data.code}`);
      loadTickets();
    } catch {
      setMessage("Kunde inte skapa biljett.");
    }
  }

  async function useTicket() {
    if (!code.trim()) {
      setMessage("Skriv in en biljettkod.");
      return;
    }

    try {
      const data = await ticketsApi.useTicket(code.trim().toUpperCase());

      setMessage(`Biljett ${data.code} är nu använd.`);
      setCode("");
      loadTickets();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteTicket(ticketCode) {
    try {
      await ticketsApi.deleteTicket(ticketCode);

      setMessage(`Biljett ${ticketCode} har tagits bort.`);
      loadTickets();
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  return (
    <div className="app">
      <h1>Biljettsystem</h1>

      <section className="card">
        <h2>Skapa biljett</h2>

        <button onClick={createTicket}>
          Skapa ny biljett
        </button>
      </section>

      <section className="card">
        <h2>Använd biljett</h2>

        <div className="input-row">
          <input
            type="text"
            placeholder="Skriv biljettkod"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />

          <button onClick={useTicket}>
            Använd
          </button>
        </div>
      </section>

      {message && (
        <div className="message" role="status">
          {message}
        </div>
      )}

      <section className="card">
        <h2>Alla biljetter</h2>

        {tickets.length === 0 ? (
          <p>Inga biljetter finns.</p>
        ) : (
          <div className="tickets">
            {tickets.map((ticket) => (
              <div className="ticket" key={ticket.code}>
                <div>
                  <strong>{ticket.code}</strong>

                  <p>
                    Skapad:{" "}
                    {new Date(ticket.createdAt).toLocaleString("sv-SE")}
                  </p>

                  <p>
                    Status:{" "}
                    {ticket.used ? "Använd" : "Oanvänd"}
                  </p>
                </div>

                {!ticket.used && (
                  <button
                    className="delete-button"
                    onClick={() => deleteTicket(ticket.code)}
                  >
                    Ta bort
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;