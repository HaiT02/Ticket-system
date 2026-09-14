# Biljettsystem

En webbapplikation med biotema där användaren kan skapa och hantera entrébiljetter.
Projektet innehåller en frontend byggd med React och Vite, en backend med Node.js
och Express samt en lokal SQLite-databas som hanteras med `better-sqlite3`.

## Funktioner

- Skapa en biljett med en slumpmässig, sex tecken lång kod.
- Använd en biljett genom att skriva in koden och trycka Enter eller klicka på Använd.
- Ta bort en biljett som ännu inte har använts.
- Ta bort en använd biljett med den lilla Ta bort-knappen efter bekräftelse.
- Lista biljetter och se deras status: gul för oanvänd och grön för använd.
- Oanvända biljetter visas först och använda sist, med äldst först inom varje grupp.
- Rensa alla biljetter via knappen i listan och bekräfta borttagningen.

Backend kontrollerar att en biljett bara kan användas en gång. En använd biljett
kan raderas enskilt om anropet innehåller `confirmUsed: true`; gränssnittet frågar
efter bekräftelse innan det skickas. Den separata funktionen "Rensa alla biljetter"
återställer hela listan och tar även bort använda biljetter permanent.
Biljetterna sparas i databasen och finns kvar när
servern startas om.

## Kom igång

### Förberedelser

Du behöver Git, Node.js 22.12 eller senare och npm installerat.

Klona projektet och gå till projektmappen:

```powershell
git clone https://github.com/HaiT02/Ticket-system.git
cd Ticket-system
```

Om du redan har projektet på datorn öppnar du den befintliga projektmappen istället.

### 1. Starta backend

Kör följande från projektets rot i den första terminalen:

```powershell
cd backend
npm install
npm run dev
```

Backend körs på `http://localhost:3000`. Mappen `database` och tabellen skapas
automatiskt vid start. Ingen separat databasserver eller manuell databasinstallation behövs.

### 2. Starta frontend

Öppna en **ny terminal i projektets rot** och kör:

```powershell
cd frontend
npm install
npm run dev
```

Öppna adressen som Vite visar i terminalen, normalt `http://localhost:5173`.
Båda terminalerna behöver vara igång när du använder appen.
Stoppa respektive server med `Ctrl + C`.

## Databasdesign

Databasen sparas i `database/tickets.db` och innehåller en tabell: `tickets`.
Varje rad motsvarar en biljett. Nedan visas databasdesignen som ett textdiagram.

```text
+-------------------------------------------------------+
| tickets                                               |
+-------------+---------+-------------------------------+
| Fält        | Typ     | Regler                        |
+-------------+---------+-------------------------------+
| id          | INTEGER | PRIMARY KEY, AUTOINCREMENT    |
| code        | TEXT    | UNIQUE, NOT NULL              |
| created_at  | TEXT    | NOT NULL                      |
| used        | INTEGER | NOT NULL, DEFAULT 0           |
+-------------+---------+-------------------------------+
```

- `id` är biljettens interna löpnummer.
- `code` är den unika kod som användaren anger vid entrén.
- `created_at` lagrar datum och tid i ISO-format.
- `used` anger status: `0` betyder oanvänd och `1` betyder använd.

SQLite är en relationsdatabas. Backend använder `better-sqlite3` och
parametriserade SQL-frågor för att läsa och uppdatera biljetter.

## API och struktur

| Metod | Sökväg | Funktion |
| --- | --- | --- |
| GET | /api/tickets | Lista biljetter |
| POST | /api/tickets | Skapa biljett |
| POST | /api/tickets/use | Använd biljett, JSON: `{ "code": "ABC123" }` |
| DELETE | /api/tickets/:code | Ta bort biljett; använd kräver JSON `{ "confirmUsed": true }` |
| DELETE | /api/tickets | Rensa alla biljetter, inklusive använda |

`frontend/src/api/ticketsApi.js` hanterar HTTP-anrop och API-fel.
`App.jsx` hanterar gränssnitt och tillstånd. Backend separerar serverstart
(`server.js`), Express-konfiguration och felhantering (`app.js`), biljettens
endpoints (`routes/tickets.js`) och databasinitiering (`database.js`).

Frontend och backend använder olika portar och därmed olika origins.
Backend tillåter som standard origin `http://localhost:5173` via CORS.
Använd den adressen när du öppnar frontend. Om frontend körs på en annan adress
behöver backend startas med miljövariabeln `FRONTEND_ORIGIN` satt till den adressen.
Frontend kan använda en annan API-adress via `VITE_API_URL` (inklusive `/api`).
Projektet saknar inloggning: alla som når API:t kan skapa och använda biljetter
och ta bort oanvända biljetter eller rensa hela listan. Backend nekar enskild
radering av använda biljetter utan bekräftelseflagga. Bekräftelsen för att rensa finns i gränssnittet.
CORS är inte behörighetskontroll.

## Tester och kontroller

Kör `npm test -- --run` i både `backend` och `frontend`.
Backendtesterna använder en separat SQLite-databas i minnet och påverkar inte
sparade biljetter. Frontendtesterna simulerar API-svar och täcker skapande,
användning, listning, radering och felhantering.

Kör även `npm run lint` och `npm run build` i `frontend`.
