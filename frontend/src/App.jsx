import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

import * as ticketsApi from "./api/ticketsApi";
import TicketCard from "./components/TicketCard";

function App() {
  const [tickets, setTickets] = useState([]);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const actionInProgress = useRef(false);
  const loadVersion = useRef(0);

  const loadTickets = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    setLoadError("");
    try {
      const data = await ticketsApi.listTickets();
      if (version === loadVersion.current) setTickets(data);
    } catch {
      if (version === loadVersion.current) setLoadError("Kunde inte hämta biljetter.");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, []);

  async function createTicket() {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    setBusy(true);
    try {
      const data = await ticketsApi.createTicket();

      setMessage(`Biljett skapad! Kod: ${data.code}`);
      await loadTickets();
    } catch {
      setMessage("Kunde inte skapa biljett.");
    } finally {
      actionInProgress.current = false;
      setBusy(false);
    }
  }

  async function handleUseTicket(event) {
    event.preventDefault();
    await redeemTicket(code, true);
  }

  async function redeemTicket(ticketCode, clearInput = false) {
    if (actionInProgress.current) return;
    if (!ticketCode.trim()) {
      setMessage("Skriv in en biljettkod.");
      return;
    }

    actionInProgress.current = true;
    setBusy(true);
    try {
      const data = await ticketsApi.useTicket(ticketCode.trim().toUpperCase());

      setMessage(`Biljett ${data.code} är nu använd.`);
      if (clearInput) setCode("");
      await loadTickets();
    } catch (error) {
      setMessage(error.message);
    } finally {
      actionInProgress.current = false;
      setBusy(false);
    }
  }

  async function deleteTicket(ticketCode, used = false) {
    if (actionInProgress.current) return;
    if (used && !window.confirm(`Ta bort den använda biljetten ${ticketCode} permanent?`)) return;
    actionInProgress.current = true;
    setBusy(true);
    try {
      await ticketsApi.deleteTicket(ticketCode, used);

      setMessage(`Biljett ${ticketCode} har tagits bort.`);
      await loadTickets();
    } catch (error) {
      setMessage(error.message);
    } finally {
      actionInProgress.current = false;
      setBusy(false);
    }
  }

  async function clearTickets() {
    if (actionInProgress.current || tickets.length === 0) return;
    if (!window.confirm("Vill du rensa alla biljetter? Både använda och oanvända biljetter tas bort permanent.")) return;
    actionInProgress.current = true;
    setBusy(true);
    try {
      await ticketsApi.clearTickets();
      setCode("");
      setMessage("Alla biljetter har rensats.");
      await loadTickets();
    } catch (error) {
      setMessage(error.message);
    } finally {
      actionInProgress.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    const versionRef = loadVersion;
    loadTickets();
    return () => { versionRef.current++; };
  }, [loadTickets]);

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

        <button onClick={createTicket} disabled={busy || loading}>
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
            disabled={busy}
            type="text"
            placeholder="Skriv biljettkod"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />

          <button type="submit" className="use-button" disabled={busy || loading}>
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
        <div className="list-heading">
          <div>
            <h2>Alla biljetter</h2>
            <p className="hint">Oanvända först, använda sist.</p>
          </div>
          <button
            type="button"
            className="delete-button"
            onClick={clearTickets}
            disabled={busy || loading || tickets.length === 0}
          >
            Rensa alla biljetter
          </button>
        </div>

        {loading && <p role="status">Hämtar biljetter…</p>}
        {loadError && (
          <div>
            <p role="alert">{loadError}</p>
            <button type="button" onClick={loadTickets} disabled={busy || loading}>
              Försök igen
            </button>
          </div>
        )}
        {!loading && !loadError && tickets.length === 0 && (
          <p>Inga biljetter finns.</p>
        )}
        {tickets.length > 0 && (
          <div className="tickets">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.code}
                ticket={ticket}
                disabled={busy || loading}
                onUse={redeemTicket}
                onDelete={deleteTicket}
              />
            ))}
          </div>
        )}
      </section>
      <footer>Slå dig ner. Filmen kan börja.</footer>
    </main>
  );
}

export default App;
