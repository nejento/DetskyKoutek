const express = require('express');
const db = require('../db');
const xss = require("xss");
const settings = require('../settings.json');

let router = express.Router();

/**
 * Zpracování přihlášení uživatel, vytvoření Session
 */
router.get('/', (req, res) => {

    let eppn = xss(req.query.eppn), //firstname.lastname@example.com
        eppnName = eppn.split(".")[0], //jméno
        eppnSurname = eppn.split(".")[1].split("@")[0], //prijmeni
        eppnUsername = eppn.split("@")[0]; //jmeno.prijmeni

    if (eppn !== "") {
        if (req.session.loggedin) {
            res.redirect('/user/reservations'); // Pokud je uživatel již přihlášen, nepřidávat znovu session
        } else {
            //Vytvoření session
            req.session.loggedin = true;
            req.session.userid = eppn;
            req.session.username = eppnUsername;
            req.session.name = eppnName;
            req.session.surname = eppnSurname;

            db.query("SELECT * FROM users WHERE liane_ID = ?", eppn, (err, result) => {
                if (!err) {
                    // Když uživatel neexistuje
                    if (result.length === 0) {
                        db.query("INSERT INTO users (liane_ID, role, name, surname) VALUES (?, ?, ?, ?)", [eppn, "parent", eppnName, eppnSurname], (err, result) => {
                            if (!err) {
                                res.redirect('/user/reservations'); //Uživatel je vytvořen, můžeme pracovat
                            } else {
                                console.error(err);
                                res.status(406);
                                res.send("Error: Nepodařilo se vytvořit uživatele. Zkuste to prosím později");
                            }
                        });
                    } else if (result.length === 1) { //Uživatel existuje a je právě jeden (například doplnění uživatele na předem připraveného asistenta)
                        let name = result[0].name == null ? eppnName : result[0].name,
                            surname = result[0].surname == null ? eppnSurname : result[0].surname,
                            role = result[0].role == null ? "parent" : result[0].role;

                        db.query("UPDATE users SET name = ?, surname = ?, role = ? WHERE liane_ID = ?", [name, surname, role, eppn], (err, result) => {
                            if (!err) {
                                res.redirect('/user/reservations'); //Uživatel je vytvořen, můžeme pracovat
                            } else {
                                console.error(err);
                                res.status(406);
                                res.send("Error: Nepodařilo se aktualizovat uživatele. Zkuste to prosím později");
                            }
                        });
                    } else { //Uživatelů existuje nejspíše více. Chyba. Může být pouze jeden
                        console.error(err);
                        res.status(406);
                        res.send("Error: Nepodařilo se přihlásit uživatele. Zkuste to prosím později");
                    }
                }
            });
        }
    } else {
        console.error(err);
        res.status(406);
        res.send("Error: Nepodařilo se ověřit uživatele. Zkuste to prosím později");
    }

});

/**
 * Přihlášení uživatele, proces redirectu na SSO
 */
router.get('/login', (req, res) => {
    if (req.session.loggedin) {
        res.redirect('/user/reservations');
    } else {
        const appUrl = settings.appUrl.replace(/^https?:\/\//, '');
        res.redirect(`${settings.ssoUrl}?from=${appUrl}`);
    }
});


/**
 * Odhlášení uživatele
 */
router.get('/logout', (req, res) => {
    if (req.session.loggedin) {
        req.session.loggedin = false;
        req.session.userid = "";
        req.session.username = "";
        req.session.name = "";
        req.session.surname = "";
        res.redirect("/");
    } else res.redirect("/");
});

module.exports = router;
