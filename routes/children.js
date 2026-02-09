const express = require('express');
const db = require('../db');
const xss = require("xss");
const helpers = require('../helpers');
let router = express.Router();

/**
 * Zpracování zobrazení stránky výpisu dětí
 */
router.get('/', async (req, res) => {
    if (req.session.loggedin) {

        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");}),
            userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");}),
            contact = await helpers.getContact(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se získat kontakt uživatele.");});

        //Seznam dětí a informace o tom, jestli už mělo vytvořenou rezervaci, abychom mohli případně ještě dovolit editaci dítěte
        db.query('SELECT DISTINCT children.*, IF(child_reservations.child_id IS NULL, TRUE, FALSE) AS editable FROM children\n' +
            'LEFT JOIN child_reservations\n' +
            'ON children.id = child_reservations.child_id\n' +
            'WHERE children.user_id = ?', userID, (err, result) => {
            if (!err) {
                if (result.length > 0) { // Pokud má uživatel definované děti
                    res.render('child_list', {
                        title: 'Zde můžete upravit údaje o svých dětech, přidat poznámky o dětech nebo odstranit děti, které zatím nebyly hlídané.',
                        activeNavbar: "deti",
                        role: userRole,
                        name: req.session.name,
                        surname: req.session.surname,
                        deti: result,
                        phone: contact
                    });
                } else { // Uživatel nemá definované děti
                    res.render('child_list', {
                        title: 'Děti definované nejsou',
                        activeNavbar: "deti",
                        role: userRole,
                        name: req.session.name,
                        surname: req.session.surname,
                        prvniRegistrace: true,
                        phone: contact
                    });
                }
            } else {
                console.log(err);
                res.status(406);
                res.send("Error: Nepodařilo se získat vytvořené děti z databáze, prosím kontaktujte správce aplikace");
            }
        });

    } else res.redirect('/auth/login'); // Uživatel není přihlášen, převeden na přihlášení

});

/**
 * Přidání prvního dítěte do databáze (navíc je přidáván kontakt)
 */
router.post('/first', async (req, res) => {
    if (req.session.loggedin) {
        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");}),
            name = xss(req.body.name),
            surname = xss(req.body.surname),
            birthdate = new Date(xss(req.body.birthdate)),
            parentNote = xss(req.body.parentnote),
            phone = xss(req.body.phone);

        res.setHeader('Content-Type', 'application/json');

        if (name !== "" && surname !== "" && /^[+]?[()/0-9. -]{9,}$/.test(phone) && birthdate < new Date()) {
            db.query('INSERT INTO children (user_id, `name`, surname, birthdate, parent_note) VALUES (?, ?, ?, ?, ?);', [userID, name, surname, birthdate, parentNote], (err, result) => {
                if (!err) {
                    db.query('UPDATE users SET contact = ? WHERE id = ?', [phone, userID], (err, result) => {
                        if (!err) {
                            res.send(JSON.stringify({confirmed: true}));
                        } else res.send(JSON.stringify({error: "Nepodařilo se přidat kontakt do databáze. Chyba při zápisu do databáze."}));
                    });
                } else res.send(JSON.stringify({error: "Nepodařilo se přidat dítě do databáze. Chyba při zápisu do databáze."}));
            });
        } else res.send(JSON.stringify({error: "Nepodařilo se přidat dítě do databáze. Byly zadány neplatné údaje."}));

    } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro přidání dítěte. Přihlaste se a zkuste to znovu."}));
});

/**
 * Přidání dítěte do databáze
 */
router.post('/new', async (req, res) => {
    if (req.session.loggedin) {
        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");}),
            name = xss(req.body.name),
            surname = xss(req.body.surname),
            birthdate = new Date(xss(req.body.birthdate)),
            parentNote = xss(req.body.parentnote);

        res.setHeader('Content-Type', 'application/json');

        if (name !== "" && surname !== "" && birthdate < new Date()) {
            db.query('INSERT INTO children (user_id, `name`, surname, birthdate, parent_note) VALUES (?, ?, ?, ?, ?);', [userID, name, surname, birthdate, parentNote], (err, result) => {
                if (!err) {
                    res.send(JSON.stringify({confirmed: true}));
                } else res.send(JSON.stringify({error: "Nepodařilo se přidat dítě do databáze. Chyba při zápisu do databáze."}));
            });
        } else res.send(JSON.stringify({error: "Nepodařilo se přidat dítě do databáze. Byly zadány neplatné údaje."}));

    } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro přidání dítěte. Přihlaste se a zkuste to znovu."}));
});

/**
 * Úprava dítěte v databázi
 */
router.post('/edit', async (req, res) => {
    if (req.session.loggedin) {
        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");}),
            diteID = xss(req.body.diteid),
            name = xss(req.body.name),
            surname = xss(req.body.surname),
            birthdate = new Date(xss(req.body.birthdate)),
            parentNote = xss(req.body.parentnote);

        res.setHeader('Content-Type', 'application/json');

        if (diteID !== "") {
            db.query('SELECT DISTINCT children.*, IF(child_reservations.child_id IS NULL, TRUE, FALSE) AS editable FROM children \n' +
                'LEFT JOIN child_reservations ON children.id = child_reservations.child_id \n' +
                'WHERE children.user_id = ? \n' +
                'AND children.id = ?', [userID, diteID], (err, result) => {
                if (!err && result.length === 1) {

                    //Pokud je dítě editovatelné, upravit všechny podané věci
                    if (result[0].editable === 1) {
                        if (name !== "" && surname !== "" && birthdate < new Date()) {
                            db.query('UPDATE children SET `name` = ?, surname = ?, birthdate = ?, parent_note = ? WHERE user_id = ? AND id = ?;', [name, surname, birthdate, parentNote, userID, diteID], (err, result) => {
                                if (!err) {
                                    res.send(JSON.stringify({confirmed: true}));
                                } else res.send(JSON.stringify({error: "Informace o dítěti nemohly být upraveny. Problém při zápisu do databáze."}));
                            });
                        } else res.send(JSON.stringify({error: "Informace o dítěti nemohly být upraveny. Chybí informace pro změny."}));

                    } else { //Pokud dítě editovatelné není, upravit pouze editovatelné položky
                        db.query('UPDATE children SET parent_note = ? WHERE user_id = ? AND id = ?;', [parentNote, userID, diteID], (err, result) => {
                            if (!err) {
                                res.send(JSON.stringify({confirmed: true}));
                            } else res.send(JSON.stringify({error: "Informace o dítěti nemohly být upraveny. Problém při zápisu do databáze."}));
                        });
                    }
                } else res.send(JSON.stringify({error: "Informace o dítěti nemohly být upraveny. Problém při čtení z databáze."}));
            });
        } else res.send(JSON.stringify({error: "Informace o dítěti nemohly být upraveny. ID dítěte nebylo dodáno."}));

    } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro úpravu dítěte. Přihlaste se a zkuste to znovu."}));
});

/**
 * Odstranění dítěte z databáze
 */
router.post('/remove', async (req, res) => {
    if (req.session.loggedin) {
        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");}),
            diteID = xss(req.body.diteid);

        res.setHeader('Content-Type', 'application/json');

        if (diteID !== "") {
            db.query('SELECT DISTINCT children.*, IF(child_reservations.child_id IS NULL, TRUE, FALSE) AS editable FROM children \n' +
                'LEFT JOIN child_reservations ON children.id = child_reservations.child_id \n' +
                'WHERE children.user_id = ? \n' +
                'AND children.id = ?', [userID, diteID], (err, result) => {
                if (!err && result.length === 1) {

                    //Pokud je dítě editovatelné, je možné dítě smazat
                    if (result[0].editable === 1) {
                        db.query('DELETE FROM children WHERE user_id = ? AND id = ?', [userID, diteID], (err, result) => {
                            if (!err) {
                                res.send(JSON.stringify({confirmed: true}));
                            } else res.send(JSON.stringify({error: "Nepodařilo se odstranit danou akci. Prosím, zkuste to znovu."}));
                        });

                    } else res.send(JSON.stringify({error: "Dítě nemohlo být odebráno. Dítěti již byla vytvořena rezervace."})); //Pokud dítě editovatelné není, nelze jej smazat
                } else res.send(JSON.stringify({error: "Dítě nemohlo být odebráno. Problém při čtení z databáze."}));
            });
        } else res.send(JSON.stringify({error: "Dítě nemohlo být odebráno. ID dítěte nebylo dodáno."}));

    } else res.send(JSON.stringify({error:  "Forbidden: Nedostatečné oprávnění pro odebrání dítěte. Přihlaste se a zkuste to znovu."}));

});

/**
 * Úprava kontaktu v databázi
 */
router.post('/editphone', async (req, res) => {
    if (req.session.loggedin) {
        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");}),
            phone = xss(req.body.phone);

        res.setHeader('Content-Type', 'application/json');

        if (/^[+]?[()/0-9. -]{9,}$/.test(phone)) {
            db.query('UPDATE users SET contact = ? WHERE id = ?', [phone, userID], (err, result) => {
                if (!err) {
                    res.send(JSON.stringify({confirmed: true}));
                } else res.send(JSON.stringify({error: "Nepodařilo se upravit kontakt v databázi. Chyba při zápisu do databáze."}));
            });
        } else res.send(JSON.stringify({error: "Kontakt nemohl být upraven. Kontakt není v platném formátu."}));

    } else res.send(JSON.stringify({error:  "Forbidden: Nedostatečné oprávnění pro úpravu kontaktu. Přihlaste se a zkuste to znovu."}));
});

module.exports = router;
