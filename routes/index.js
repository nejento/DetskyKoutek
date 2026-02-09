const express = require('express');
const db = require('../db');
const showdown = require('showdown');
const helpers = require('../helpers');

let router = express.Router();

/* GET home page. */
router.get('/', async (req, res) => {
    if (req.session.loggedin) {
        let userRole = await helpers.getRole(req.session.userid).catch(() => {res.status(406); res.send("Forbidden: Nepovedlo se ověřit uživatele. Přihlaste se a zkuste to znovu.");});

        db.query("SELECT * FROM settings", (err, result) => {
            if (!err) {
                let settings = Object.assign({}, ...(result.map(s => ({ [s.setting]: s.value }) ))),
                    converter = new showdown.Converter(),
                    alertHTML = converter.makeHtml(settings.alert_text),
                    infoHTML = converter.makeHtml(settings.current_info);

                res.render('index', {
                    title: "Vítejte",
                    role: userRole,
                    name: req.session.name,
                    surname: req.session.surname,
                    activeNavbar: "domu",
                    alertEnable: settings.alert_enable === "true",
                    alertColor: settings.alert_type,
                    alertHeader: settings.alert_header,
                    alertText: alertHTML,
                    currentInfo: infoHTML
                });

            } else {
                res.render('index', {
                    title: "Vítejte",
                    role: userRole,
                    name: req.session.name,
                    surname: req.session.surname,
                    activeNavbar: "domu"
                });
            }
        });
    } else {
        db.query("SELECT * FROM settings", (err, result) => {
            if (!err) {
                let settings = Object.assign({}, ...(result.map(s => ({ [s.setting]: s.value }) ))),
                    converter = new showdown.Converter(),
                    alertHTML = converter.makeHtml(settings.alert_text),
                    infoHTML = converter.makeHtml(settings.current_info);

                res.render('index', {
                    title: "Vítejte",
                    activeNavbar: "domu",
                    alertEnable: settings.alert_enable === "true",
                    alertColor: settings.alert_type,
                    alertHeader: settings.alert_header,
                    alertText: alertHTML,
                    currentInfo: infoHTML
                });

            } else {
                res.render('index', {
                    title: "Vítejte",
                    //role: userRole,
                    activeNavbar: "domu"
                });
            }
        });

    }

});

module.exports = router;