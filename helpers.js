const db = require('./db')

const helpers = module.exports = {
    getUserID: (lianeID) => {
        return new Promise((resolve, reject) => {
            db.query('SELECT id FROM users WHERE users.liane_ID = ?', lianeID, (err, result) => {
                if (!err) {
                    if (result.length === 1) { // Pokud uživatel v databázi existuje (pokud existuje více uživatelů = chyba)
                        resolve(result[0].id);
                    } else {
                        reject("Error: V databázi došlo k neshodě údajů, prosím kontaktujte správce aplikace"); //V databázi je více uživatelů se stejným lianeID
                    }
                } else {
                    reject("Error: Nepodařilo se získat vytvořené děti z databáze, prosím kontaktujte správce aplikace");
                }
            });
        });
    },
    getRole: (lianeID) => {
        return new Promise((resolve, reject) => {
            db.query('SELECT role FROM users WHERE users.liane_ID = ?', lianeID, (err, result) => {
                if (!err) {
                    if (result.length === 1) { // Pokud uživatel v databázi existuje (pokud existuje více uživatelů = chyba)
                        resolve(result[0].role);
                    } else if (result.length > 1) {
                        reject("Error: V databázi došlo k neshodě údajů, prosím kontaktujte správce aplikace"); //V databázi je více uživatelů se stejným lianeID
                    } else {
                        resolve("");
                    }
                } else {
                    reject("Error: Nepodařilo se získat vytvořené děti z databáze, prosím kontaktujte správce aplikace");
                }
            });
        });
    },
    getContact: (lianeID) => {
        return new Promise((resolve, reject) => {
            db.query('SELECT contact FROM users WHERE users.liane_ID = ?', lianeID, (err, result) => {
                if (!err) {
                    if (result.length === 1) { // Pokud uživatel v databázi existuje (pokud existuje více uživatelů = chyba)
                        resolve(result[0].contact);
                    } else {
                        resolve("");
                    }
                } else {
                    reject("Error: Nepodařilo se získat kontakt, prosím kontaktujte správce aplikace");
                }
            });
        });
    },
    /**
     * Funkce zkontroluje, zdali začátek a konec rozvrhové akce asistenta, je v rámci nastavených otevíracích dobách dětského koutku
     * @param eventStart {Date} Datum s časem začátku rozvrhové akce
     * @param eventEnd {Date} Datum s časem koncem rozvrhové akce
     * @returns {boolean} True, pokud je čas v platném omezení
     */
    checkConstraints: (eventStart, eventEnd) => {
        let openingTime = new Date().setHours(7, 0),
            closingTime = new Date().setHours(18, 0);

        return (eventStart.getDate() === eventEnd.getDate() &&
            eventStart.getMonth() === eventEnd.getMonth() &&
            eventStart.getFullYear() === eventEnd.getFullYear() &&
            eventStart.getDay() !== 0 &&
            new Date().setHours(eventStart.getHours(), eventStart.getMinutes()) >= openingTime &&
            new Date().setHours(eventEnd.getHours(), eventEnd.getMinutes()) <= closingTime);
    }
};