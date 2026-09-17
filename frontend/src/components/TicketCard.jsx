export default function TicketCard({ ticket, disabled, onUse, onDelete }) {
  return (
    <div className={`ticket${ticket.used ? " ticket-used" : ""}`}>
      <div>
        <span className="ticket-label">BIO / ENTRÉ</span>
        <strong>{ticket.code}</strong>
        <p>Skapad: {new Date(ticket.createdAt).toLocaleString("sv-SE")}</p>
        <p>Status: {ticket.used ? "Använd" : "Oanvänd"}</p>
      </div>

      {ticket.used ? (
        <button
          type="button"
          className="delete-button delete-button-small"
          disabled={disabled}
          onClick={() => onDelete(ticket.code, true)}
        >
          Ta bort
        </button>
      ) : (
        <div className="ticket-actions">
          <button
            type="button"
            className="use-button"
            disabled={disabled}
            onClick={() => onUse(ticket.code)}
          >
            Använd
          </button>
          <button
            type="button"
            className="delete-button"
            disabled={disabled}
            onClick={() => onDelete(ticket.code)}
          >
            Ta bort
          </button>
        </div>
      )}
    </div>
  );
}
