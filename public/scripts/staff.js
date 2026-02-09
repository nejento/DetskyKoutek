let calendar,
    undoEvents = [];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('isRepeating').addEventListener('click',  () => {toggleRepeating();});
    document.getElementById('modalRemove').addEventListener('click',  () => {removeEvent();});

    let calendarEl = document.getElementById('calendar'),
        dateConstraint = {
            daysOfWeek: [ 1, 2, 3, 4, 5, 6 ], // Pondělí až sobota
            startTime: '7:00', // a start time (10am in this example)
            endTime: '18:00', // an end time (6pm in this example)
        };

    calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'cs',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
        },
        views: {
            listWeek: { buttonText: 'Agenda týdne' }
        },
        businessHours: dateConstraint,
        slotDuration: "00:15:00",
        slotMinTime: "06:30:00",
        slotMaxTime: "18:30:00",
        allDaySlot: false,
        initialView: 'timeGridWeek',
        initialDate: new Date(),
        navLinks: true,
        selectable: true,
        selectConstraint: dateConstraint,
        selectMirror: true,
        nowIndicator: true,
        editable: true,
        dayMaxEvents: true,
        select: (arg) => {
            $('#no-success').hide();
            $("#no-valid").hide();
            $('#timeModal').modal('show');
            document.getElementById('modalHeader').innerText = "Přidat čas";
            document.getElementById('modalSubmit').innerText = "Přidat čas";
            document.getElementById("modalRemove").style.display = "none";
            toggleRepeating();
            //$('#modal-form').off();
            $('#modal-form').off().on("submit", (e) => {
                e.preventDefault();
                submitForm()
            });
            //$("#modal-form").attr("onsubmit", "submitForm(); return false;");
            $('input#date').val(`${(arg.start.getDate() < 10 ? '0' : '') + arg.start.getDate()}. ${(arg.start.getMonth() < 10 ? '0' : '') + (arg.start.getMonth() + 1)}. ${arg.start.getFullYear()}`);
            $('input#timeFrom').val(`${(arg.start.getHours() < 10 ? '0' : '') + arg.start.getHours()}:${(arg.start.getMinutes() < 10 ? '0' : '') + arg.start.getMinutes()}`);
            $('input#timeTo').val(`${(arg.end.getHours() < 10 ? '0' : '') + arg.end.getHours()}:${(arg.end.getMinutes() < 10 ? '0' : '') + arg.end.getMinutes()}`);
            $('#repeatingFrom').val("");
            $('#repeatingTo').val("");
        },
        eventClick: (arg) => {
            $('#no-success').hide();
            $("#no-valid").hide();
            $('#timeModal').modal('show');
            document.getElementById('modalHeader').innerText = "Upravit čas";
            document.getElementById('modalSubmit').innerText = "Upravit čas";
            document.getElementById("modalRemove").style.display = "block";
            let repeating = false,
                recurringFrom, recurringTo;
            if (arg.event._def.recurringDef != null) {
                recurringFrom = new Date(arg.event._def.recurringDef.typeData.startRecur);
                recurringTo = new Date(arg.event._def.recurringDef.typeData.endRecur);
                toggleRepeating(true);
                repeating = true;
                $('input#repeatingFrom').val(`${(recurringFrom.getDate() < 10 ? '0' : '') + recurringFrom.getDate()}. ${(recurringFrom.getMonth() < 10 ? '0' : '') + (recurringFrom.getMonth() + 1)}. ${recurringFrom.getFullYear()}`);
                $('input#repeatingTo').val(`${(recurringTo.getDate() < 10 ? '0' : '') + recurringTo.getDate()}. ${(recurringTo.getMonth() < 10 ? '0' : '') + (recurringTo.getMonth() + 1)}. ${recurringTo.getFullYear()}`);
            } else toggleRepeating(false);
            //$('#modal-form').off();
            $('#modal-form').off().on("submit", (e) => {
                e.preventDefault();
                editForm(arg.event.id, arg.event.start.toISOString(), arg.event.end.toISOString(), repeating, (repeating ? recurringFrom.toISOString() : null), (repeating ? recurringTo.toISOString() : null));
            });
            //$('#modal-form').attr("onsubmit", `editForm(${arg.event.id}, "${arg.event.start.toISOString()}", "${arg.event.end.toISOString()}", ${repeating}, ${(repeating ? `"${recurringFrom.toISOString()}"` : null)}, ${repeating ? `"${recurringTo.toISOString()}"` : null}); return false;`);
            //$('#modalRemove').off();
            $('#modalRemove').off().on("click", (e) => {
                e.preventDefault();
                removeEvent(arg.event.id, arg.event.start.toISOString(), arg.event.end.toISOString(), repeating, (repeating ? recurringFrom.toISOString() : null), (repeating ? recurringTo.toISOString() : null));
            });
            //$('#modalRemove').attr("onclick", `removeEvent(${arg.event.id}, "${arg.event.start.toISOString()}", "${arg.event.end.toISOString()}", ${repeating}, ${(repeating ? `"${recurringFrom.toISOString()}"` : null)}, ${repeating ? `"${recurringTo.toISOString()}"` : null}); return false;`);
            $('input#date').val(`${(arg.event.start.getDate() < 10 ? '0' : '') + arg.event.start.getDate()}. ${(arg.event.start.getMonth() < 10 ? '0' : '') + (arg.event.start.getMonth() + 1)}. ${arg.event.start.getFullYear()}`);
            $('input#timeFrom').val(`${(arg.event.start.getHours() < 10 ? '0' : '') + arg.event.start.getHours()}:${(arg.event.start.getMinutes() < 10 ? '0' : '') + arg.event.start.getMinutes()}`);
            $('input#timeTo').val(`${(arg.event.end.getHours() < 10 ? '0' : '') + arg.event.end.getHours()}:${(arg.event.end.getMinutes() < 10 ? '0' : '') + arg.event.end.getMinutes()}`);
        },
        eventDrop: (arg) => {
            updateDate(arg);
        },
        eventResize: (arg) => {
            updateDate(arg);
        },
        events: []
    });

    calendar.render();

    loadAllEvents();
});

$('#date.form-control').datepicker({
format: "dd. mm. yyyy",
language: "cs",
startDate: '0d',
autoclose: true
});

$('#repeatingRange.input-daterange').datepicker({
format: "dd. mm. yyyy",
language: "cs",
autoclose: true
});

$('#edit-repeatingRange.input-daterange').datepicker({
format: "dd. mm. yyyy",
language: "cs",
autoclose: true
});

const toggleRepeating = (force) => {
    let checkbox = document.getElementById("isRepeating"),
        repeatingDiv = document.getElementById("repeating");

    if (force !== undefined && force) {
        checkbox.checked = true;
        repeatingDiv.style.display = "block";
    } else if (force !== undefined && !force) {
        checkbox.checked = false;
        repeatingDiv.style.display = "none";
    } else if (checkbox.checked === true) {
        repeatingDiv.style.display = "block";
    } else repeatingDiv.style.display = "none";
},
/**
 * Zpracuje odpověď ze serveru a přidá akci do kalendáře
 * @param response Nechybová odpověď ze serveru
 */
addEvent = (response) => {
    if (response.repeating) {
        let startDate = new Date(response.startDate),
            endDate = new Date(response.endDate),
            repeatingFrom = new Date(response.repeatingFrom),
            repeatingTo = new Date(response.repeatingTo);

        calendar.addEvent({
            id: response.id,
            title: "Každý týden",
            daysOfWeek: [startDate.getDay()],
            startTime: `${(startDate.getHours() < 10 ? '0' : '') + startDate.getHours()}:${(startDate.getMinutes() < 10 ? '0' : '') + startDate.getMinutes()}`,
            endTime: `${(endDate.getHours() < 10 ? '0' : '') + endDate.getHours()}:${(endDate.getMinutes() < 10 ? '0' : '') + endDate.getMinutes()}`,
            startRecur: repeatingFrom,
            endRecur: repeatingTo
        });
    } else {
        calendar.addEvent({
            id: response.id,
            start: response.startDate,
            end: response.endDate
        });
    }
    calendar.render();
},
loadAllEvents = () => {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/staff/gettimes", true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onload = () => {
        if (xhr.status === 200) {
            let response = JSON.parse(xhr.responseText);

            if (response.error) {
                popupToast("Chyba", response.error, true);
            } else {
                for (let i = 0; i < response.length; i++) {
                    //console.log(response[i]);
                    addEvent(response[i]); //Přidání odpovědi serveru do kalendáře
                }
                //popupToast("Kalendář načten", "Akce kalendáře byly načteny");
            }
        } else {
            popupToast("Chyba", "Nepovedlo se ze serveru načíst data kalendáře", true);
        }
        calendar.unselect();
    };
    //popupToast("Načítání kalendáře", "Načítám data ze serveru");
    xhr.send();
},
submitForm = () => {
    if (document.getElementById("date").value !== "" && document.getElementById("timeFrom").value !== "" && document.getElementById("timeTo").value !== "") {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/staff/addtime", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    if (response.error.length > 0) {
                        document.getElementById("no-success").innerText = response.error;
                    } else {
                        document.getElementById("no-success").innerText = "Nepovedlo se přidat čas do kalendáře. Zkuste to prosím znovu.";
                    }
                    $('#no-success').show();
                } else {
                    addEvent(response); //Přidání odpovědi serveru do kalendáře
                    $('#timeModal').modal('hide'); //Zavření modalu
                    let startDate = new Date(response.startDate),
                        endDate = new Date(response.endDate),
                        outputString = `${startDate.getDate()}. ${startDate.getMonth() + 1}. ${startDate.getFullYear()}: ${startDate.getHours()}:${startDate.getMinutes() + (startDate.getMinutes() === 0 ? "0" : "")} - ${endDate.getHours()}:${endDate.getMinutes() + (endDate.getMinutes() === 0 ? "0" : "")}`;
                    if (response.repeating) {
                        let repeatingFrom = new Date(response.repeatingFrom),
                            repeatingTo = new Date(response.repeatingTo);
                        outputString += `<br/><strong>Opakuje se mezi daty:</strong><br/>`;
                        outputString += `${repeatingFrom.getDate()}. ${repeatingFrom.getMonth() + 1}. ${repeatingFrom.getFullYear()} - ${repeatingTo.getDate()}. ${repeatingTo.getMonth() + 1}. ${repeatingTo.getFullYear()}`;
                    }
                    popupToast("Akce přidána", outputString);
                }
            } else {
                document.getElementById("no-success").innerText = "Nepovedlo se přidat čas do kalendáře. Zkuste to prosím znovu.";
                $('#no-success').show();
            }

            calendar.unselect();
        };

        let dateParse = /(\d{1,2})[.\s]*(\d{1,2})[.\s]*(\d{4})/.exec(document.getElementById("date").value),
            startTimeParse = /([01]?[0-9]|2[0-3])[:.,]([0-5][0-9])/.exec(document.getElementById("timeFrom").value),
            endTimeParse = /([01]?[0-9]|2[0-3])[:.,]([0-5][0-9])/.exec(document.getElementById("timeTo").value),
            startDate = new Date(parseInt(dateParse[3]), parseInt(dateParse[2]) - 1, parseInt(dateParse[1]), parseInt(startTimeParse[1]), parseInt(startTimeParse[2])),
            endDate = new Date(parseInt(dateParse[3]), parseInt(dateParse[2]) - 1, parseInt(dateParse[1]), parseInt(endTimeParse[1]), parseInt(endTimeParse[2]));

        if (document.getElementById("isRepeating").checked) {
            if (document.getElementById("repeatingFrom").value !== "" && document.getElementById("repeatingFrom").value !== "") {
                let repeatingFromParse = /(\d{1,2})[.\s]*(\d{1,2})[.\s]*(\d{4})/.exec(document.getElementById("repeatingFrom").value),
                    repeatingToParse = /(\d{1,2})[.\s]*(\d{1,2})[.\s]*(\d{4})/.exec(document.getElementById("repeatingTo").value),
                    repeatingFrom = new Date(parseInt(repeatingFromParse[3]), parseInt(repeatingFromParse[2]) - 1, parseInt(repeatingFromParse[1])),
                    repeatingTo = new Date(parseInt(repeatingToParse[3]), parseInt(repeatingToParse[2]) - 1, parseInt(repeatingToParse[1]));
                xhr.send(encodeURI(`startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&repeating=true&repeatingFrom=${repeatingFrom.toISOString()}&repeatingTo=${repeatingTo.toISOString()}`));
            } else {
                $("#no-valid").show();
            }
        } else {
            xhr.send(encodeURI(`startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&repeating=false`));
        }

    } else {
        $("#no-valid").show();
    }
    return false;

},
editForm = (eventID, oldStartDate, oldEndDate, oldRepeating, oldRepeatingFrom, oldRepeatingTo) => {
    if (document.getElementById("date").value !== "" && document.getElementById("timeFrom").value !== "" && document.getElementById("timeTo").value !== "") {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/staff/updatetime", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

        let dateParse = /(\d{1,2})[.\s]*(\d{1,2})[.\s]*(\d{4})/.exec(document.getElementById("date").value),
            startTimeParse = /([01]?[0-9]|2[0-3])[:.,]([0-5][0-9])/.exec(document.getElementById("timeFrom").value),
            endTimeParse = /([01]?[0-9]|2[0-3])[:.,]([0-5][0-9])/.exec(document.getElementById("timeTo").value),
            newStartDate = new Date(parseInt(dateParse[3]), parseInt(dateParse[2]) - 1, parseInt(dateParse[1]), parseInt(startTimeParse[1]), parseInt(startTimeParse[2])),
            newEndDate = new Date(parseInt(dateParse[3]), parseInt(dateParse[2]) - 1, parseInt(dateParse[1]), parseInt(endTimeParse[1]), parseInt(endTimeParse[2])),
            repeating = false,
            repeatingFrom, repeatingTo;

        if (document.getElementById("isRepeating").checked) {
            if (document.getElementById("repeatingFrom").value !== "" && document.getElementById("repeatingFrom").value !== "") {
                let repeatingFromParse = /(\d{1,2})[.\s]*(\d{1,2})[.\s]*(\d{4})/.exec(document.getElementById("repeatingFrom").value),
                    repeatingToParse = /(\d{1,2})[.\s]*(\d{1,2})[.\s]*(\d{4})/.exec(document.getElementById("repeatingTo").value);
                repeatingFrom = new Date(parseInt(repeatingFromParse[3]), parseInt(repeatingFromParse[2]) - 1, parseInt(repeatingFromParse[1]));
                repeatingTo = new Date(parseInt(repeatingToParse[3]), parseInt(repeatingToParse[2]) - 1, parseInt(repeatingToParse[1]));
                repeating = true;
            } else {
                $("#no-valid").show();
            }
        }

        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    if (response.error.length > 0) {
                        document.getElementById("no-success").innerText = response.error;
                    } else {
                        document.getElementById("no-success").innerText = "Nepovedlo se změnit čas v kalendáři. Zkuste to prosím znovu.";
                    }
                    $('#no-success').show();
                } else {
                    calendar.getEventById(response.id).remove(); //Odstranění původního eventu
                    addEvent(response); //Přidání odpovědi serveru do kalendáře
                    editToast(eventID, new Date(oldStartDate), new Date(oldEndDate), oldRepeating, (oldRepeating ? new Date(oldRepeatingFrom) : null), (oldRepeating ? new Date(oldRepeatingTo) : null), new Date(response.startDate), new Date(response.endDate), response.repeating, new Date(response.repeatingFrom), new Date(response.repeatingTo)); //Informace do edit toastu
                    $('#timeModal').modal('hide'); //Zavření modalu
                }
            } else {
                document.getElementById("no-success").innerText =  "Chyba serveru, nepovedlo se změnit akci";
                $('#no-success').show();
            }
            calendar.unselect();
        };

        if (repeating) {
            xhr.send(encodeURI(`eventID=${eventID}&eventStart=${newStartDate.toISOString()}&eventEnd=${newEndDate.toISOString()}&repeating=true&&repeatingFrom=${repeatingFrom.toISOString()}&repeatingTo=${repeatingTo.toISOString()}`));
        } else {
            xhr.send(encodeURI(`eventID=${eventID}&eventStart=${newStartDate.toISOString()}&eventEnd=${newEndDate.toISOString()}`));
        }

    } else {
        $("#no-valid").show();
    }
    return false;

},
removeEvent = (eventID, start, end, repeating, repeatingFrom, repeatingTo) => {
    undoEvents.push(["remove", {
        eventID: eventID,
        start: start,
        end: end,
        repeating: repeating,
        repeatingFrom: repeatingFrom,
        repeatingTo: repeatingTo
    }]);
    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/staff/removetime", true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onload = () => {
        if (xhr.status === 200) {
            let response = JSON.parse(xhr.responseText);

            if (response.error) { //Dostali jsme informaci, že nelze změnu provést
                popupToast("Chyba", response.error, true);
            } else {
                calendar.getEventById(eventID).remove(); //Odstranění původního eventu
                removeToast(eventID, new Date(start), new Date(end), repeating, new Date(repeatingFrom), new Date(repeatingTo));  //Informace do remove toastu
                $('#timeModal').modal('hide'); //Zavření modalu
            }
        } else {
            popupToast("Chyba", "Chyba serveru, nepovedlo se změnit akci", true);
        }
    };
    xhr.send(encodeURI(`eventID=${eventID}`));

},
updateDate = (event) => {
    let eventID = event.oldEvent.id,
        newEvent = event.event,
        repeating = false,
        repeatingFrom, repeatingTo;

    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/staff/updatetime", true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

    if (event.event._def.recurringDef != null) {
        repeating = true;
        repeatingFrom = new Date(event.event._def.recurringDef.typeData.startRecur).toISOString();
        repeatingTo = new Date(event.event._def.recurringDef.typeData.endRecur).toISOString();
    }

    xhr.onload = () => {
        if (xhr.status === 200) {
            let response = JSON.parse(xhr.responseText);

            if (response.error) { //Dostali jsme informaci, že nelze změnu provést
                popupToast("Chyba", response.error, true);
                event.revert();
            } else {
                calendar.getEventById(response.id).remove(); //Odstranění původního eventu
                addEvent(response); //Přidání odpovědi serveru do kalendáře
                editToast(eventID, new Date(event.oldEvent.start), new Date(event.oldEvent.end), repeating, (repeating ? new Date(repeatingFrom) : null), (repeating ? new Date(repeatingTo) : null), new Date(response.startDate), new Date(response.endDate), response.repeating, new Date(response.repeatingFrom), new Date(response.repeatingTo)); //Informace do edit toastu
            }
        } else {
            popupToast("Chyba", "Chyba serveru, nepovedlo se změnit akci", true);
            event.revert();
        }
    };

    if (repeating) {
        xhr.send(encodeURI(`eventID=${eventID}&eventStart=${newEvent.start.toISOString()}&eventEnd=${newEvent.end.toISOString()}&repeating=true&repeatingFrom=${repeatingFrom}&repeatingTo=${repeatingTo}`));
    } else {
        xhr.send(encodeURI(`eventID=${eventID}&eventStart=${newEvent.start.toISOString()}&eventEnd=${newEvent.end.toISOString()}`));
    }

},
revertEvent = (undoIndex) => {
    let pastTask = undoEvents[undoIndex][0],
        pastEvent = undoEvents[undoIndex][1],
        xhr = new XMLHttpRequest();

    if (pastTask === "edit") {
        xhr.open("POST", "/staff/updatetime", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) { //Dostali jsme informaci, že nelze změnu provést
                    popupToast("Chyba", response.error, true);
                } else {
                    calendar.getEventById(response.id).remove(); //Odstranění původního eventu
                    addEvent(response);
                }
                popupToast("Akce vrácena", "Změna akce byla vrácena zpět");
            } else {
                popupToast("Chyba", "Chyba serveru, nepovedlo se vrátit akci zpět", true);
            }
        };

        if (pastEvent.oldRepeating) {
            xhr.send(encodeURI(`eventID=${pastEvent.eventID}&eventStart=${pastEvent.oldStart.toISOString()}&eventEnd=${pastEvent.oldEnd.toISOString()}&repeating=true&repeatingFrom=${pastEvent.oldRepeatingStart.toISOString()}&repeatingTo=${pastEvent.oldRepeatingEnd.toISOString()}`));
        } else {
            xhr.send(encodeURI(`eventID=${pastEvent.eventID}&eventStart=${pastEvent.oldStart.toISOString()}&eventEnd=${pastEvent.oldEnd.toISOString()}`));
        }
    } else if (pastTask === "remove") {
        xhr.open("POST", "/staff/addtime", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) { //Dostali jsme informaci, že nelze změnu provést
                    popupToast("Chyba", response.error, true);
                } else {
                    //calendar.getEventById(response.id).remove();
                    addEvent(response);
                }
                popupToast("Akce vrácena", "Změna akce byla vrácena zpět");
            } else {
                popupToast("Chyba", "Chyba serveru, nepovedlo se vrátit akci zpět", true);
            }
        };

        if (pastEvent.oldRepeating) {
            xhr.send(encodeURI(`startDate=${pastEvent.oldStart.toISOString()}&endDate=${pastEvent.oldEnd.toISOString()}&repeating=true&repeatingFrom=${pastEvent.oldRepeatingStart.toISOString()}&repeatingTo=${pastEvent.oldRepeatingEnd.toISOString()}`));
        } else {
            xhr.send(encodeURI(`startDate=${pastEvent.oldStart.toISOString()}&endDate=${pastEvent.oldEnd.toISOString()}&repeating=false`));
        }
    }
},
editToast = (eventID, oldStart, oldEnd, oldRepeating, oldRepeatingStart, oldRepeatingEnd, newStart, newEnd, newRepeating, newRepeatingStart, newRepeatingEnd) => {
    let clone = document.getElementById('template_toast').content.cloneNode(true),
        oldDate = `${oldStart.getDate()}. ${oldStart.getMonth() + 1}. ${oldStart.getFullYear()}: ${oldStart.getHours()}:${oldStart.getMinutes() + (oldStart.getMinutes() === 0 ? "0" : "")} - ${oldEnd.getHours()}:${oldEnd.getMinutes() + (oldEnd.getMinutes() === 0 ? "0" : "")}`,
        newDate = `${newStart.getDate()}. ${newStart.getMonth() + 1}. ${newStart.getFullYear()}: ${newStart.getHours()}:${newStart.getMinutes() + (newStart.getMinutes() === 0 ? "0" : "")} - ${newEnd.getHours()}:${newEnd.getMinutes() + (newEnd.getMinutes() === 0 ? "0" : "")}`;

    undoEvents.push(["edit", {
        eventID: eventID,
        oldStart: oldStart,
        oldEnd: oldEnd,
        oldRepeating: oldRepeating,
        oldRepeatingStart: oldRepeatingStart,
        oldRepeatingEnd: oldRepeatingEnd
    }]);

    $('#toastList').append(clone);
    $('.toast:last .title')[0].innerText = "Termín byl změněn";
    $('.toast:last .toast-body')[0].innerHTML = `<strong>Z:</strong> ${oldDate}<br/>` +
        (oldRepeating ? `Opakující se mezi dny: <br/>` : ``) +
        (oldRepeating ? `${oldRepeatingStart.getDate()}. ${oldRepeatingStart.getMonth() + 1}. ${oldRepeatingStart.getFullYear()} - ${oldRepeatingEnd.getDate()}. ${oldRepeatingEnd.getMonth() + 1}. ${oldRepeatingEnd.getFullYear()} <br/>` : ``) +
        `    <strong>Na:</strong> ${newDate} <br/>` +
        (newRepeating ? `Opakující se mezi dny: <br/>` : ``) +
        (newRepeating ? `${newRepeatingStart.getDate()}. ${newRepeatingStart.getMonth() + 1}. ${newRepeatingStart.getFullYear()} - ${newRepeatingEnd.getDate()}. ${newRepeatingEnd.getMonth() + 1}. ${newRepeatingEnd.getFullYear()} <br/>` : ``) +
        `    <div class="mt-2">` +
        `        <button type="button" class="btn btn-primary btn-sm event-undo revert">Vrátit zpět</button>` +
        `    </div>`;
    $('.toast:last .toast-body .revert').on("click", () => {
        revertEvent(undoEvents.length - 1);
    });
    $('.toast:last').toast({delay: 8000});
    $(".toast:last").toast('show');
},
removeToast = (eventID, oldStart, oldEnd, oldRepeating, oldRepeatingStart, oldRepeatingEnd) => {
    let clone = document.getElementById('template_toast').content.cloneNode(true),
        oldDate = `${oldStart.getDate()}. ${oldStart.getMonth() + 1}. ${oldStart.getFullYear()}: ${oldStart.getHours()}:${oldStart.getMinutes() + (oldStart.getMinutes() === 0 ? "0" : "")} - ${oldEnd.getHours()}:${oldEnd.getMinutes() + (oldEnd.getMinutes() === 0 ? "0" : "")}`;

    undoEvents.push(["remove", {
        eventID: eventID,
        oldStart: oldStart,
        oldEnd: oldEnd,
        oldRepeating: oldRepeating,
        oldRepeatingStart: oldRepeatingStart,
        oldRepeatingEnd: oldRepeatingEnd
    }]);

    $('#toastList').append(clone);
    $('.toast:last .title')[0].innerText = "Termín byl odstraněn";
    $('.toast:last .toast-body')[0].innerHTML = `${oldDate}<br/>` +
        (oldRepeating ? `Opakující se mezi dny: <br/>` : ``) +
        (oldRepeating ? `${oldRepeatingStart.getDate()}. ${oldRepeatingStart.getMonth() + 1}. ${oldRepeatingStart.getFullYear()} - ${oldRepeatingEnd.getDate()}. ${oldRepeatingEnd.getMonth() + 1}. ${oldRepeatingEnd.getFullYear()} <br/>` : ``) +
        `    <strong>byl odstraněn</strong><br/>` +
        `    <div class="mt-2">` +
        `        <button type="button" class="btn btn-primary btn-sm event-undo revert">Vrátit zpět</button>` +
        `    </div>`;
    $('.toast:last .toast-body .revert').on("click", () => {
        revertEvent(undoEvents.length - 1);
    });
    $('.toast:last').toast({delay: 8000});
    $(".toast:last").toast('show');
},
popupToast = (title, body, error = false) => {
    let clone = document.getElementById('template_toast').content.cloneNode(true);
    $('#toastList').append(clone);
    if (error) $('.toast:last .toast-header').removeClass("bg-fptul").addClass("bg-danger");
    $('.toast:last .title')[0].innerHTML = title;
    $('.toast:last .toast-body')[0].innerHTML = body;
    $('.toast:last').toast({delay: 8000});
    $(".toast:last").toast('show');
};