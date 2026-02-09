const express = require('express');
const db = require('../db');
const xss = require("xss");
const nodemailer = require('nodemailer');
const helpers = require('../helpers');
const settings = require('../settings.json')
const transporter = nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
});
let router = express.Router();

const getAvailableAssistants = async (timeStart, timeEnd) => {
        const absolutniPrunik = () => {
            return new Promise((resolve, reject) => {
                db.query('SELECT * FROM available_times\n' +
                    'INNER JOIN users ON available_times.user_id = users.id\n' +
                    'WHERE time_from <= ?\n' +
                    'AND time_to >= ?', [timeStart, timeEnd], (err, result) => {
                    if (!err) {
                        // Chůvy s absolutním průnikem termínů = 100% mohou hlídat
                        //console.log("timestart", timeStart, "timeEnd", timeEnd, "result", result);
                        resolve(result);
                    } else reject("Error! Nastala chyba při zjišťování dostupných asistentů");
                    });
                });
            },
            prunikDne = () => {
                return new Promise((resolve, reject) => {
                    db.query('SELECT * FROM available_times\n' +
                        'INNER JOIN users ON available_times.user_id = users.id\n' +
                        'WHERE YEAR(time_from) = YEAR(?)\n' +
                        'AND MONTH(time_from) = MONTH(?)\n' +
                        'AND DAY(time_from) = DAY(?)', [timeStart, timeStart, timeStart], (err, result) => {
                        if (!err) {
                            // Chůva s průnikem dne - chůva v tento den hlídá, ale nemá absolutní průnik
                            resolve(result);
                        } else reject("Error! Nastala chyba při zjišťování dostupných asistentů");
                    });
                });
            },
            prunikOpakujicichTerminu = () => {
                return new Promise((resolve, reject) => {
                    db.query('SELECT * FROM available_times\n' +
                        'INNER JOIN users ON available_times.user_id = users.id\n' +
                        'WHERE available_times.repeating_from <= ?\n' +
                        'AND available_times.repeating_to >= ?', [timeStart, timeEnd], (err, result) => {
                        if (!err) {
                            let assistantList = {
                                    absolute: [],
                                    sameDay: []
                                };

                            // Iteruji nad možnými asistenty
                            for (let i = 0; i < result.length; i++) {
                                const asistent = result[i],
                                    asistentTimeFrom = new Date(result[i].time_from),
                                    asistentTimeTo = new Date(result[i].time_to),
                                    asistentRepeatingFrom = new Date(result[i].repeating_from),
                                    asistentRepeatingTo = new Date(result[i].repeating_to);

                                //console.log(0, asistentTimeFrom, result[i].repeating_from, asistentRepeatingFrom, timeStart, timeEnd, asistentRepeatingTo, result[i].repeating_to);

                                let absoluteFound = false;

                                // Postupně, týden po týdnu, jdeme dozadu od nastaveného data s časem do počátku opakování termínu chůvy a kontrolujeme průnik s datem
                                for (let tFrom = new Date(asistentTimeFrom), tTo = new Date(asistentTimeTo); tFrom >= asistentRepeatingFrom; tFrom.setUTCDate(tFrom.getUTCDate() - 7), tTo.setUTCDate(tTo.getUTCDate() - 7)) {
                                    //console.log(1, asistentRepeatingFrom, tFrom, tTo, asistentRepeatingTo, tFrom <= timeStart, tTo >= timeEnd, tFrom <= timeStart && tTo >= timeEnd);
                                    if (tFrom <= timeStart && tTo >= timeEnd) {
                                        // Chůva s absolutním průnikem času
                                        assistantList.absolute.push(asistent);
                                        absoluteFound = true; //Zrychlení vyhledávání
                                        break;
                                    } else if (timeStart.getUTCDate() === tFrom.getUTCDate() && timeStart.getUTCMonth() === tFrom.getUTCMonth() && timeStart.getUTCFullYear() === tFrom.getUTCFullYear()) {
                                        // Chůva s průnikem dne - chůva v tento den hlídá, ale nemá absolutní průnik
                                        assistantList.sameDay.push(asistent);
                                    }
                                }

                                if (!absoluteFound) { //Pokud jsme již absolutní shodu našli, není potřeba dále vyhledávat
                                    let startingtFrom = new Date(new Date(asistentTimeFrom).setUTCDate(new Date(asistentTimeFrom).getUTCDate() + 7)),
                                        startingtTo = new Date(new Date(asistentTimeFrom).setUTCDate(new Date(asistentTimeTo).getUTCDate() + 7))

                                    // Postupně, týden po týdnu, jdeme dopředu od nastaveného data s časem do počátku opakování termínu chůvy a kontrolujeme průnik s datem (začínáme o týden později, protože startovní týden zkontroloval předchozí for)
                                    for (let tFrom = startingtFrom, tTo = startingtTo; tFrom <= asistentRepeatingTo; tFrom.setDate(tFrom.getUTCDate() + 7), tTo.setUTCDate(tTo.getUTCDate() + 7)) {
                                        //console.log(2, asistentRepeatingFrom, tFrom, tTo, asistentRepeatingTo, tFrom <= timeStart, tTo >= timeEnd, tFrom <= timeStart && tTo >= timeEnd);
                                        if (tFrom <= timeStart && tTo >= timeEnd) {
                                            // Chůva s absolutním průnikem času
                                            assistantList.absolute.push(asistent);
                                            break;
                                        } else if (timeStart.getUTCDate() === tFrom.getUTCDate() && timeStart.getUTCMonth() === tFrom.getUTCMonth() && timeStart.getUTCFullYear() === tFrom.getUTCFullYear()) {
                                            // Chůva s průnikem dne - chůva v tento den hlídá, ale nemá absolutní průnik
                                            assistantList.sameDay.push(asistent);
                                        }
                                    }
                                }


                            }
                            resolve(assistantList);

                        } else reject("Error! Nastala chyba při zjišťování dostupných asistentů");
                    });
                });
            },
            allAssistants = () => {
                return new Promise((resolve, reject) => {
                    db.query("SELECT id AS user_id, liane_ID, role, name, surname, contact FROM users WHERE role = 'assistant'", (err, result) => {
                        if (!err) {
                            // Všechny chůvy
                            //console.log(result);
                            resolve(result);
                        } else reject("Error! Nastala chyba při zjišťování všech asistentů");
                    });
                });
            };

        let finalOutput = {
                absolute: [],
                sameDay: [],
                other: []
            },
            list1 = await absolutniPrunik(),
            list2 = await prunikOpakujicichTerminu(),
            list3 = await prunikDne(),
            list4 = await allAssistants();


        //console.log("all lists", list1, list2, list3);
        for (let i = 0; i < list1.length; i++) {
            if (finalOutput.absolute.filter(a => a.user_id === list1[i].user_id).length === 0) finalOutput.absolute.push(list1[i]);
        }

        for (let i = 0; i < list2.absolute.length; i++) {
            if (finalOutput.absolute.filter(a => a.user_id === list2.absolute[i].user_id).length === 0) finalOutput.absolute.push(list2.absolute[i]);
        }

        for (let i = 0; i < list2.sameDay.length; i++) {
            if (finalOutput.absolute.filter(a => a.user_id === list2.sameDay[i].user_id).length === 0 &&
                finalOutput.sameDay.filter(a => a.user_id === list2.sameDay[i].user_id).length === 0) finalOutput.sameDay.push(list2.sameDay[i]);
        }

        for (let i = 0; i < list3.length; i++) {
            if (finalOutput.absolute.filter(a => a.user_id === list3[i].user_id).length === 0 &&
                finalOutput.sameDay.filter(a => a.user_id === list3[i].user_id).length === 0) finalOutput.sameDay.push(list3[i]);
        }

        for (let i = 0; i < list4.length; i++) {
            if (finalOutput.absolute.filter(a => a.user_id === list4[i].user_id).length === 0 &&
                finalOutput.sameDay.filter(a => a.user_id === list4[i].user_id).length === 0 &&
                finalOutput.other.filter(a => a.user_id === list4[i].user_id).length === 0) finalOutput.other.push(list4[i]);
        }

        return finalOutput;
    },
    prepareAssistents = (result) => {
        return new Promise(async resolve => {
            let output = []
            if (result.length > 0) {
                for (let i = 0; i < result.length; i++) {
                    const reservationStart = new Date(result[i].time_from),
                        reservationEnd = new Date(result[i].time_to);

                    let names = await getAvailableAssistants(reservationStart, reservationEnd),
                        reservation = {
                            reservationID: result[i].id,
                            reservationStart: reservationStart.toISOString(),
                            reservationEnd: reservationEnd.toISOString(),
                            childName: result[i].childName,
                            childSurname: result[i].childSurname,
                            childBirthdate: new Date(result[i].birthdate).toISOString(),
                            childParentNote: result[i].parent_note,
                            childStaffNote: result[i].staff_note,
                            parentName: result[i].name,
                            parentSurname: result[i].surname,
                            parentContact: result[i].contact,
                            availableAssistants: names,
                            selectedAssistant: result[i].user_id
                        };
                    output.push(reservation);
                }
            }
            resolve(output);
        });
    };

/**
 * Zpracování zobrazení stránky pro administrátory ke správě rezervací
 */
router.get('/', async (req, res) => {
    if (req.session.loggedin) {
        //let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});
        let userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        // Kontrola oprávnění
        if (userRole === "admin") {

            db.query('SELECT * FROM child_reservations\n' +
                'INNER JOIN (\n' +
                '    SELECT children.id AS childID, children.user_id AS parentID, children.name AS childName, children.surname AS childSurname, children.birthdate, children.parent_note, children.staff_note, children.coefficient FROM children\n' +
                ') children ON child_reservations.child_id = children.childID\n' +
                'INNER JOIN (\n' +
                '    SELECT users.id AS userID, users.name, users.surname, users.contact FROM users\n' +
                ') users ON children.parentID = users.userID\n' +
                'WHERE child_reservations.user_id IS NULL\n' +
                'ORDER BY child_reservations.time_from;' +
                "SELECT * FROM users WHERE (role = 'assistant' OR role = 'admin');" +
                "SELECT * FROM child_reservations\n" +
                "INNER JOIN (\n" +
                "    SELECT children.id AS childID, children.user_id AS parentID, children.name AS childName, children.surname AS childSurname, children.birthdate, children.parent_note, children.staff_note, children.coefficient FROM children\n" +
                ") children ON child_reservations.child_id = children.childID\n" +
                "INNER JOIN (\n" +
                "    SELECT users.id AS userID, users.name, users.surname, users.contact FROM users\n" +
                ") users ON children.parentID = users.userID\n" +
                "WHERE child_reservations.user_id IS NOT NULL\n" +
                "AND child_reservations.time_from >= CURDATE()\n" +
                "ORDER BY child_reservations.time_from", async (err, results) => {
                if (!err) {
                    res.render('manage', {
                        title: 'Správa rezervací',
                        role: userRole,
                        name: req.session.name,
                        surname: req.session.surname,
                        activeNavbar: "spravarezervaci",
                        reservations: await prepareAssistents(results[0]),
                        assistants: results[1],
                        confirmedReservations: await prepareAssistents(results[2])
                    });
                } else {
                    console.log(err);
                    res.status(406);
                    res.send("Error: Nepodařilo se získat rezervace z databáze, prosím kontaktujte správce aplikace");
                }
            });

        } else res.redirect('/user'); // Uživatel není správce, převeden na Přehled
    } else res.redirect('/auth/login'); // Uživatel není přihlášen, převeden na Přihlášení

});

/**
 * Zpracování přidání asistenta k termínu
 */
router.post('/updatereservation', async (req, res) => {
    if (req.session.loggedin) {
        //let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});
        let userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        // Kontrola oprávnění
        if (userRole === "admin") {

            let reservationID = xss(req.body.reservationid),
                assistantID = xss(req.body.assistantid),
                staffNote = xss(req.body.staffnote),
                cancelConfirmation = xss(req.body.cancelconfirmation);

            if (reservationID !== "" && (assistantID !== "" || cancelConfirmation !== "")) {
                if (cancelConfirmation === "true") {
                    db.query("SELECT * FROM child_reservations WHERE id = ?", reservationID, (err, result) => {
                        if (!err && result.length === 1) {
                            let childrenID = result[0].child_id,
                                startTime = new Date(result[0].time_from),
                                endTime = new Date(result[0].time_to),
                                options = { month: 'numeric', day: 'numeric', year: 'numeric'},
                                zacatek = startTime.toLocaleString('cs-CZ', options),
                                konec = endTime.toLocaleTimeString('cs-CZ', options);
                            db.query("UPDATE child_reservations SET user_id = ? WHERE id = ?; UPDATE children SET staff_note = ? WHERE id = ?;", [null, reservationID, staffNote, childrenID], (err, result) => {
                                if (!err) {
                                    res.send(JSON.stringify({confirmed: true}));

                                    //Odeslání mailu
                                    db.query("SELECT users.*, children.name AS childName, children.surname AS childSurname FROM users, children\n" +
                                        "WHERE children.user_id = users.id\n" +
                                        "AND children.id = ?", childrenID, (err, result) => {
                                        if (!err) {
                                            console.log("Sending mail about cancellation from " + settings.mailFrom + " to " + result[0].liane_ID);
                                            transporter.sendMail({
                                                from: settings.mailFrom,
                                                to: result[0].liane_ID,
                                                subject: 'Dětský koutek TUL - Rezervace byla zrušena',
                                                text: `Dobrý den!\nV dětském koutku jsme právě ZRUŠILI rezervaci pro ${result[0].childName} ${result[0].childSurname}. \nRezervace byla na čas ${zacatek} - ${konec}\n`
                                            }, (err, info) => {
                                                console.log(info);
                                                //console.log(err);
                                            });
                                        }
                                    });

                                } else res.send(JSON.stringify({error: "Rezervaci se nepovedlo potvrdit. Chyba při zápisu do databáze."}));
                            });
                        } else res.send(JSON.stringify({error: "Rezervaci se nepovedlo potvrdit. Chyba při čtení databáze nebo zvolená rezervace nebo asistent neexistují."}));
                    });
                } else {
                    db.query("SELECT * FROM child_reservations WHERE id = ?; SELECT * FROM users WHERE id = ? AND (role = 'assistant' OR role = 'admin');", [reservationID, assistantID], (err, results) => {
                        if (!err && results[0].length === 1 && results[1].length > 0) {
                            let childrenID = results[0][0].child_id,
                                startTime = new Date(results[0][0].time_from),
                                endTime = new Date(results[0][0].time_to),
                                options = { month: 'numeric', day: 'numeric', year: 'numeric'},
                                zacatek = startTime.toLocaleString('cs-CZ', options),
                                konec = endTime.toLocaleTimeString('cs-CZ', options);
                            db.query("UPDATE child_reservations SET user_id = ? WHERE id = ?; UPDATE children SET staff_note = ? WHERE id = ?;", [assistantID, reservationID, staffNote, childrenID], (err, result) => {
                                if (!err) {
                                    res.send(JSON.stringify({confirmed: true}));

                                    //Odeslání mailu
                                    db.query("SELECT users.*, children.name AS childName, children.surname AS childSurname FROM users, children\n" +
                                        "WHERE children.user_id = users.id\n" +
                                        "AND children.id = ?", childrenID, (err, result) => {
                                        if (!err) {
                                            console.log("Sending mail from " + settings.mailFrom + " to " + result[0].liane_ID);
                                            transporter.sendMail({
                                                from: settings.mailFrom,
                                                to: result[0].liane_ID,
                                                subject: 'Dětský koutek TUL - Rezervace potvrzena',
                                                text: `Dobrý den!\nV dětském koutku jsme právě potvrdili rezervaci pro ${result[0].childName} ${result[0].childSurname}. \nRezervace je na čas ${zacatek} - ${konec}\n`
                                            }, (err, info) => {
                                                console.log(info);
                                                //console.log(err);
                                            });
                                        }
                                    });

                                } else res.send(JSON.stringify({error: "Rezervaci se nepovedlo potvrdit. Chyba při zápisu do databáze."}));
                            });
                        } else res.send(JSON.stringify({error: "Rezervaci se nepovedlo potvrdit. Chyba při čtení databáze nebo zvolená rezervace nebo asistent neexistují."}));
                    });
                }
            } else res.send(JSON.stringify({error: "Rezervaci se nepovedlo aktualizovat. Nebyla dodána potřebná data."}));

        } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro potvrzení rezervace. Přihlaste se jako správce a zkuste to znovu."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro potvrzení rezervace musíte být přihlášen. Přihlaste se a zkuste to znovu."}));

});

/**
 * Získání časů rezervací asistenta
 */
router.post('/getreservations', async (req, res) => {
    if (req.session.loggedin) {
        //let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});
        let userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        // Kontrola oprávnění
        if (userRole === "admin") {

            let assistantID = xss(req.body.assistantid);

            if (assistantID !== "") {
                db.query("SELECT * FROM child_reservations\n" +
                    "INNER JOIN (\n" +
                    "    SELECT children.id AS childID, children.name, children.surname FROM children\n" +
                    ") children ON children.childID = child_reservations.child_id\n" +
                    "WHERE child_reservations.user_id = ?", assistantID, (err, result) => {
                    if (!err) {
                        let outputEvents = [];
                        for (let i = 0; i < result.length; i++) {
                            outputEvents.push({
                                id: result[i].id,
                                startDate: new Date(result[i].time_from).toISOString(),
                                endDate: new Date(result[i].time_to).toISOString(),
                                repeating: false,
                                name: result[i].name,
                                surname: result[i].surname
                            });
                        }
                        res.send(JSON.stringify(outputEvents));

                    } else res.send(JSON.stringify({error: "Nepovedlo se získat časy asistentů. Chyba při čtení z databáze."}));
                });
            } else res.send(JSON.stringify({error: "Nepovedlo se získat časy asistentů. Nebyla dodána potřebná data."}));

        } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro zobrazení časů. Přihlaste se a zkuste to znovu."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro zobrazení časů musíte být přihlášen. Přihlaste se a zkuste to znovu."}));
});

/**
 * Odstranění rezervace
 */
router.post('/removereservation', async (req, res) => {
    if (req.session.loggedin) {
        //let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});
        let userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        // Kontrola oprávnění
        if (userRole === "admin") {
            let reservationID = xss(req.body.reservationid);

            if (reservationID !== "") {
                db.query("SELECT * FROM child_reservations WHERE child_reservations.id = ?", reservationID, (err, result) => {
                    if (!err && result.length === 1) {
                        db.query("DELETE FROM child_reservations WHERE child_reservations.id = ?", reservationID, (err, result) => {
                            if (!err) {
                                res.send(JSON.stringify({confirmed: true}));
                            } else res.send(JSON.stringify({error: "Nepovedlo se odstranit danou rezervaci. Chyba při zápisu do databáze."}));
                        });
                    } else res.send(JSON.stringify({error: "Nepovedlo se odstranit danou rezervaci. Chyba při čtení z databáze."}));
                });
            } else res.send(JSON.stringify({error: "Nepovedlo se odstranit danou rezervaci. Nebyla dodána potřebná data."}));
        } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro odstranění rezervace. Přihlaste se a zkuste to znovu."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro odstranění rezervace musíte být přihlášen. Přihlaste se a zkuste to znovu."}));
});


/**
 * Zpracování informací pro modal změny rezervace pro administrátory
 */
router.post('/geteditinfo', async (req, res) => {
    if (req.session.loggedin) {
        //let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});
        let userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        // Kontrola oprávnění
        if (userRole === "admin") {

            let reservationID = xss(req.body.reservationid);

            if (reservationID !== "") {
                db.query("SELECT * FROM child_reservations WHERE id = ?", reservationID, async (err, result) => {
                    if (!err && result.length === 1) {
                        let reservationStart = new Date(result[0].time_from),
                            reservationEnd = new Date(result[0].time_to),
                            availableAssistants = await getAvailableAssistants(reservationStart, reservationEnd),
                            reservation = {
                                reservationStart: reservationStart.toISOString(),
                                reservationEnd: reservationEnd.toISOString(),
                                availableAssistants: availableAssistants,
                                selectedAssistant: result[0].user_id
                            };
                        res.send(JSON.stringify(reservation));

                    } else res.send(JSON.stringify({error: "Nepovedlo se získat informace pro zobrazení úprav rezervace. Chyba při čtení databáze nebo zvolená rezervace nebo asistent neexistují."}));
                });
            } else res.send(JSON.stringify({error: "Nepovedlo se získat informace pro zobrazení úprav rezervace. Nebyla dodána potřebná data."}));
        } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro získání informací rezervace. Přihlaste se a zkuste to znovu."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro získání informací rezervace musíte být přihlášen. Přihlaste se a zkuste to znovu."}));
});

/**
 * Zpracování informací pro modal změny rezervace pro administrátory
 */
router.post('/admineditreservation', async (req, res) => {
    if (req.session.loggedin) {
        // let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");}),
        let userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        res.setHeader('Content-Type', 'application/json');

        // Kontrola oprávnění
        if (userRole === "admin") {

            let reservationID = xss(req.body.reservationid),
                assistantID = xss(req.body.assistantid),
                startDate = new Date(xss(req.body.startDate)),
                endDate = new Date(xss(req.body.endDate)),
                cancelConfirmation = xss(req.body.cancelconfirmation);

            if (reservationID !== "" && (assistantID !== "" || cancelConfirmation !== "") && req.body.startDate !== "" && req.body.endDate !== "") {
                if (cancelConfirmation === "true") {
                    db.query("SELECT * FROM child_reservations WHERE id = ?", reservationID, (err, result) => {
                        if (!err && result.length === 1) {
                            db.query("UPDATE child_reservations SET time_from = ?, time_to = ?, user_id = ? WHERE id = ?", [startDate, endDate, null, reservationID], (err, result) => {
                                if (!err) {
                                    res.send(JSON.stringify({confirmed: true}));
                                } else res.send(JSON.stringify({error: "Rezervaci se nepovedlo upravit. Chyba při zápisu do databáze."}));
                            });
                        } else res.send(JSON.stringify({error: "Rezervaci se nepovedlo upravit. Chyba při čtení databáze nebo zvolená rezervace nebo asistent neexistují."}));
                    });
                } else {
                    db.query("SELECT * FROM child_reservations WHERE id = ?; SELECT * FROM users WHERE id = ? AND (role = 'assistant' OR role = 'admin');", [reservationID, assistantID], (err, results) => {
                        if (!err && results[0].length === 1 && results[1].length > 0) {
                            db.query("UPDATE child_reservations SET time_from = ?, time_to = ?, user_id = ? WHERE id = ?", [startDate, endDate, assistantID, reservationID], (err, result) => {
                                if (!err) {
                                    res.send(JSON.stringify({confirmed: true}));
                                } else res.send(JSON.stringify({error: "Rezervaci se nepovedlo upravit. Chyba při zápisu do databáze."}));
                            });
                        } else res.send(JSON.stringify({error: "Rezervaci se nepovedlo potvrdit. Chyba při čtení databáze nebo zvolená rezervace nebo asistent neexistují."}));
                    });
                }
            } else res.send(JSON.stringify({error: "Rezervaci se nepovedlo upravit. Nebyla dodána potřebná data."}));

        } else res.send(JSON.stringify({error: "Forbidden: Nedostatečné oprávnění pro získání informací rezervace. Přihlaste se a zkuste to znovu."}));
    } else res.send(JSON.stringify({error: "Forbidden: Pro získání informací rezervace musíte být přihlášen. Přihlaste se a zkuste to znovu."}));
});


module.exports = router;
