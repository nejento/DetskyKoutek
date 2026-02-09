const express = require('express');
const db = require('../db');
const xss = require("xss");
const helpers = require('../helpers');
let router = express.Router();

router.get('/', async (req, res) => {
    if (req.session.loggedin) {
        let lianeID = req.session.userid;
        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");}),
            userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        db.query("SELECT * FROM children WHERE children.user_id IN (SELECT users.id FROM users WHERE users.liane_ID = ?)", lianeID, (err, result) => {
            if (!err) {
                if (result.length > 0) { // Pokud má uživatel definované děti

                    //Kontrola, zdali jsou vytvořené rezervace, které jsou do budoucna platné. Pokud ano, vypsat je.
                    db.query("SELECT child_reservations.*, IF(DATE_FORMAT(child_reservations.time_from, '%Y-%m-%d') = CURDATE(), IF(child_reservations.user_id IS NULL, TRUE, FALSE), TRUE) AS removable,\n" +
                        "       users.id AS userID, users.name AS name, users.surname AS surname\n" +
                        "FROM child_reservations\n" +
                        "LEFT JOIN users\n" +
                        "    ON child_reservations.user_id = users.id\n" +
                        "WHERE child_reservations.child_id IN (\n" +
                        "    SELECT children.id FROM children\n" +
                        "    WHERE children.user_id = ?\n" +
                        ")\n" +
                        "AND child_reservations.time_from >= CURDATE()\n" +
                        "ORDER BY child_reservations.time_from;", userID, (err, resultRezervace) => {
                        if (!err) {
                            res.render('reservations', {
                                title: 'Spravovat rezervované časy',
                                activeNavbar: "rezervace",
                                role: userRole,
                                name: req.session.name,
                                surname: req.session.surname,
                                deti: result,
                                rezervace: resultRezervace
                            });
                        } else {
                            console.log(err);
                            res.status(406);
                            res.send("Error: Nepodařilo se získat aktuálně vytvořené rezervace, prosím kontaktujte správce aplikace");
                        }
                    });

                } else res.redirect('/user/children'); // Uživatel nemá definované děti
            } else {
                console.log(err);
                res.status(406);
                res.send("Error: Nepodařilo se získat vytvořené děti z databáze, prosím kontaktujte správce aplikace");
            }
        });

    } else res.redirect('/auth/login'); // Uživatel není asistent, převeden na Přihlášení
});

/**
 * Vytvoření nové rezervace
 */
router.post('/new', async (req, res) => {
    if (req.session.loggedin) {
        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        let eventStart = new Date(xss(req.body.startDate)),
            eventEnd = new Date(xss(req.body.endDate)),
            childID = xss(req.body.childid);

        //Kontrola omezení, zdali počáteční a konečné nastavené datum je ve stejný den, stejný měsíc a stejný rok a zdali jsou dodržené otevírací časy dětského koutku
        if (req.body.startDate !== "" && req.body.endDate !== "" && helpers.checkConstraints(eventStart, eventEnd) && childID !== "") {

            //Kontrola, zda dítě patří rodiči
            db.query("SELECT * FROM children WHERE id = ? AND user_id = ?", [childID, userID], (err, result) => {
                if (!err && result.length > 0) { //Pokud dítě patří rodiči, je k dispozici výsledek

                    //Kontrola, zdali není již pro dítě vytvořená rezervace
                    db.query("SELECT child_reservations.* FROM child_reservations\n" +
                        "WHERE child_reservations.child_id = ?\n" +
                        "AND (\n" +
                        "    (? <= time_to AND ? >= time_from)\n" +
                        ")", [childID, eventStart, eventEnd], (err, result) => {
                        if (!err) {
                            if (result.length > 0) { //Pokud je pro dítě vytvořená rezervace, je k dispozici výsledek. Není možné rezervaci vytvořit
                                res.send(JSON.stringify({error: "Nastavenou rezervaci možné přidat. Čas rezervace se překrývá s již vytvořenou rezervací."}));
                            } else {
                                //Přidání rezervace do databáze
                                db.query('INSERT INTO child_reservations (child_id, time_from, time_to) VALUES (?, ?, ?)', [childID, eventStart, eventEnd], (err, result) => {
                                    if (!err) {
                                        res.send(JSON.stringify({confirmed: true}));
                                    } else res.send(JSON.stringify({error: "Nastavenou rezervaci není možné přidat. Chyba při zápisu do databáze."}));
                                });
                            }
                        }
                    });

                } else res.send(JSON.stringify({error: "Nastavenou rezervaci možné přidat. Dítě nepatří danému uživateli."}));
            });
        } else res.send(JSON.stringify({error: "Nastavenou rezervaci možné přidat. Zkontrolujte správnost dat a zdali jsou v rámci omezení otevírací doby."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro přidání rezervace musíte být přihlášen. Přihlaste se a zkuste to znovu."}));

});

/**
 * Odstranění rezervace
 */
router.post('/remove', async (req, res) => {
    if (req.session.loggedin) {
        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        let reservationID = xss(req.body.reservationid);

        if (reservationID !== "") {
            //Kontrola, zda dítě patří rodiči
            db.query("SELECT * FROM child_reservations\n" +
                "WHERE child_reservations.id = ?\n" +
                "AND child_reservations.child_id IN (\n" +
                "    SELECT children.id FROM children\n" +
                "    WHERE children.user_id = ?\n" +
                ")", [reservationID, userID], (err, result) => {
                if (!err && result.length > 0) { //Pokud dítě patří rodiči, je k dispozici výsledek

                    //Kontrola, zdali není již pro dítě vytvořená rezervace
                    db.query("SELECT IF(DATE_FORMAT(child_reservations.time_from, '%Y-%m-%d') = CURDATE(), IF(child_reservations.user_id IS NULL, TRUE, FALSE), TRUE) AS removable FROM child_reservations\n" +
                        "WHERE child_reservations.id = ?\n" +
                        "AND child_reservations.time_from >= CURDATE()", [reservationID], (err, result) => {
                        if (!err && result[0].removable === 1) { //Pokud je rezervace odstranitelná, můžeme provést odstraněné
                            db.query("DELETE FROM child_reservations WHERE id = ?", [reservationID], (err, result) => {
                                if (!err) {
                                    res.send(JSON.stringify({confirmed: true}));
                                } else res.send(JSON.stringify({error: "Rezervaci není možné odstranit. Prosím, zkuste to znovu."}));
                            });
                        } else res.send(JSON.stringify({error: "Rezervaci není možné odstranit. Buď již uplynula doba, kdy je možné rezervace odstranit, nebo je rezervace již potvrzena."}));
                    });
                } else res.send(JSON.stringify({error: "Rezervaci není možné odstranit. Dítě nepatří danému uživateli."}));
            });
        } else res.send(JSON.stringify({error: "Rezervaci není možné odstranit. Nebyla dodána potřebná data."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro odstranění rezervace musíte být přihlášen. Přihlaste se a zkuste to znovu."}));

});

module.exports = router;
