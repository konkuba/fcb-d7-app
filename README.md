# FC Büsingen D7 - Team Management App

Eine moderne Web-App zur Verwaltung der D7-Junioren des FC Büsingen. Die App ermöglicht es Trainern, Spielern und Eltern, Termine zu verwalten, An-/Abmeldungen vorzunehmen und wichtige Informationen auszutauschen.

## 🌟 Features

### Für Trainer
- ✅ Termine (Training, Spiele, Turniere) anlegen und verwalten
- 📊 Übersicht über An-/Abmeldungen
- 📨 Nachrichten an Spieler und Eltern senden
- 📈 Team-Statistiken einsehen

### Für Spieler/Eltern
- 📅 Alle Termine auf einen Blick
- ✔️ Einfache An-/Abmeldung mit einem Klick
- 📱 Progressive Web App (PWA) - funktioniert wie eine App
- 🔔 Push-Benachrichtigungen (in Entwicklung)

## 🚀 Schnellstart - Online in 5 Minuten!

### Option 1: Railway (Empfohlen - Kostenlos)

1. **GitHub Repository erstellen**
   - Gehe zu [GitHub](https://github.com/new)
   - Erstelle ein neues Repository "fcb-d7-app"
   - Lade alle Dateien hoch

2. **Railway Deployment**
   - Gehe zu [Railway.app](https://railway.app)
   - Klicke auf "Start a New Project"
   - Wähle "Deploy from GitHub repo"
   - Wähle dein Repository aus
   - Railway deployed automatisch!

3. **Umgebungsvariablen setzen**
   In Railway Dashboard:
   ```
   JWT_SECRET=dein-super-geheimer-schluessel-2024
   PORT=3001
   ```

### Option 2: Render (Alternative - Kostenlos)

1. **Render Account erstellen**
   - Gehe zu [Render.com](https://render.com)
   - Registriere dich kostenlos

2. **Neue Web Service erstellen**
   - "New" → "Web Service"
   - Verbinde GitHub Repository
   - Build Command: `npm install`
   - Start Command: `npm run init-db && npm start`

## 💻 Lokale Installation

### Voraussetzungen
- Node.js 18+ installiert
- npm oder yarn

### Installation

```bash
# Repository klonen
git clone https://github.com/dein-username/fcb-d7-app.git
cd fcb-d7-app

# Abhängigkeiten installieren
npm install

# Umgebungsvariablen kopieren
cp .env.example .env

# Datenbank initialisieren
npm run init-db

# Server starten
npm start
```

Die App läuft dann unter: http://localhost:3001

## 📱 Test-Zugangsdaten

### Trainer-Account
- **Email:** stephan@fcbuesingen.ch
- **Passwort:** fcb2024

### Eltern-Account
- **Email:** mueller@example.com
- **Passwort:** test123

## 🏗️ Technologie-Stack

- **Frontend:** React, PWA
- **Backend:** Node.js, Express
- **Datenbank:** SQLite (Entwicklung), PostgreSQL (Produktion möglich)
- **Authentifizierung:** JWT
- **Hosting:** Railway/Render (kostenlos)

## 📂 Projektstruktur

```
fcb-backend/
├── server.js           # Hauptserver mit API-Endpoints
├── package.json        # Abhängigkeiten
├── railway.json        # Railway Konfiguration
├── .env.example        # Umgebungsvariablen Beispiel
├── scripts/
│   └── init-db.js     # Datenbank-Setup mit Demo-Daten
└── public/
    └── index.html     # Frontend (React PWA)
```

## 🔧 API Endpoints

### Authentifizierung
- `POST /api/auth/login` - Anmelden
- `POST /api/auth/register` - Registrieren

### Events
- `GET /api/events` - Alle Termine abrufen
- `POST /api/events` - Neuen Termin erstellen (Trainer)
- `PUT /api/events/:id` - Termin bearbeiten (Trainer)
- `DELETE /api/events/:id` - Termin löschen (Trainer)

### Bestätigungen
- `POST /api/events/:id/confirmation` - Zu-/Absage
- `GET /api/events/:id/confirmations` - Bestätigungen anzeigen

### Spieler
- `GET /api/players` - Alle Spieler abrufen
- `POST /api/players` - Spieler hinzufügen (Trainer)

### Nachrichten
- `GET /api/messages` - Nachrichten abrufen
- `POST /api/messages` - Nachricht senden (Trainer)

### Statistiken
- `GET /api/stats` - Team-Statistiken

## 🎯 Nächste Schritte

### Phase 1 (Aktuell) ✅
- [x] Basis-Funktionalität
- [x] Login-System
- [x] Termine verwalten
- [x] An-/Abmeldungen

### Phase 2 (In Entwicklung)
- [ ] Push-Benachrichtigungen
- [ ] Spielberichte
- [ ] Aufstellungen planen
- [ ] Fahrgemeinschaften

### Phase 3 (Geplant)
- [ ] WhatsApp-Integration
- [ ] Kalendersynchronisation
- [ ] Statistiken & Auswertungen
- [ ] Mannschaftskasse

## 🤝 Support

Bei Fragen oder Problemen:
- Email: stephan@fcbuesingen.ch
- GitHub Issues: [Issues erstellen](https://github.com/dein-username/fcb-d7-app/issues)

## 📄 Lizenz

Dieses Projekt wurde speziell für den FC Büsingen D7-Junioren entwickelt.

## 🙏 Credits

Entwickelt mit ❤️ für die D7-Junioren des FC Büsingen

---

**Wichtig:** Nach dem ersten Deployment solltest du:
1. Das Standard-Passwort ändern
2. Echte Spielerdaten eingeben
3. Den JWT_SECRET in der Produktion ändern
4. Regelmässige Backups einrichten

Viel Erfolg mit der App! ⚽