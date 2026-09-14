# Biljettsystem

Ett enkelt biljettsystem med React, Express och SQLite. Du kan skapa biljetter,
använda en biljett en gång, ta bort oanvända biljetter och lista deras status.

## Kom igång

Installera Node.js 22.12 eller senare. Kör i två terminaler från projektets rot:

```powershell
cd backend
npm install
npm run dev
```

```powershell
cd frontend
npm install
npm run dev
```

Öppna adressen som Vite visar, normalt http://localhost:5173.
API:t körs på http://localhost:3000. Databasen skapas automatiskt i
`database/tickets.db` när backend startas.

## Databasdesign

```text
tickets
--------------------------------------
id          INTEGER  PRIMARY KEY
code        TEXT     UNIQUE, NOT NULL
created_at  TEXT     NOT NULL (ISO-datum)
used        INTEGER  NOT NULL, DEFAULT 0
--------------------------------------
used: 0 = oanvänd, 1 = använd
```

SQLite är en relationsdatabas. Backend använder `better-sqlite3` och
parametriserade SQL-frågor för att läsa och uppdatera biljetter.

## API och struktur

| Metod | Sökväg | Funktion |
| --- | --- | --- |
| GET | /api/tickets | Lista biljetter |
| POST | /api/tickets | Skapa biljett |
| POST | /api/tickets/use | Använd biljett, JSON: `{ "code": "ABC123" }` |
| DELETE | /api/tickets/:code | Ta bort oanvänd biljett |

`frontend/src/api/ticketsApi.js` hanterar HTTP-anrop och API-fel.
`App.jsx` hanterar gränssnitt och tillstånd. Backend separerar serverstart
(`server.js`), Express-appen (`app.js`) och databasinitiering (`database.js`).

Frontend och backend använder olika portar och därmed olika origins.
Backend använder `cors()` för att tillåta anrop från andra origins.
Projektet saknar inloggning: alla som når API:t kan skapa och använda biljetter
och ta bort oanvända biljetter. Backend nekar radering av använda biljetter.
CORS är inte behörighetskontroll.

## Kontroller

Kör `npm test -- --run` i både `backend` och `frontend`.
Backendtesterna använder en separat SQLite-databas i minnet och påverkar inte
sparade biljetter. Frontendtesterna simulerar API-svar och täcker skapande,
användning, listning, radering och felhantering.

Kör även `npm run lint` och `npm run build` i `frontend`.

Ett konkret kodproblem var att backendtesterna tömde samma databas som appen
använder. Lösningen är att välja `:memory:` när Vitest körs. Ett annat var att
frontendtestet avslutades innan den asynkrona hämtningen hade behandlats;
testerna väntar nu på resultatet med Testing Library.
