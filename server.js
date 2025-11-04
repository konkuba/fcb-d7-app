const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fcb-d7-secret-key-2024';

// Datenbank-Verbindung
const db = new sqlite3.Database(process.env.DATABASE_URL || './fcb_d7.db', (err) => {
    if (err) {
        console.error('Datenbankverbindung fehlgeschlagen:', err);
    } else {
        console.log('Mit SQLite-Datenbank verbunden');
        initDatabase();
    }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());

// Serve static files from root directory
app.use(express.static(__dirname));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Hauptseite
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Datenbank initialisieren
function initDatabase() {
    // Users Tabelle
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'parent',
        player_id INTEGER,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Players Tabelle
    db.run(`CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        number INTEGER,
        birth_date DATE,
        position TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Events Tabelle
    db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        time TIME NOT NULL,
        end_time TIME,
        location TEXT NOT NULL,
        opponent TEXT,
        status TEXT DEFAULT 'scheduled',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    // Confirmations Tabelle
    db.run(`CREATE TABLE IF NOT EXISTS confirmations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        comment TEXT,
        confirmed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id),
        FOREIGN KEY (player_id) REFERENCES players(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(event_id, player_id)
    )`);

    // Messages Tabelle
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        recipient_type TEXT DEFAULT 'all',
        event_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (event_id) REFERENCES events(id)
    )`);

    // News Tabelle
    db.run(`CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER NOT NULL,
        published BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id)
    )`);
}

// JWT Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Kein Token vorhanden' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Ungültiger Token' });
        }
        req.user = user;
        next();
    });
};

// Trainer-Check Middleware
const requireTrainer = (req, res, next) => {
    if (req.user.role !== 'trainer') {
        return res.status(403).json({ error: 'Nur für Trainer zugänglich' });
    }
    next();
};

// ==================== AUTH ROUTES ====================

// Registrierung
app.post('/api/auth/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
    body('role').isIn(['trainer', 'parent', 'player'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role, player_id } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
        `INSERT INTO users (email, password, name, role, player_id) VALUES (?, ?, ?, ?, ?)`,
        [email, hashedPassword, name, role, player_id],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'E-Mail bereits registriert' });
                }
                return res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
            }

            const token = jwt.sign(
                { id: this.lastID, email, role, name },
                JWT_SECRET,
                { expiresIn: '30d' }
            );

            res.json({ 
                token, 
                user: { id: this.lastID, email, name, role }
            });
        }
    );
});

// Login
app.post('/api/auth/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    db.get(
        `SELECT * FROM users WHERE email = ?`,
        [email],
        async (err, user) => {
            if (err || !user) {
                return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, name: user.name },
                JWT_SECRET,
                { expiresIn: '30d' }
            );

            res.json({ 
                token, 
                user: { 
                    id: user.id, 
                    email: user.email, 
                    name: user.name, 
                    role: user.role,
                    player_id: user.player_id
                }
            });
        }
    );
});

// ==================== EVENT ROUTES ====================

// Alle Events abrufen
app.get('/api/events', authenticateToken, (req, res) => {
    const query = `
        SELECT e.*, 
               COUNT(CASE WHEN c.status = 'confirmed' THEN 1 END) as confirmed_count,
               COUNT(CASE WHEN c.status = 'declined' THEN 1 END) as declined_count
        FROM events e
        LEFT JOIN confirmations c ON e.id = c.event_id
        GROUP BY e.id
        ORDER BY e.date ASC, e.time ASC
    `;

    db.all(query, [], (err, events) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Abrufen der Events' });
        }
        res.json(events);
    });
});

// Event erstellen (nur Trainer)
app.post('/api/events', authenticateToken, requireTrainer, [
    body('type').isIn(['training', 'match', 'tournament', 'other']),
    body('title').trim().notEmpty(),
    body('date').isISO8601(),
    body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('location').trim().notEmpty()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { type, title, description, date, time, end_time, location, opponent } = req.body;

    db.run(
        `INSERT INTO events (type, title, description, date, time, end_time, location, opponent, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [type, title, description, date, time, end_time, location, opponent, req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Event konnte nicht erstellt werden' });
            }
            res.json({ 
                id: this.lastID, 
                message: 'Event erfolgreich erstellt' 
            });
        }
    );
});

// Event aktualisieren (nur Trainer)
app.put('/api/events/:id', authenticateToken, requireTrainer, (req, res) => {
    const eventId = req.params.id;
    const updates = req.body;
    
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(eventId);

    db.run(
        `UPDATE events SET ${fields} WHERE id = ?`,
        values,
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Event konnte nicht aktualisiert werden' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Event nicht gefunden' });
            }
            res.json({ message: 'Event erfolgreich aktualisiert' });
        }
    );
});

// Event löschen (nur Trainer)
app.delete('/api/events/:id', authenticateToken, requireTrainer, (req, res) => {
    const eventId = req.params.id;

    db.run(`DELETE FROM confirmations WHERE event_id = ?`, [eventId], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Löschen' });
        }
        
        db.run(`DELETE FROM events WHERE id = ?`, [eventId], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Event konnte nicht gelöscht werden' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Event nicht gefunden' });
            }
            res.json({ message: 'Event erfolgreich gelöscht' });
        });
    });
});

// ==================== CONFIRMATION ROUTES ====================

// Zu-/Absage für Event
app.post('/api/events/:id/confirmation', authenticateToken, [
    body('status').isIn(['confirmed', 'declined', 'maybe']),
    body('player_id').isInt()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const eventId = req.params.id;
    const { status, player_id, comment } = req.body;

    db.run(
        `INSERT INTO confirmations (event_id, player_id, user_id, status, comment) 
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(event_id, player_id) 
         DO UPDATE SET status = ?, comment = ?, confirmed_at = CURRENT_TIMESTAMP`,
        [eventId, player_id, req.user.id, status, comment, status, comment],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Fehler bei der Bestätigung' });
            }
            res.json({ message: 'Status erfolgreich aktualisiert' });
        }
    );
});

// Bestätigungen für Event abrufen
app.get('/api/events/:id/confirmations', authenticateToken, (req, res) => {
    const eventId = req.params.id;

    db.all(
        `SELECT c.*, p.name as player_name, p.number as player_number, u.name as confirmed_by
         FROM confirmations c
         JOIN players p ON c.player_id = p.id
         JOIN users u ON c.user_id = u.id
         WHERE c.event_id = ?
         ORDER BY p.name ASC`,
        [eventId],
        (err, confirmations) => {
            if (err) {
                return res.status(500).json({ error: 'Fehler beim Abrufen der Bestätigungen' });
            }
            res.json(confirmations);
        }
    );
});

// ==================== PLAYER ROUTES ====================

// Alle Spieler abrufen
app.get('/api/players', authenticateToken, (req, res) => {
    db.all(
        `SELECT * FROM players WHERE status = 'active' ORDER BY number ASC`,
        [],
        (err, players) => {
            if (err) {
                return res.status(500).json({ error: 'Fehler beim Abrufen der Spieler' });
            }
            res.json(players);
        }
    );
});

// Spieler hinzufügen (nur Trainer)
app.post('/api/players', authenticateToken, requireTrainer, [
    body('name').trim().notEmpty(),
    body('number').isInt({ min: 1, max: 99 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, number, birth_date, position } = req.body;

    db.run(
        `INSERT INTO players (name, number, birth_date, position) VALUES (?, ?, ?, ?)`,
        [name, number, birth_date, position],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Spieler konnte nicht hinzugefügt werden' });
            }
            res.json({ 
                id: this.lastID,
                message: 'Spieler erfolgreich hinzugefügt' 
            });
        }
    );
});

// ==================== MESSAGE ROUTES ====================

// Nachricht senden (nur Trainer)
app.post('/api/messages', authenticateToken, requireTrainer, [
    body('subject').trim().notEmpty(),
    body('content').trim().notEmpty(),
    body('recipient_type').isIn(['all', 'parents', 'players'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { subject, content, recipient_type, event_id } = req.body;

    db.run(
        `INSERT INTO messages (sender_id, subject, content, recipient_type, event_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, subject, content, recipient_type, event_id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Nachricht konnte nicht gesendet werden' });
            }
            res.json({ 
                id: this.lastID,
                message: 'Nachricht erfolgreich gesendet' 
            });
        }
    );
});

// Nachrichten abrufen
app.get('/api/messages', authenticateToken, (req, res) => {
    const query = req.user.role === 'trainer' 
        ? `SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON m.sender_id = u.id ORDER BY m.created_at DESC`
        : `SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.recipient_type = 'all' OR m.recipient_type = ? ORDER BY m.created_at DESC`;
    
    const params = req.user.role === 'trainer' ? [] : [req.user.role === 'parent' ? 'parents' : 'players'];

    db.all(query, params, (err, messages) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Abrufen der Nachrichten' });
        }
        res.json(messages);
    });
});

// ==================== NEWS ROUTES ====================

// News abrufen
app.get('/api/news', (req, res) => {
    db.all(
        `SELECT n.*, u.name as author_name 
         FROM news n 
         JOIN users u ON n.author_id = u.id 
         WHERE n.published = 1 
         ORDER BY n.created_at DESC 
         LIMIT 10`,
        [],
        (err, news) => {
            if (err) {
                return res.status(500).json({ error: 'Fehler beim Abrufen der News' });
            }
            res.json(news);
        }
    );
});

// News erstellen (nur Trainer)
app.post('/api/news', authenticateToken, requireTrainer, [
    body('title').trim().notEmpty(),
    body('content').trim().notEmpty()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, published = false } = req.body;

    db.run(
        `INSERT INTO news (title, content, author_id, published) VALUES (?, ?, ?, ?)`,
        [title, content, req.user.id, published ? 1 : 0],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'News konnte nicht erstellt werden' });
            }
            res.json({ 
                id: this.lastID,
                message: 'News erfolgreich erstellt' 
            });
        }
    );
});

// ==================== STATISTICS ROUTES ====================

// Team-Statistiken
app.get('/api/stats', authenticateToken, (req, res) => {
    const stats = {};

    // Spieler zählen
    db.get(`SELECT COUNT(*) as total FROM players WHERE status = 'active'`, (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Abrufen der Statistiken' });
        }
        stats.totalPlayers = row.total;

        // Nächstes Event
        db.get(
            `SELECT * FROM events WHERE date >= date('now') ORDER BY date ASC, time ASC LIMIT 1`,
            (err, event) => {
                if (err) {
                    return res.status(500).json({ error: 'Fehler beim Abrufen der Statistiken' });
                }
                stats.nextEvent = event;

                // Anwesenheit beim nächsten Event
                if (event) {
                    db.get(
                        `SELECT 
                            COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
                            COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined
                         FROM confirmations 
                         WHERE event_id = ?`,
                        [event.id],
                        (err, attendance) => {
                            if (err) {
                                return res.status(500).json({ error: 'Fehler beim Abrufen der Statistiken' });
                            }
                            stats.nextEventAttendance = attendance;
                            res.json(stats);
                        }
                    );
                } else {
                    res.json(stats);
                }
            }
        );
    });
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== SERVER START ====================

app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
    console.log(`API verfügbar unter http://localhost:${PORT}/api`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM empfangen. Server wird heruntergefahren...');
    db.close((err) => {
        if (err) {
            console.error('Fehler beim Schließen der Datenbank:', err);
        } else {
            console.log('Datenbankverbindung geschlossen.');
        }
        process.exit(0);
    });
});

module.exports = app;
