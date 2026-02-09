const express = require('express');
const json2csv = require('json2csv');
const db = require('../db');
const xss = require("xss");
const helpers = require('../helpers');
const settings = require('../settings.json');
let router = express.Router();

const getMonths = (year) => {
    return new Promise(resolve => {
        db.query("SELECT DISTINCT MONTH(child_reservations.time_from) AS months FROM child_reservations WHERE YEAR(child_reservations.time_from) = ?", year, (err, result) => {
            if (!err) {
                let months = [];
                for (let i = 0; i < result.length; i++) {
                    months.push(result[i].months);
                }
                resolve(months);
            }
        });
    });
},
getTables = (year, month) => {
    return new Promise(resolve => {
        db.query("SELECT * FROM child_reservations\n" +
            "INNER JOIN (\n" +
            "    SELECT children.id AS childID, children.user_id AS childrenParentID, children.name AS childName, children.surname AS childSurname FROM children\n" +
            ") children ON children.childID = child_reservations.child_id\n" +
            "INNER JOIN (\n" +
            "    SELECT users.id AS parentID, users.name AS parentName, users.surname AS parentSurname, users.liane_ID AS parentLianeID FROM users\n" +
            ") parent ON parent.parentID = children.childrenParentID\n" +
            "INNER JOIN (\n" +
            "    SELECT users.id AS assistantID, users.name AS assistantName, users.surname AS assistantSurname, users.liane_ID AS assistantLianeID FROM users\n" +
            ") assistant ON assistant.assistantID = child_reservations.user_id\n" +
            "WHERE YEAR(time_from) = ?\n" +
            "AND MONTH(time_from) = ?\n" +
            "ORDER BY time_from", [year, month], (err, result) => {
            if (!err) {

                let parentsTables = {},
                    assistantsTables = {};

                for (let i = 0; i < result.length; i++) {
                    const reservation = result[i];

                    //Tabulka rodičů
                    const parentID = reservation.parentID,
                        assistantID = reservation.assistantID;

                    //console.log("Working on parent and assistant", parentID, assistantID, parentsTables[parentID], assistantsTables[assistantID], parentsTables[parentID] === undefined, assistantsTables[assistantID] === undefined, typeof parentsTables[parentID], typeof assistantsTables[assistantID], typeof parentsTables[parentID] == undefined, typeof assistantsTables[assistantID] == undefined, typeof parentsTables[parentID] === undefined, typeof assistantsTables[assistantID] === undefined);

                    if (parentsTables[parentID] === undefined) {
                        //console.log("Creating parent", parentID);
                        parentsTables[parentID] = {
                            parentID: parentID,
                            parentLiane: reservation.parentLianeID,
                            parentName: reservation.parentName + " " + reservation.parentSurname,
                            reservations: [],
                            timeSum: 0, //Počet odhlídaných minut
                            startedHours: 0 //Počet započatých hodin
                        };
                        //console.log(parentsTables[parentID]);
                    }
                    if (assistantsTables[assistantID] === undefined) {
                        //console.log("Creating assistant", assistantID);
                        assistantsTables[assistantID] = {
                            assistantID: assistantID,
                            assistantLiane: reservation.assistantLianeID,
                            assistantName: reservation.assistantName + " " + reservation.assistantSurname,
                            reservations: [],
                            timeSum: 0, //Pořet odhlídaných minut
                            startedHours: 0 //Počet započatých hodin
                        };
                        //console.log(assistantsTables[assistantID]);
                    }

                    let reservationOfParent = {
                            reservationID: reservation.id,
                            childID: reservation.child_id,
                            childrenName: reservation.childName + " " + reservation.childSurname,
                            timeFrom: new Date(reservation.time_from).toISOString(),
                            timeTo: new Date(reservation.time_to).toISOString(),
                            assistantID: reservation.assistantID,
                            assistantName: reservation.assistantName + " " + reservation.assistantSurname
                        },
                        reservationOfAssistant = {
                            reservationID: reservation.id,
                            childID: reservation.child_id,
                            childrenName: reservation.childName + " " + reservation.childSurname,
                            timeFrom: new Date(reservation.time_from).toISOString(),
                            timeTo: new Date(reservation.time_to).toISOString(),
                            parentID: reservation.parentID,
                            parentName: reservation.parentName + " " + reservation.parentSurname
                        },
                        timeDiff = new Date(reservation.time_to) - new Date(reservation.time_from),
                        duration =  timeDiff / 60000; //Doba v minutách

                    parentsTables[parentID].reservations.push(reservationOfParent);
                    parentsTables[parentID].timeSum += duration;
                    parentsTables[parentID].startedHours += Math.ceil(duration / 60);

                    assistantsTables[assistantID].reservations.push(reservationOfAssistant);
                    assistantsTables[assistantID].timeSum += duration;
                    assistantsTables[assistantID].startedHours += Math.ceil(duration / 60);

                    resolve({
                        parentsTables: parentsTables,
                        assistantsTables: assistantsTables
                    });
                }

            }
        });
    });
};

/**
 * Zpracování zobrazení stránky pro administrátory
 */
router.get('/', async (req, res) => {
    if (req.session.loggedin) {
        //let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});
        let userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        // Kontrola oprávnění
        if (userRole === "admin") {

            let yearRequest = xss(req.query.year),
                monthRequest = xss(req.query.month);

            db.query("SELECT DISTINCT YEAR(child_reservations.time_from) AS years FROM child_reservations;" +
                "SELECT * FROM users WHERE role = 'assistant';" +
                "SELECT * FROM users WHERE role = 'admin';" +
                "SELECT * FROM settings;", async (err, results) => {
                if (!err) {
                    let tables = [],
                        years = [],
                        months = [],
                        year,
                        month,
                        settings = Object.assign({}, ...(results[3].map(s => ({ [s.setting]: s.value }) )));

                    if (results[0].length > 0) {
                        for (let i = 0; i < results[0].length; i++) {
                            years.push(results[0][i].years);
                        }

                        if (yearRequest !== "") {
                            year = yearRequest;
                        } else year = results[0][0].years

                        months = await getMonths(year);

                        if (monthRequest !== "") {
                            month = monthRequest;
                        } else month = months[0];

                        tables = await getTables(year, month);
                    }

                    res.render('admin', {
                        title: 'Administrace',
                        role: userRole,
                        name: req.session.name,
                        surname: req.session.surname,
                        activeNavbar: "admin",
                        years: years,
                        months: months,
                        year: year,
                        month: month,
                        tables: tables,
                        assistants: results[1],
                        admins: results[2],
                        settings: settings
                    });

                } else {
                    console.log(err);
                    res.status(406);
                    res.send("Error: Nepodařilo se získat informace z databáze, prosím kontaktujte správce aplikace");
                }
            });

        } else res.redirect('/user'); // Uživatel není správce, převeden na Přehled

    } else res.redirect('/auth/login');

});

/**
 * Získání měsíců daného roku
 */
router.post('/getmonths', async (req, res) => {
    if (req.session.loggedin) {
        //let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});
        let userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        // Kontrola oprávnění
        if (userRole === "admin") {

            let year = xss(req.body.year);
            if (year !== "") {
                res.send(JSON.stringify({months: await getMonths(year)}));
            } else res.send(JSON.stringify({error: "Nepovedlo se získat měsíce daného roku. Nebyla dodána potřebná data."}));
        } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro zobrazení časů. Přihlaste se a zkuste to znovu."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro zobrazení časů musíte být přihlášen. Přihlaste se a zkuste to znovu."}));

});

/**
 * Změna role uživatele
 */
router.post('/changerole', async (req, res) => {
    if (req.session.loggedin) {
        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");}),
            userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        // Kontrola oprávnění
        if (userRole === "admin") {

            let type = xss(req.body.type),
                user = xss(req.body.user),
                role = xss(req.body.role);

            //console.log(type, user, role);

            if (type !== "" && user !== "" && (role === "parent" || role === "assistant" || role === "admin")) {
                // Typ vstupního data je ID
                if (type === "id") {
                    // Měněný uživatel není přihlášeným uživatelem
                    if (user !== userID) {
                        db.query("SELECT * FROM users WHERE id = ?", user, (err, result) => {
                            // V databázi existuje právě jeden uživatel
                            if (!err && result.length === 1) {
                                db.query("UPDATE users SET role = ? WHERE id = ?", [role, user], (err) => {
                                    if (!err) {
                                        // Pokud je původní role assistant nebo admin a novou rolí je parent, odstranit nastavené volné časy asistenta (důvodem je zrychlení načítání při MySQL requestech, kdy volné časy není nutné skladovat)
                                        if ((result[0].role === "assistant" || result[0].role === "admin") && role === "parent") {
                                            db.query("DELETE FROM available_times WHERE user_id = ?", user, (err, result) => {
                                                if (err) console.error("Nepovedlo se vyčistit dostupné časy bývalého asistenta", err);
                                            });
                                        }

                                        res.send(JSON.stringify({confirmed: true}));
                                    } else res.send(JSON.stringify({error: "Nepovedlo se nastavit uživateli roli. Chyba při zápisu do databáze"}));
                                });
                            } else res.send(JSON.stringify({error: "Nepovedlo se nastavit uživateli roli. Uživatel s daným ID neexistuje"}));
                        });
                    } else res.send(JSON.stringify({error: "Nepovedlo se nastavit uživateli roli. Sám sobě nelze z bezpečnostních důvodů roli měnit"}));

                } else if (type === "email") {
                    // Kontrola platnosti emailu
                    const emailDomain = settings.emailDomain;
                    const escapedDomain = emailDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const emailRegex = new RegExp(`^([a-z0-9!#$%&'*+/=?^_\`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_\`{|}~-]+)*)(?:(?:@${escapedDomain})|(?!.))`);
                    
                    if (emailRegex.test(user)) {
                        let strippedEmail = emailRegex.exec(user);
                        let lianeID = strippedEmail[1],
                            email = strippedEmail[1]+ "@" + emailDomain;

                        //console.log(lianeID, email);

                        db.query("SELECT * FROM users WHERE liane_ID = ?", email, (err, result) => {
                            if (!err) {
                                // Uživatel existuje
                                if (result.length === 1) {
                                    // Uživatel není přihlášeným uživatelem
                                    if (result[0].id !== userID) {

                                        db.query("UPDATE users SET role = ? WHERE id = ?", [role, result[0].id], (err) => {
                                            if (!err) {
                                                // Pokud je původní role assistant nebo admin a novou rolí je parent, odstranit nastavené volné časy asistenta (důvodem je zrychlení načítání při MySQL requestech, kdy volné časy není nutné skladovat)
                                                if ((result[0].role === "assistant" || result[0].role === "admin") && role === "parent") {
                                                    db.query("DELETE FROM available_times WHERE user_id = ?", user, (err, result) => {
                                                        if (err) console.error("Nepovedlo se vyčistit dostupné časy bývalého asistenta", err);
                                                    });
                                                }

                                                res.send(JSON.stringify({confirmed: true}));
                                            } else res.send(JSON.stringify({error: "Nepovedlo se nastavit uživateli roli. Chyba při zápisu do databáze"}));
                                        });
                                    } else res.send(JSON.stringify({error: "Nepovedlo se nastavit uživateli roli. Sám sobě nelze z bezpečnostních důvodů roli měnit"}));
                                } else if (result.length > 1) { // V databázi je více jak jeden uživatel
                                    res.send(JSON.stringify({error: "Nepovedlo se nastavit uživateli roli. V databázi se nachází více uživatelů se stejnou emailovou adresou. Kontaktujte administrátora"}));
                                } else { // V databázi uživatel s daným emailem neexistuje, zkontrolovat platnost Emailové adresy a připravit uživateli roli, která bude po jeho prvním přihlášení ihned přidělena

                                    db.query("INSERT INTO users (liane_ID, role) VALUES (?, ?)", [email, role], (err, result) => {
                                        if (!err) {
                                            res.send(JSON.stringify({confirmed: true}));
                                        } else res.send(JSON.stringify({error: "Nepovedlo se připravit uživatele s rolí. Chyba při zápisu do databáze"}));
                                    });
                                }
                            } else res.send(JSON.stringify({error: "Nepovedlo se nastavit uživateli roli. Chyba při čtení databáze"}));
                        });
                    } else res.send(JSON.stringify({error: "Nepovedlo se nastavit uživateli roli. Email není platný email TUL"}));
                } else res.send(JSON.stringify({error: "Nepovedlo se nastavit uživateli roli. Neznámá typ dat"}));
            } else res.send(JSON.stringify({error: "Nepovedlo se nastavit uživateli roli. Nebyla dodána potřebná data nebo byla zadána neznámá role"}));
        } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro nastavení role uživatele. Přihlaste se a zkuste to znovu."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro nastavení role uživatele musíte být přihlášen. Přihlaste se a zkuste to znovu."}));

});

/**
 * Export měsíce a roku do CSV
 */
router.get('/getcsv', async (req, res) => {
    if (req.session.loggedin) {
        //let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});
        let userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        // Kontrola oprávnění
        if (userRole === "admin") {
            let year = xss(req.query.year),
                month = xss(req.query.month);

            if (year !== "" && month !== "") {
                db.query("SELECT child_reservations.id AS 'ID rezervace',\n" +
                    "       child_reservations.child_id AS 'ID dítěte',\n" +
                    "       children.name AS 'Jméno dítěte',\n" +
                    "       children.surname AS 'Příjmení dítěte',\n" +
                    "       parents.id AS 'ID rodiče',\n" +
                    "       parents.name AS 'Jméno rodiče',\n" +
                    "       parents.surname AS 'Příjmení rodiče',\n" +
                    "       parents.liane_ID AS 'Email rodiče',\n" +
                    "       assistants.id AS 'ID asistenta',\n" +
                    "       assistants.name AS 'Jméno asistenta',\n" +
                    "       assistants.surname AS 'Příjmení asistenta',\n" +
                    "       assistants.liane_ID AS 'Email asistenta',\n" +
                    "       child_reservations.time_from AS 'Začátek rezervace',\n" +
                    "       child_reservations.time_to AS 'Konec rezervace',\n" +
                    "       TIMESTAMPDIFF(MINUTE, child_reservations.time_from, child_reservations.time_to) AS 'Odhlídané minuty',\n" +
                    "       CEILING(TIMESTAMPDIFF(MINUTE, child_reservations.time_from, child_reservations.time_to) / 60) AS 'Započaté hodiny',\n" +
                    "       CEILING(TIMESTAMPDIFF(MINUTE, child_reservations.time_from, child_reservations.time_to) / 60) * (SELECT settings.value FROM settings WHERE settings.setting = 'price') AS 'Cena za započaté hodiny'\n" +
                    "FROM child_reservations, children, users AS assistants, users AS parents\n" +
                    "WHERE child_reservations.child_id = children.id\n" +
                    "AND children.user_id = parents.id\n" +
                    "AND child_reservations.user_id = assistants.id\n" +
                    "AND YEAR(child_reservations.time_from) = ?\n" +
                    "AND MONTH(child_reservations.time_from) = ?", [year, month], (err, result) => {
                    if (!err) {
                        try {
                            const parser = new json2csv.Parser();
                            const csv = "\ufeff" + parser.parse(result); //S BOM kvůli importu Excelu

                            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                            res.setHeader('Content-disposition','attachment; filename=' + year + '_' + month + '.csv');
                            res.send(csv);

                        } catch (err) {
                            console.error(err);
                            res.send(JSON.stringify({error: "Nepovedlo se získat data v CSV. Chyba při konverzi do CSV."}));
                        }

                        //res.send(JSON.stringify({confirmed: true}));
                    } else res.send(JSON.stringify({error: "Nepovedlo se získat data v CSV. Chyba při čtení databáze."}));
                });
            } else res.send(JSON.stringify({error: "Nepovedlo se získat data v CSV. Nebyla dodána potřebná data."}));
        } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro export CSV. Přihlaste se a zkuste to znovu."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro export CSV musíte být přihlášen. Přihlaste se a zkuste to znovu."}));

});

/**
 * Nastavení ceny hlídání
 */
router.post('/setprice', async (req, res) => {
    if (req.session.loggedin) {
        //let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});
        let userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        // Kontrola oprávnění
        if (userRole === "admin") {
            let price = xss(req.body.price);
            if (price !== "") {
                db.query("UPDATE settings SET value = ? WHERE setting = ?", [price, "price"], (err, result) => {
                    if (!err) {
                        res.send(JSON.stringify({confirmed: true}));
                    } else res.send(JSON.stringify({error: "Nepovedlo se nastavit cenu za hodinu hlídání. Chyba při zápisu do databáze."}));
                });
            } else res.send(JSON.stringify({error: "Nepovedlo se nastavit cenu za hodinu hlídání. Nebyla dodána potřebná data."}));
        } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro nastavení ceny za hodinu hlídání. Přihlaste se a zkuste to znovu."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro nastavení ceny za hodinu hlídání musíte být přihlášen. Přihlaste se a zkuste to znovu."}));

});

/**
 * Nastavení Aktuálních informací
 */
router.post('/setinfo', async (req, res) => {
    if (req.session.loggedin) {
        //let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});
        let userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        // Kontrola oprávnění
        if (userRole === "admin") {
            let infoText = xss(req.body.infotext);
            db.query("UPDATE settings SET value = ? WHERE setting = ?", [infoText, "current_info"], (err, result) => {
                if (!err) {
                    res.send(JSON.stringify({confirmed: true}));
                } else res.send(JSON.stringify({error: "Nepovedlo se nastavit text Aktuálních informací. Chyba při zápisu do databáze."}));
            });
        } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro nastavení textu Aktuálních informací. Přihlaste se a zkuste to znovu."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro nastavení textu Aktuálních informací musíte být přihlášen. Přihlaste se a zkuste to znovu."}));

});

/**
 * Nastavení Alertu
 */
router.post('/setalert', async (req, res) => {
    if (req.session.loggedin) {
        //let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});
        let userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        // Kontrola oprávnění
        if (userRole === "admin") {
            let show = xss(req.body.show),
                color = xss(req.body.color),
                alertHeader = xss(req.body.alertheader),
                alertText = xss(req.body.alerttext);

            if ((show === "true" || show === "false") && ["success", "danger", "warning", "info", "secondary", "dark"].indexOf(color) >= 0) {
                db.query("UPDATE settings SET value = ? WHERE setting = ?;" +
                    "UPDATE settings SET value = ? WHERE setting = ?;" +
                    "UPDATE settings SET value = ? WHERE setting = ?;" +
                    "UPDATE settings SET value = ? WHERE setting = ?;", [show, "alert_enable", color, "alert_type", alertHeader, "alert_header", alertText, "alert_text"], (err, results) => {
                    if (!err) {
                        res.send(JSON.stringify({confirmed: true}));
                    } else res.send(JSON.stringify({error: "Nepovedlo se nastavit text Alertu. Chyba při zápisu do databáze."}));
                });
            } else res.send(JSON.stringify({error: "Nepovedlo se nastavit text Alertu. Byla zadána neplatná data pro parametry alertu"}));
        } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro nastavení textu Alertu. Přihlaste se a zkuste to znovu."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro nastavení textu Alertu musíte být přihlášen. Přihlaste se a zkuste to znovu."}));

});

module.exports = router;
