# Dětský koutek TUL

Rezervační systém dětského koutku při Technické univerzitě v Liberci. Aplikace umožňuje rodičům, personálu a administrátorům efektivně spravovat rezervace a harmonogram dětského koutku.

---

## 📋 O projektu

Webová aplikace vytvořená jako bakalářská práce na Fakultě mechatroniky, informatiky a mezioborových studií Technické univerzity v Liberci. Systém poskytuje komplexní řešení pro správu rezervací dětského koutku na Fakultě přírodovědně-humanitní a pedagogické TUL.

### Hlavní funkce

- 👥 **Správa uživatelů** - podpora více rolí (rodič, asistent, administrátor)
- 👶 **Evidence dětí** - správa informací o dětech včetně poznámek
- 📅 **Rezervační systém** - jednoduchá rezervace termínů
- 🗓️ **Kalendář** - přehledné zobrazení harmonogramu
- 📊 **Reporting** - export dat do CSV formátu
- 🔒 **SSO integrace** - přihlášení přes LIANE systém
- 📧 **E-mailové notifikace** - automatické informování uživatelů

---

## 🏗️ Struktura projektu

```
DetskyKoutekTUL/
├── app.js                      # Hlavní aplikační soubor (Express.js server)
├── db.js                       # Konfigurace databázového připojení
├── helpers.js                  # Pomocné funkce (kontrola rolí, validace)
├── package.json                # Závislosti a skripty projektu
├── prepareDatabase.sql         # SQL skript pro inicializaci databáze
├── settings_example.json       # Příklad konfiguračního souboru
├── bin/
│   └── www                     # Spouštěcí skript serveru
├── routes/                     # Obsluha jednotlivých cest (routery)
│   ├── index.js               # Domovská stránka
│   ├── auth.js                # Autentizace a SSO
│   ├── user.js                # Uživatelský profil
│   ├── children.js            # Správa dětí
│   ├── reservations.js        # Rezervace termínů
│   ├── staff.js               # Rozhraní pro personál
│   ├── manage.js              # Správa harmonogramu
│   └── admin.js               # Administrátorské funkce
├── views/                     # EJS šablony
│   ├── index.ejs              # Úvodní stránka
│   ├── admin.ejs              # Admin dashboard
│   ├── staff.ejs              # Pohled personálu
│   ├── reservations.ejs       # Rezervace
│   ├── manage.ejs             # Správa harmonogramu
│   ├── child_list.ejs         # Seznam dětí
│   ├── overview.ejs           # Přehled
│   ├── error.ejs              # Chybové stránky
│   └── templates/             # Znovupoužitelné komponenty
└── public/                    # Statické soubory
    ├── images/                # Obrázky
    ├── scripts/               # JavaScript soubory
    ├── stylesheets/           # CSS styly
    └── files/                 # Uživatelské soubory
```

---

## 🛠️ Technologie

### Backend
- **[Node.js](https://nodejs.org/)** - JavaScriptové runtime prostředí
- **[Express.js](https://expressjs.com/)** v4.18.2 - Webový framework
- **[MySQL](https://www.mysql.com/)** - Relační databáze
- **[EJS](https://ejs.co/)** - Šablonovací systém

### Frontend
- **[Bootstrap](https://getbootstrap.com/)** v5.1.3 - CSS framework
- **[jQuery](https://jquery.com/)** v3.5.1 - JavaScript knihovna
- **[FullCalendar](https://fullcalendar.io/)** v5.6.0 - Kalendářní widget
- **[Font Awesome](https://fontawesome.com/)** v6.2.0 - Ikony
- **[SimpleMDE](https://simplemde.com/)** - Markdown editor
- **[Bootstrap Datepicker](https://bootstrap-datepicker.readthedocs.io/)** - Výběr data

### Bezpečnost a optimalizace
- **[Helmet](https://helmetjs.github.io/)** v6.0.0 - Zabezpečení HTTP hlaviček
- **[XSS](https://www.npmjs.com/package/xss)** v1.0.8 - Ochrana proti XSS útokům
- **[Compression](https://www.npmjs.com/package/compression)** v1.7.4 - GZIP komprese
- **[Express Session](https://www.npmjs.com/package/express-session)** v1.17.1 - Správa sessions

### Další nástroje
- **[Nodemailer](https://nodemailer.com/)** v6.6.0 - Odesílání e-mailů
- **[json2csv](https://www.npmjs.com/package/json2csv)** v5.0.6 - Export dat do CSV
- **[Showdown](https://showdownjs.com/)** v2.1.0 - Markdown parser
- **[Morgan](https://www.npmjs.com/package/morgan)** - HTTP request logger

---

## 🚀 Instalace a spuštění

### Požadavky

- Node.js (v14 nebo vyšší)
- MySQL Server (v5.7 nebo vyšší)
- npm nebo yarn

### Postup instalace

1. **Klonování repozitáře**
   ```bash
   git clone https://github.com/nejento/DetskyKoutekTUL.git
   cd DetskyKoutekTUL
   ```

2. **Instalace závislostí**
   ```bash
   npm install
   ```

3. **Vytvoření databáze**
   ```bash
   mysql -u root -p < prepareDatabase.sql
   ```

4. **Konfigurace aplikace**
   
   Zkopírujte `settings_example.json` jako `settings.json` a upravte konfiguraci:
   ```bash
   cp settings_example.json settings.json
   ```
   
   Upravte následující parametry v `settings.json`:
   ```json
   {
     "port": 80,
     "mysql_host": "localhost",
     "mysql_user": "detskykoutek",
     "mysql_pass": "your_password",
     "mysql_database": "detskykoutek",
     "sessionSecret": "random_long_string",
     "mailFrom": "noreply@example.com",
     "emailDomain": "example.com",
     "appUrl": "https://app.example.com",
     "ssoUrl": "https://auth.example.com/sso/login"
   }
   ```

5. **Spuštění aplikace**
   ```bash
   npm start
   ```

Aplikace bude dostupná na `http://localhost:80` (nebo na portu specifikovaném v konfiguraci).

---

## 🔧 Konfigurace

Hlavní konfigurační soubor `settings.json` obsahuje:

| Parametr | Popis |
|----------|-------|
| `port` | Port pro HTTP server |
| `mysql_*` | Přístupové údaje k MySQL databázi |
| `sessionSecret` | Tajný klíč pro šifrování sessions |
| `https` | Povolení HTTPS (`true`/`false`) |
| `httpsPort` | Port pro HTTPS server |
| `redirectToHttps` | Automatické přesměrování na HTTPS |
| `privkey` | Cesta k SSL privátnímu klíči |
| `fullchain` | Cesta k SSL certifikátu |
| `mailFrom` | E-mailová adresa odesílatele |
| `emailDomain` | Doména pro e-mailové adresy |
| `appUrl` | URL aplikace |
| `ssoUrl` | URL pro SSO přihlášení (LIANE) |

---

## 👥 Role uživatelů

Systém podporuje tři typy uživatelů:

- **👨‍👩‍👧 Rodič** - může přidávat své děti, vytvářet rezervace a spravovat své rezervace
- **👔 Asistent** - má přístup k harmonogramu, může vidět rezervace a pracovat s dětmi
- **🔐 Administrátor** - má plný přístup ke všem funkcím včetně správy uživatelů a harmonogramu

---

## 📄 Licence

Projekt vytvořen jako bakalářská práce na Technické univerzitě v Liberci.


