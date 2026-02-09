const mysql = require('mysql');
const settings = require('./settings.json');

let connection = mysql.createConnection({
    multipleStatements: true,
    host: settings.mysql_host,
    user: settings.mysql_user,
    password: settings.mysql_pass,
    database: settings.mysql_database
});

connection.connect((err) => {
    if (err) throw err;
});

module.exports = connection;