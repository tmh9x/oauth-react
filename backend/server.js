const express = require('express');
const app = express();

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

const cors = require('cors');
const corsOptions = {
    origin: 'http://localhost:3000',
    methods: 'GET,POST,PUT,DELETE',
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

require('dotenv').config();

const session = require('express-session');
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

const passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());

const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:4000/auth/google/callback",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        db.get("SELECT * FROM users WHERE googleId = ?", [profile.id], (err, row) => {
            if (!row) {
                // If user does not exist, create a new one
                db.run("INSERT INTO users (username, name, googleId) VALUES (?, ?, ?)", [profile.displayName, profile.displayName, profile.id], (err) => {
                    db.get("SELECT * FROM users WHERE googleId = ?", [profile.id], (err, newRow) => {
                        return cb(err, newRow);
                    });
                });
            } else {
                return cb(null, row);
            }
        });
    }
));

passport.serializeUser(function (user, done) {
    done(null, user.id); // Hier wird die Benutzer-ID in der Session gespeichert
});

passport.deserializeUser(function (id, done) {
    db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
        done(err, row); // Die vollständigen Benutzerdaten werden für die Anfrage verfügbar gemacht
    });
});

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, name TEXT, googleId TEXT, secret TEXT)");
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function (req, res) {
        res.redirect('http://localhost:3000/myspace');
    }
);

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
});

app.get("/", (req, res) => {
    res.send("Welcome to the homepage!");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

db.all("SELECT * FROM users", (err, rows) => {
    if (err) {
        console.error("Fehler beim Abrufen der Daten:", err);
    } else {
        console.log("Daten aus der Tabelle 'users':", rows);
    }
});

app.get("/userData", (req, res) => {
    // Überprüfen, ob der Nutzer eingeloggt ist
    if (req.isAuthenticated()) {
        // req.user sollte das Nutzerobjekt aus der Deserialisierung enthalten
        const userId = req.user.id;

        db.get("SELECT id, username, name FROM users WHERE id = ?", [userId], (err, row) => {
            if (err) {
                console.error("Fehler beim Abrufen der Nutzerdaten:", err);
                res.status(500).send("Interner Serverfehler");
            } else if (row) {
                res.json(row); // Sendet die Nutzerdaten als JSON-Response
            } else {
                res.status(404).send("Nutzer nicht gefunden");
            }
        });
    } else {
        // Wenn der Nutzer nicht eingeloggt ist, sende eine entsprechende Antwort
        res.status(403).send("Nicht autorisiert");
    }
});