let calendar;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('calendarSelector').addEventListener('change',  () => updateCalendar());
    document.querySelectorAll('.acceptReservation').forEach(item => {
        item.addEventListener('submit', event => {
            event.preventDefault();
            acceptReservation(event.target.getAttribute("data-resid"));
        });
    });
    document.querySelectorAll('.updateReservation').forEach(item => {
        item.addEventListener('submit', event => {
            event.preventDefault();
            updateReservation(event.target.getAttribute("data-resid"));
        });
    });
    document.querySelectorAll('.adminEditReservation').forEach(item => {
        item.addEventListener('click', event => {
            adminEditReservation(event.target.getAttribute("data-resid"));
        });
    });
    document.querySelectorAll('.removeReservation').forEach(item => {
        item.addEventListener('click', event => {
            let id = event.target.getAttribute("data-resid"),
                name = event.target.getAttribute("data-childname"),
                surname = event.target.getAttribute("data-childsurname");
            removeReservation(id, name, surname);
        });
    });

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
        selectable: false,
        nowIndicator: true,
        editable: false,
        dayMaxEvents: true,
        events: []
    });

    calendar.render();

    updateCalendar(true);
});

const acceptReservation = (reservationID) => {
    let asistentID = $("#reservation_" + reservationID + " [name='availableAssistants']").val(),
        staffNote = $("#reservation_" + reservationID + " [name='poznamkaStaff']").val(),
        validWarning = $("#reservation_" + reservationID + " [data-warning='no-valid']"),
        errorWarning = $("#reservation_" + reservationID + " [data-warning='no-success']");

    if (asistentID !== "") {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/admin/manage/updatereservation", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    errorWarning.val(response.error);
                    errorWarning.show();
                } else if (response.confirmed) {
                    location.reload();
                } else {
                    errorWarning.val("Došlo k chybě, zkuste to prosím znovu.");
                    errorWarning.show();
                }
            } else {
                errorWarning.val("Nepovedlo se přidat rezervaci. Server ohlásil chybu.");
                errorWarning.show();
            }
        };
        xhr.send(encodeURI(`reservationid=${reservationID}&assistantid=${asistentID}&staffnote=${staffNote}`));

    } else validWarning.show();
    return false;
},
adminEditReservation = (reservationID) => {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/admin/manage/geteditinfo", true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onload = () => {
        if (xhr.status === 200) {
            let response = JSON.parse(xhr.responseText);

            if (response.error) {
                popupToast("Chyba", response.error, true);
            } else {
                let reservationStart = new Date(response.reservationStart),
                    reservationEnd = new Date(response.reservationEnd);
                $('#no-success-adminEdit').hide();
                $("#no-valid-adminEdit").hide();
                $('input#adminEditDate').val(`${(reservationStart.getDate() < 10 ? '0' : '') + reservationStart.getDate()}. ${(reservationStart.getMonth() < 10 ? '0' : '') + (reservationStart.getMonth() + 1)}. ${reservationStart.getFullYear()}`);
                $('input#adminEditTimeFrom').val(`${(reservationStart.getHours() < 10 ? '0' : '') + reservationStart.getHours()}:${reservationStart.getMinutes() + (reservationStart.getMinutes() === 0 ? "0" : "")}`);
                $('input#adminEditTimeTo').val(`${(reservationEnd.getHours() < 10 ? '0' : '') + reservationEnd.getHours()}:${reservationEnd.getMinutes() + (reservationEnd.getMinutes() === 0 ? "0" : "")}`);
                $('#adminEdit-modal-form').off().on("submit", (e) => {e.preventDefault(); confirmAdminEditForm(reservationID)});
                $('#adminEditRemoveButton').off().on("click", () => {removeReservation(reservationID)});
                //$('#adminEdit-modal-form').attr("onsubmit", `confirmAdminEditForm(${reservationID}); return false;`);
                //$('#adminEditRemoveButton').attr("onclick", `removeReservation(${reservationID}); return false;`);
                let dropdown = $("#adminEditAvailableAssistants");
                dropdown.empty();
                dropdown.append('<option value="cancelConfirmation">Žádný asistent – Zrušit potvrzení</option>');
                if (response.availableAssistants.absolute.length > 0) {
                    let html = '<optgroup label="Asistenti s přesnou časovou shodou">';
                    for (let i = 0; i < response.availableAssistants.absolute.length; i++) {
                        const asistent = response.availableAssistants.absolute[i];
                        html += `<option value="${asistent.user_id}">${asistent.name} ${asistent.surname}</option>`;
                    }
                    html += "</optgroup>";
                    dropdown.append(html);
                }
                if (response.availableAssistants.sameDay.length > 0) {
                    let html = '<optgroup label="Asistenti hlídající stejný den">';
                    for (let i = 0; i < response.availableAssistants.sameDay.length; i++) {
                        const asistent = response.availableAssistants.sameDay[i];
                        html += `<option value="${asistent.user_id}">${asistent.name} ${asistent.surname}</option>`;
                    }
                    html += "</optgroup>";
                    dropdown.append(html);
                }
                if (response.availableAssistants.other.length > 0) {
                    let html = '<optgroup label="Asistenti bez časové shody">';
                    for (let i = 0; i < response.availableAssistants.other.length; i++) {
                        const asistent = response.availableAssistants.other[i];
                        html += `<option value="${asistent.user_id}">${asistent.name} ${asistent.surname}</option>`;
                    }
                    html += "</optgroup>";
                    dropdown.append(html);
                }
                if (response.selectedAssistant != null) {
                    document.getElementById('adminEditAvailableAssistants').value = response.selectedAssistant;
                } else document.getElementById('adminEditAvailableAssistants').value = "cancelConfirmation";
                $('#adminEditReservation').modal('show');
            }
        } else {
            popupToast("Chyba", "Nepovedlo se ze serveru načíst data rezervace", true);
        }
    };
    xhr.send(encodeURI(`reservationid=${reservationID}`));
},
confirmAdminEditForm = (reservationID) => {
    if (document.getElementById("adminEditDate").value !== "" && document.getElementById("adminEditTimeFrom").value !== "" && document.getElementById("adminEditTimeTo").value !== "") {
        let dateParse = /(\d{1,2})[.\s]*(\d{1,2})[.\s]*(\d{4})/.exec(document.getElementById("adminEditDate").value),
            startTimeParse = /([01]?[0-9]|2[0-3])[:.,]([0-5][0-9])/.exec(document.getElementById("adminEditTimeFrom").value),
            endTimeParse = /([01]?[0-9]|2[0-3])[:.,]([0-5][0-9])/.exec(document.getElementById("adminEditTimeTo").value),
            startDate = new Date(parseInt(dateParse[3]), parseInt(dateParse[2]) - 1, parseInt(dateParse[1]), parseInt(startTimeParse[1]), parseInt(startTimeParse[2])),
            endDate = new Date(parseInt(dateParse[3]), parseInt(dateParse[2]) - 1, parseInt(dateParse[1]), parseInt(endTimeParse[1]), parseInt(endTimeParse[2])),
            assistantID = $("#adminEditAvailableAssistants").val();

        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/admin/manage/admineditreservation", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    document.getElementById("no-success-adminEdit").innerText = response.error;
                    $('#no-success-adminEdit').show();
                } else if (response.confirmed) {
                    location.reload();
                } else {
                    document.getElementById("no-success-adminEdit").innerText = "Došlo k chybě, zkuste to prosím znovu.";
                    $('#no-success-adminEdit').show();
                }
            } else {
                document.getElementById("no-success-adminEdit").innerText = "Nepovedlo se upravit rezervaci. Server ohlásil chybu.";
                $('#no-success-adminEdit').show();
            }
        };

        $("#no-success-adminEdit").hide();
        $("#no-valid-adminEdit").hide();
        if (assistantID === "cancelConfirmation") {
            xhr.send(encodeURI(`reservationid=${reservationID}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&cancelconfirmation=true`));
        } else xhr.send(encodeURI(`reservationid=${reservationID}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&assistantid=${assistantID}`));

    } else {
        $("#no-valid-adminEdit").show();
    }
    return false;
},
updateReservation = (reservationID) => {
    let asistentID = $("#confirmedReservation_" + reservationID + " [name='availableAssistants']").val(),
        staffNote = $("#confirmedReservation_" + reservationID + " [name='poznamkaStaff']").val(),
        validWarning = $("#confirmedReservation_" + reservationID + " [data-warning='no-valid']"),
        errorWarning = $("#confirmedReservation_" + reservationID + " [data-warning='no-success']");

    if (asistentID !== "") {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/admin/manage/updatereservation", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    errorWarning.val(response.error);
                    errorWarning.show();
                } else if (response.confirmed) {
                    location.reload();
                } else {
                    errorWarning.val("Došlo k chybě, zkuste to prosím znovu.");
                    errorWarning.show();
                }
            } else {
                errorWarning.val("Nepovedlo se přidat rezervaci. Server ohlásil chybu.");
                errorWarning.show();
            }
        };

        if (asistentID === "cancelConfirmation") {
            xhr.send(encodeURI(`reservationid=${reservationID}&cancelconfirmation=true&staffnote=${staffNote}`));
        } else xhr.send(encodeURI(`reservationid=${reservationID}&assistantid=${asistentID}&staffnote=${staffNote}`));

    } else validWarning.show();
    return false;
},
confirmRemove = (reservationID) => {
    let validWarning = $("#confirmedReservation_" + reservationID + " [data-warning='no-valid']"),
        errorWarning = $("#confirmedReservation_" + reservationID + " [data-warning='no-success']");
    if (reservationID !== "") {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/admin/manage/removereservation", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    errorWarning.val(response.error);
                    errorWarning.show();
                } else if (response.confirmed) {
                    location.reload();
                } else {
                    errorWarning.val("Došlo k chybě, zkuste to prosím znovu.");
                    errorWarning.show();
                }
            } else {
                errorWarning.val("Nepovedlo se odstranit rezervaci. Server ohlásil chybu.");
                errorWarning.show();
            }
        };
        xhr.send(encodeURI(`reservationid=${reservationID}`));

    } else validWarning.show();
    return false;
},
removeReservation = (reservationID, name, surname) => {
    if (name && surname) {
        let unconfirmedCard = $("#reservationCard_" + reservationID + " h5")[0],
            confirmedCard = $("#confirmedReservationCard_" + reservationID + " h5")[0],
            date;

        if (confirmedCard !== undefined) {
            date = confirmedCard.innerText;
        } else date = unconfirmedCard.innerText;

        document.getElementById('confirmBody').innerHTML = "Opravdu chcete odstranit rezervaci <strong>" + date + "</strong> pro <strong>" + name + " " + surname + "</strong>?<br/><br/><strong>Rezervace bude odstraněna i rodiči</strong><br/><span class='text-muted'>Pokud chcete jen zrušit potvrzení, nastavte žádného přiřazeného asistenta.</span>";
    } else {
        document.getElementById('confirmBody').innerHTML = "Opravdu chcete odstranit vybranou rezervaci?<br/><br/><strong>Rezervace bude odstraněna i rodiči</strong><br/><span class='text-muted'>Pokud chcete jen zrušit potvrzení, nastavte žádného přiřazeného asistenta.</span>";
    }
    $('#confirmRemove').off().on("click", () => {confirmRemove(reservationID)});
    //$("#confirmRemove").attr("onclick", "confirmRemove('" + reservationID + "');");
    $('#confirmModal').modal('show');
},
addEvent = (response, bg) => {
    let title = "",
        type = "auto";
    if (bg) type = "background";
    if (response.name) title += response.name;
    if (response.surname) title += " " + response.surname;

    if (response.repeating) {
        let startDate = new Date(response.startDate),
            endDate = new Date(response.endDate),
            repeatingFrom = new Date(response.repeatingFrom),
            repeatingTo = new Date(response.repeatingTo);

        calendar.addEvent({
            id: response.id,
            title: title,
            daysOfWeek: [startDate.getDay()],
            startTime: `${(startDate.getHours() < 10 ? '0' : '') + startDate.getHours()}:${(startDate.getMinutes() < 10 ? '0' : '') + startDate.getMinutes()}`,
            endTime: `${(endDate.getHours() < 10 ? '0' : '') + endDate.getHours()}:${(endDate.getMinutes() < 10 ? '0' : '') + endDate.getMinutes()}`,
            startRecur: repeatingFrom,
            endRecur: repeatingTo,
            display: type
        });
    } else {
        calendar.addEvent({
            id: response.id,
            title: title,
            start: response.startDate,
            end: response.endDate,
            display: type
        });
    }
    calendar.render();
},
updateCalendar = (quiet) => {
    let user = $("#calendarSelector").val();
    if (user !== "") {
        let xhr = new XMLHttpRequest(),
            xhr_events = new XMLHttpRequest(),
            events = calendar.getEvents();

        // Odstranění původních eventů
        for (let i = 0; i < events.length; i++) events[i].remove();

        xhr.open("POST", "/staff/gettimes", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    popupToast("Chyba", response.error, true);
                } else {
                    // Odstranění původních eventů
                    let events = calendar.getEvents();
                    for (let i = 0; i < events.length; i++) events[i].remove();

                    //Přidání odpovědi serveru do kalendáře
                    for (let i = 0; i < response.length; i++) addEvent(response[i], true);
                    if (!quiet) popupToast("Kalendář načten", "Akce kalendáře asistenta byly načteny");
                }
            } else popupToast("Chyba", "Nepovedlo se načíst kalendář. Server ohlásil chybu, zkuste to znovu", true);
        };
        xhr.send(encodeURI(`assistantid=${user}`));

        xhr_events.open("POST", "/admin/manage/getreservations", true);
        xhr_events.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr_events.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr_events.responseText);

                if (response.error) {
                    popupToast("Chyba", response.error, true);
                } else {
                    //Přidání odpovědi serveru do kalendáře
                    //console.log(response);
                    for (let i = 0; i < response.length; i++) addEvent(response[i]);
                }
            } else popupToast("Chyba", "Nepovedlo se načíst kalendář. Server ohlásil chybu, zkuste to znovu", true);
        };
        xhr_events.send(encodeURI(`assistantid=${user}`));
    } else {
        popupToast("Chyba", "Chybné ID uživatele, zkuste asistenta zvolit znovu", true);
    }
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