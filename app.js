const createError = require('http-errors');
const express = require('express');
const session = require('express-session');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const settings = require('./settings.json')

/**
 * Definice routerů - souborů dále zpracovávající
 */
let indexRouter = require('./routes/index'),
    userRouter = require('./routes/user'),
    childrenRouter = require('./routes/children'),
    reservationsRouter = require('./routes/reservations'),
    staffRouter = require('./routes/staff'),
    manageRouter = require('./routes/manage'),
    adminRouter = require('./routes/admin'),
    authRouter = require('./routes/auth');

// Inicializace Express.js
let app = express();

/**
 * Definování cesty pro vybrání dynamicky generovaných .html souborů
 */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(compression());
app.use(helmet());
app.use(session({
    secret: settings.sessionSecret,
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: true,
        sameSite: "strict",
    }
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


/**
 * Definování cesty pro základní styly a nástroje pro web jako Bootstrap a jQuery
 */
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist/')); //Bootstrap
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/')); //jQuery
app.use('/bootstrap-datepicker', express.static(__dirname + '/node_modules/bootstrap-datepicker/dist/')); //Bootstrap Datepicker
app.use('/fontawesome', express.static(__dirname + '/node_modules/@fortawesome/fontawesome-free')); //Font Awesome
app.use('/fullcalendar', express.static(__dirname + '/node_modules/fullcalendar')); //FullCalendar
app.use('/simplemde', express.static(__dirname + '/node_modules/simplemde/dist')); //SimpleMDE

/**
 * Definování cesty pro základní soubory webu, jako jsou images, javascripts, stylesheets
 */
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Make settings available to all templates
 */
app.use((req, res, next) => {
    res.locals.settings = settings;
    next();
});

/**
 * Zpracování definovaných cest adresy a předání jednotlivým routerům
 */
app.use('/', indexRouter);
app.use('/user', userRouter);
app.use('/user/children', childrenRouter);
app.use('/user/reservations', reservationsRouter);
app.use('/staff', staffRouter);
app.use('/admin/manage', manageRouter);
app.use('/admin', adminRouter);
app.use('/auth', authRouter);

/**
 * Zachycení 404 a předání error handleru
 */
app.use((req, res, next) => {
    // respond with html page
    if (req.accepts('html')) {
        res.render('error', {
            title: 'Chyba',
            status: "404",
            message: "Stránka " + req.url + " nebyla nalezena"
        });
        return;
    }

    // respond with json
    if (req.accepts('json')) {
        res.json({ error: 'Stránka nebyla nalezena' });
        return;
    }

    // default to plain-text. send()
    res.type('txt').send('Stránka nebyla nalezena');
    next(createError(404));
});

/**
 * Error handler
 */
app.use((err, req, res) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error', {
        title: 'Chyba',
        status: "500",
        message: "Chyba zpracování serveru"
    });
});

module.exports = app;
