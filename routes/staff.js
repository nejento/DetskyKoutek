const express = require('express');
const db = require('../db');
const xss = require("xss");
const helpers = require('../helpers');
let router = express.Router();

/**
 * Zpracování zobrazení stránky pro asistenty
 */
router.get('/', async (req, res) => {
    if (req.session.loggedin) {
        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");}),
            userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        // Kontrola oprávnění
        if (userRole === "assistant" || userRole === "admin") {

            db.query('SELECT * FROM child_reservations\n' +
                'INNER JOIN (\n' +
                '    SELECT children.id AS childID, children.user_id AS parentID, children.name, children.surname, children.birthdate, children.parent_note, children.staff_note, children.coefficient FROM children\n' +
                ') children ON child_reservations.child_id = children.childID\n' +
                'INNER JOIN (\n' +
                '    SELECT users.id AS userID, users.name AS parentName, users.surname AS parentSurname, contact FROM users\n' +
                ') users ON children.parentID = users.userID\n' +
                'WHERE child_reservations.user_id = ?\n' +
                'AND child_reservations.time_from >= CURDATE()\n' +
                'ORDER BY time_from', userID, (err, result) => {
                if (!err) {
                    let todayReservations = [], // Nadcházející rezervace dnešní a zítřejšího dne, aby bylo možné pro asistenty lépe plánovat
                        otherReservations = [];

                    // Jde o dnešní rezervaci? Bude ve výpisu vyzdvižena
                    for (let i = 0; i < result.length; i++) {
                        //console.log(result[i]);

                        let reservationDate = new Date(result[i].time_from),
                            today = new Date(),
                            tommorrow = new Date();
                        tommorrow.setDate(today.getDate() + 1);

                        if (reservationDate.getDate() <= tommorrow.getDate() &&
                            reservationDate.getMonth() <= tommorrow.getMonth() &&
                            reservationDate.getFullYear() <= tommorrow.getFullYear()) {
                            todayReservations.push(result[i]);
                        } else otherReservations.push(result[i]);
                    }
                    res.render('staff', {
                        title: 'Správa asistentů',
                        activeNavbar: "staff",
                        role: userRole,
                        name: req.session.name,
                        surname: req.session.surname,
                        todayReservations: todayReservations,
                        otherReservations: otherReservations
                    });
                } else {
                    console.error(err);
                    res.status(406);
                    res.send("Error: Nepodařilo se získat seznam nadcházejících rezervací, prosím kontaktujte správce aplikace");
                }
            });

        } else res.redirect('/user'); // Uživatel není asistent, převeden na Přehled

    } else res.redirect('/auth/login'); // Uživatel není přihlášen, převeden na přihlášení

});

/**
 * Získání časů asistenta pro kalendář
 */
router.post('/gettimes', async (req, res) => {
    if (req.session.loggedin) {
        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");}),
            userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        // Kontrola oprávnění
        if (userRole === "assistant" || userRole === "admin") {

            let user;
            //Pokud je požadavek od administrátora a je assistantid specifikováno, použijeme to
            if (userRole === "admin") {
                let assistantID = xss(req.body.assistantid);
                if (assistantID !== "") {
                    user = assistantID
                } else user = userID;
            } else user = userID;

            db.query('SELECT id, time_from, time_to, repeating_from, repeating_to FROM available_times WHERE user_id = ?', user, (err, result) => {
                if (!err) {
                    let outputEvents = [];
                    for (let i = 0; i < result.length; i++) {
                        if (result[i].repeating_from != null) {
                            outputEvents.push({
                                id: result[i].id,
                                startDate: new Date(result[i].time_from).toISOString(),
                                endDate: new Date(result[i].time_to).toISOString(),
                                repeating: true,
                                repeatingFrom: new Date(result[i].repeating_from).toISOString(),
                                repeatingTo: new Date(result[i].repeating_to).toISOString()
                            });
                        } else {
                            outputEvents.push({
                                id: result[i].id,
                                startDate: new Date(result[i].time_from).toISOString(),
                                endDate: new Date(result[i].time_to).toISOString(),
                                repeating: false
                            });
                        }
                    }

                    res.send(JSON.stringify(outputEvents));

                } else res.send(JSON.stringify({error: "Nepovedlo se získat časy asistentů. Chyba při čtení z databáze."}));
            });
        } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro zobrazení časů. Přihlaste se a zkuste to znovu."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro zobrazení časů musíte být přihlášen. Přihlaste se a zkuste to znovu."}));
});

/**
 * Zpracování přidání času v rozhraní pro asistenty
 */
router.post('/addtime', async (req, res) => {
    if (req.session.loggedin) {
        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");}),
            userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        // Kontrola oprávnění
        if (userRole === "assistant" || userRole === "admin") {

            let eventStart = new Date(xss(req.body.startDate)),
                eventEnd = new Date(xss(req.body.endDate)),
                repeating = xss(req.body.repeating);

            //Kontrola omezení, zdali počáteční a konečné nastavené datum je ve stejný den, stejný měsíc a stejný rok a zdali jsou dodržené otevírací časy dětského koutku
            if (req.body.startDate !== "" && req.body.endDate !== "" && helpers.checkConstraints(eventStart, eventEnd)) {

                //Jde o opakující se akci
                if (repeating === "true") {
                    let repeatingFrom = new Date(xss(req.body.repeatingFrom)),
                        repeatingTo = new Date(xss(req.body.repeatingTo));

                    // Kontrola, pokud datum akce je mimo nastavený rozsah opakování akce, pokud je, navrátit chybu
                    if (repeatingFrom > eventStart || repeatingTo < eventEnd) {
                        res.send(JSON.stringify({error: "Nastavený čas není možné přidat. Nastavené datum dostupnosti je mimo nastavené termíny opakování."}));
                    } else {
                        db.query('INSERT INTO available_times (user_id, time_from, time_to, repeating_from, repeating_to) VALUES (?, ?, ?, ?, ?);', [userID, eventStart, eventEnd, repeatingFrom, repeatingTo], (err, result) => {
                            if (!err) {
                                res.send(JSON.stringify({
                                    id: result.insertId,
                                    startDate: eventStart.toISOString(),
                                    endDate: eventEnd.toISOString(),
                                    repeating: true,
                                    repeatingFrom: repeatingFrom.toISOString(),
                                    repeatingTo: repeatingTo.toISOString()
                                }));
                            } else res.send(JSON.stringify({error: "Nastavený čas se nepodařilo přidat. Chyba při zápisu do databáze."}));
                        });
                    }
                } else {
                    db.query('INSERT INTO available_times (user_id, time_from, time_to) VALUES (?, ?, ?);', [userID, eventStart, eventEnd], (err, result) => {
                        if (!err) {
                            res.send(JSON.stringify({
                                id: result.insertId,
                                startDate: eventStart.toISOString(),
                                endDate: eventEnd.toISOString(),
                                repeating: false
                            }));
                        }
                    });
                }
            } else res.send(JSON.stringify({error: "Nastavený čas není možné přidat. Zkontrolujte správnost dat a zdali jsou v rámci omezení otevírací doby."}));
        } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro přidání času. Přihlaste se a zkuste to znovu."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro přidání časů musíte být přihlášen. Přihlaste se a zkuste to znovu."}));

});

/**
 * Zpracování přesunutí času v rozhraní pro asistenty
 */
router.post('/updatetime', async (req, res) => {
    if (req.session.loggedin) {
        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");}),
            userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        // Kontrola oprávnění
        if (userRole === "assistant" || userRole === "admin") {

            let eventID = xss(req.body.eventID),
                eventStart = new Date(xss(req.body.eventStart)),
                eventEnd = new Date(xss(req.body.eventEnd)),
                repeating = xss(req.body.repeating),
                repeatingFrom = null,
                repeatingTo = null;

            if (eventID !== "" && helpers.checkConstraints(eventStart, eventEnd)) {

                if (repeating === "true") {
                    repeatingFrom = new Date(xss(req.body.repeatingFrom));
                    repeatingTo = new Date(xss(req.body.repeatingTo));

                    // Kontrola, pokud datum akce je mimo nastavený rozsah opakování akce, pokud je, upravit hranici opakování
                    if (repeatingFrom > eventStart) repeatingFrom = eventStart;
                    if (repeatingTo < eventEnd) repeatingTo = eventEnd;
                }

                db.query('SELECT * FROM available_times WHERE user_id = ? AND id = ?', [userID, eventID], (err, result) => {
                    if (!err && result.length === 1) {
                        db.query('UPDATE available_times SET time_from = ?, time_to = ?, repeating_from = ?, repeating_to = ? WHERE user_id = ? AND id = ?;', [eventStart, eventEnd, repeatingFrom, repeatingTo, userID, eventID], () => {
                            if (!err) {
                                if (repeating) {
                                    res.send(JSON.stringify({
                                        id: eventID,
                                        startDate: eventStart.toISOString(),
                                        endDate: eventEnd.toISOString(),
                                        repeating: true,
                                        repeatingFrom: repeatingFrom.toISOString(),
                                        repeatingTo: repeatingTo.toISOString()
                                    }));
                                } else {
                                    res.send(JSON.stringify({
                                        id: eventID,
                                        startDate: eventStart.toISOString(),
                                        endDate: eventEnd.toISOString(),
                                        repeating: false
                                    }));
                                }
                            } else res.send(JSON.stringify({error: "Nastavený čas se nepodařilo změnit. Chyba při zápisu do databáze."}));
                        });
                    } else res.send(JSON.stringify({error: "Nastavený čas se nepovedlo změnit. Došlo ke kolizi dat. Zkuste to znovu nebo kontaktujte správce."}));
                });
            } else res.send(JSON.stringify({error: "Nastavený čas se nepovedlo změnit. Zkontrolujte správnost dat a zdali jsou v rámci omezení otevírací doby."}));
        } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro úpravu času. Přihlaste se a zkuste to znovu."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro úpravu časů musíte být přihlášen. Přihlaste se a zkuste to znovu."}));
});

/**
 * Zpracování odstranění času v rozhraní pro asistenty
 */
router.post('/removetime', async (req, res) => {
    if (req.session.loggedin) {
        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");}),
            userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        // Kontrola oprávnění
        if (userRole === "assistant" || userRole === "admin") {

            let eventID = xss(req.body.eventID);
            if (eventID !== "") {
                db.query('DELETE FROM available_times WHERE user_id = ? AND id = ?', [userID, eventID], (err, result) => {
                    if (!err) {
                        res.send(JSON.stringify({removed: false}));
                    } else res.send(JSON.stringify({error: "Nepodařilo se odstranit danou akci. Prosím, zkuste to znovu."}));
                });
            } else res.send(JSON.stringify({error: "Nepodařilo se odstranit danou akci. Nebyla dodána potřebná data."}));
        } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro odstranění času. Přihlaste se a zkuste to znovu."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro odstranění časů musíte být přihlášen. Přihlaste se a zkuste to znovu."}));
});

module.exports = router;
