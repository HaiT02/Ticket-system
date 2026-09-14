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

  async function handleUseTicket(event) {
    event.preventDefault();
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
    <main className="app">
      <header className="cinema-header">
        <p className="eyebrow">Välkommen till biografen</p>
        <h1>Biljettsystem</h1>
        <p>En biljett. En stor filmupplevelse.</p>
        <span className="cinema-label">BILJETTKASSA & ENTRÉ</span>
      </header>

      <div className="actions">
      <section className="card">
        <p className="eyebrow">01 / Biljettkassan</p>
        <h2>Skapa biljett</h2>
        <p className="description">Nästa filmupplevelse börjar här. Skapa en ny entrébiljett.</p>

        <button onClick={createTicket}>
          Skapa ny biljett
        </button>
      </section>

      <section className="card">
        <p className="eyebrow">02 / Insläpp</p>
        <h2>Använd biljett</h2>

        <form onSubmit={handleUseTicket}>
        <label htmlFor="ticket-code">Biljettkod</label>
        <div className="input-row">
          <input
            id="ticket-code"
            type="text"
            placeholder="Skriv biljettkod"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />

          <button type="submit">
            Använd
          </button>
        </div>
        <p className="hint">Tryck Enter eller välj Använd för att lösa in biljetten.</p>
        </form>
      </section>
      </div>

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
              <div className={`ticket${ticket.used ? " ticket-used" : ""}`} key={ticket.code}>
                <div>
                  <span className="ticket-label">BIO / ENTRÉ</span>
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
      <footer>Slå dig ner. Filmen kan börja.</footer>
    </main>
  );
}

export default App;
