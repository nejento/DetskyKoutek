const express = require('express');
const db = require('../db');
const xss = require("xss");
const helpers = require('../helpers');
let router = express.Router();

const getMonths = (userID, year) => {
    return new Promise(resolve => {
        db.query("SELECT DISTINCT MONTH(child_reservations.time_from) AS months FROM child_reservations, children\n" +
            "WHERE child_reservations.child_id = children.id\n" +
            "AND children.user_id = ?\n" +
            "AND YEAR(child_reservations.time_from) = ?", [userID, year], (err, result) => {
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
getTable = (year, month, userID) => {
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
            "AND parentID = ?\n" +
            "ORDER BY time_from", [year, month, userID], (err, result) => {
            if (!err) {

                let parentTable = {
                    reservations: [],
                    timeSum: 0, //Počet odhlídaných minut
                    startedHours: 0 //Počet započatých hodin
                };

                for (let i = 0; i < result.length; i++) {
                    const reservation = result[i];

                    let reservationOfParent = {
                            reservationID: reservation.id,
                            childID: reservation.child_id,
                            childrenName: reservation.childName + " " + reservation.childSurname,
                            timeFrom: new Date(reservation.time_from).toISOString(),
                            timeTo: new Date(reservation.time_to).toISOString()
                        },
                        timeDiff = new Date(reservation.time_to) - new Date(reservation.time_from),
                        duration =  timeDiff / 60000; //Doba v minutách

                    parentTable.reservations.push(reservationOfParent);
                    parentTable.timeSum += duration;
                    parentTable.startedHours += Math.ceil(duration / 60);
                }

                resolve(parentTable);
            }
        });
    });
};

router.get('/', async (req, res) => {
    if (req.session.loggedin) {
        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");}),
            userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        let yearRequest = xss(req.query.year),
            monthRequest = xss(req.query.month);

        db.query('SELECT * FROM children WHERE children.user_id IN (SELECT users.id FROM users WHERE users.id = ?)', userID, (err, result) => {
            if (!err) {
                if (result.length > 0) { // Pokud má uživatel definované děti
                    db.query("SELECT child_reservations.*, IF(DATE_FORMAT(child_reservations.time_from, '%Y-%m-%d') = CURDATE(), IF(child_reservations.user_id IS NULL, TRUE, FALSE), TRUE) AS removable, users.name, users.id AS userID, users.name AS name, users.surname AS surname FROM child_reservations, users\n" +
                        "WHERE users.id = child_reservations.user_id\n" +
                        "AND child_reservations.child_id IN (\n" +
                        "   SELECT children.id FROM children\n" +
                        "   WHERE children.user_id = ?\n" +
                        ")\n" +
                        "AND child_reservations.time_from >= CURDATE()\n" +
                        "ORDER BY child_reservations.time_from;" +
                        "SELECT DISTINCT YEAR(child_reservations.time_from) AS years FROM child_reservations, children\n" +
                        "WHERE child_reservations.child_id = children.id\n" +
                        "AND children.user_id = ?;\n" +
                        "SELECT * FROM settings;", [userID, userID], async (err, results) => {
                        if (!err) {
                            let table,
                                years = [],
                                months = [],
                                year,
                                month,
                                settings = Object.assign({}, ...(results[2].map(s => ({ [s.setting]: s.value }) )));

                            if (results[1].length > 0) {
                                for (let i = 0; i < results[1].length; i++) {
                                    years.push(results[1][i].years);
                                }

                                if (yearRequest !== "") {
                                    year = yearRequest;
                                } else year = results[1][0].years

                                months = await getMonths(userID, year);

                                if (monthRequest !== "") {
                                    month = monthRequest;
                                } else month = months[0];

                                table = await getTable(year, month, userID);
                            }

                            res.render('overview', {
                                title: 'Přehled',
                                activeNavbar: "prehled",
                                role: userRole,
                                name: req.session.name,
                                surname: req.session.surname,
                                deti: result,
                                years: years,
                                months: months,
                                year: year,
                                month: month,
                                rezervace: results[0],
                                table: table,
                                price: settings.price
                            });

                        } else {
                            console.log(err);
                            res.status(406);
                            res.send("Error: Nepodařilo se získat aktuálně vytvořené rezervace, prosím kontaktujte správce aplikace");
                        }
                    });
                } else res.redirect('/user/children');  // Uživatel nemá definované děti

            } else {
                console.log(err);
                res.status(406);
                res.send("Error: Nepodařilo se získat vytvořené děti z databáze, prosím kontaktujte správce aplikace");
            }
        });

    } else res.redirect('/auth/login'); // Uživatel není přihlášen, nemá roli parent, převeden na přihlašování

});

/**
 * Získání měsíců daného roku
 */
router.post('/getmonths', async (req, res) => {
    if (req.session.loggedin) {
        let userID = await helpers.getUserID(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});
        //let userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        let year = xss(req.body.year);
        if (year !== "") {
            res.json({months: await getMonths(userID, year)});
        } else res.json({error: "Nepovedlo se získat měsíce daného roku. Nebyla dodána potřebná data."});

    } else res.status(403).json({error: "Forbidden: Pro zobrazení časů musíte být přihlášen. Přihlaste se a zkuste to znovu."});
});

module.exports = router;
