$(() => {
    $('[data-toggle="popover"]').popover();
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('yearSelector').addEventListener('change',  () => getMonths());
    document.getElementById('monthSelector').addEventListener('change',  () => updateMonth());
    document.getElementById('addUser').addEventListener('submit',  (e) => {e.preventDefault(); addUser();});
    document.getElementById('setAlertForm').addEventListener('submit',  (e) => {e.preventDefault(); setAlert();});
    document.getElementById('setAktualniInformace').addEventListener('submit',  (e) => {e.preventDefault(); setAktualniInformace();});
    document.getElementById('setPrice').addEventListener('submit',  (e) => {e.preventDefault(); setPrice();});
    document.querySelectorAll('.adminEditReservation').forEach(item => {
        item.addEventListener('click', event => {
            adminEditReservation(event.target.parentElement.getAttribute("data-resid"));
        });
    });
    document.querySelectorAll('.removeAssistantButton').forEach(item => {
        item.addEventListener('click', event => {
            let id = event.target.getAttribute("data-assistantid"),
                name = event.target.getAttribute("data-assistantname"),
                surname = event.target.getAttribute("data-assistantsurname");
            removeAssistant(id, name, surname);
        });
    });
});

let aktualniInformaceMDE = new SimpleMDE({
        element: document.getElementById("aktualniInformace"),
        placeholder: "Text pro oddíl Aktuální informace na hlavní stránce webu.\nPodporuje Markdown.",
        spellChecker: false
    }),
    textAlertMDE = new SimpleMDE({
        element: document.getElementById("textAlert"),
        placeholder: "Text pro zvýrazněný oddíl Alert na hlavní stránce webu pod tlačítkem rezervace.\nPodporuje Markdown.",
        spellChecker: false
    });

const monthNames = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"],
getMonths = () => {
    let year = $("#yearSelector").val();
    if (year !== "") {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/admin/getmonths", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    popupToast("Chyba", response.error, true);
                } else {
                    let monthDropdown = $("#monthSelector");
                    monthDropdown.empty();
                    if (response.months.length > 0) {
                        $("#exportCSV").attr("href", `/admin/getcsv?year=${year}&month=${response.months[0]}`);
                        $("#exportCSV").attr("download", `${year}_${response.months[0]}.csv`);
                        $('#exportCSV').prop("disabled", false);

                        for (let i = 0; i < response.months.length; i++) {
                            monthDropdown.append('<option value="' + response.months[i] + '">' + monthNames[response.months[i] - 1] + '</option>');
                        }
                    }
                }
            } else {
                popupToast("Chyba", "Došlo k chybě, nepovedlo se získat měsíce roku", true);
            }
        };
        xhr.send(encodeURI(`year=${year}`));
    }
},
updateMonth = () => {
    let year = $("#yearSelector").val(),
        month = $("#monthSelector").val();
    $("#exportCSV").attr("href", `/admin/getcsv?year=${year}&month=${month}`);
    $("#exportCSV").attr("download", `${year}_${month}.csv`);
    $('#exportCSV').prop("disabled", false);
},
addUser = () => {
    console.log("Runing");

    let email = $("#addUserEmail").val(),
        role = $("#addUserRole").val();

    const escapedDomain = emailDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const emailRegex = new RegExp(`^([a-z0-9!#$%&'*+/=?^_\`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_\`{|}~-]+)*)(?:(?:@${escapedDomain})|(?!.))`);

    if (emailRegex.test(email) && role !== "") {
        let strippedMail = emailRegex.exec(email);

        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/admin/changerole", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    document.getElementById("no-success-userAdd").innerText = response.error;
                    $('#no-success-userAdd').show();
                } else if (response.confirmed) {
                    location.reload();
                }
            } else {
                document.getElementById("no-success-userAdd").innerText = "Nepovedlo se upravit rezervaci. Server ohlásil chybu.";
                $('#no-success-userAdd').show();
            }
        };
        xhr.send(encodeURI(`type=email&user=${strippedMail[1] + "@" + emailDomain}&role=${role}`));

    } else {
        $("#no-valid-userAdd").show();
    }
    return false;
},
setAktualniInformace = () => {
    let infoText = aktualniInformaceMDE.value();
    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/admin/setinfo", true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onload = () => {
        if (xhr.status === 200) {
            let response = JSON.parse(xhr.responseText);

            if (response.error) {
                popupToast("Chyba", response.error, true);
            } else if (response.confirmed) {
                popupToast("Aktuální informace nastaveny", "Oddíl Aktuální informace byl nastaven");
            } else {
                popupToast("Chyba", "Došlo k chybě. Nepovedlo se nastavit text Aktuálních informací", true);
            }
        } else {
            popupToast("Chyba", "Došlo k chybě, server ohlásil chybu", true);
        }
    };
    xhr.send(encodeURI(`infotext=${infoText}`));
    return false;
},
setAlert = () => {
    let alertHeader = $('#alertHeader').val(),
        alertText = textAlertMDE.value(),
        color = $('input[name=radioColor]:checked').val(),
        show = $("#showSwitch").is(':checked');

    if (color !== undefined) {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/admin/setalert", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    popupToast("Chyba", response.error, true);
                } else if (response.confirmed) {
                    popupToast("Alert nastaven", "Oddíl Alert byl nastaven");
                } else {
                    popupToast("Chyba", "Došlo k chybě. Nepovedlo se nastavit Alert", true);
                }
            } else {
                popupToast("Chyba", "Došlo k chybě, server ohlásil chybu", true);
            }
        };
        xhr.send(encodeURI(`show=${show}&color=${color}&alertheader=${alertHeader}&alerttext=${alertText}`));
    }
    return false;
},
setPrice = () => {
    let price = $("#priceInput").val();
    if (price !== "") {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/admin/setprice", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    popupToast("Chyba", response.error, true);
                } else if (response.confirmed) {
                    popupToast("Cena nastavena", "Cena za hodinu hlídání byla nastavena");
                } else {
                    popupToast("Chyba", "Došlo k chybě. Nepovedlo se nastavit cenu za hodinu hlídání", true);
                }
            } else {
                popupToast("Chyba", "Došlo k chybě, server ohlásil chybu", true);
            }
        };
        xhr.send(encodeURI(`price=${price}`));
    } else popupToast("Chyba", "Nastavte cenu za hodinu hlídání", true);
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
confirmRemove = (reservationID) => {
    let validWarning = $("#no-success-adminEdit"),
        errorWarning = $("#no-valid-adminEdit");
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
changeRole = (type, user, role) => {
    if (type !== "" && user !== "" && role !== "") {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/admin/changerole", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    popupToast("Chyba", response.error, true);
                } else if (response.confirmed) {
                    console.log(response.confirmed);
                    location.reload();
                }
            } else popupToast("Chyba", "Nepovedlo se změnit roli uživatele. Server ohlásil chybu.", true);
        };
        xhr.send(encodeURI(`type=${type}&user=${user}&role=${role}`));

    } else popupToast("Chyba", "ID uživatele nebylo vybráno, zkuste to znovu", true);
    return false;
},
removeReservation = (reservationID) => {
    document.getElementById('confirmBody').innerHTML = "Opravdu chcete odstranit vybranou rezervaci?<br/><br/><strong>Rezervace bude odstraněna i rodiči</strong><br/><span class='text-muted'>Pokud chcete jen zrušit potvrzení, nastavte žádného přiřazeného asistenta.</span>";
    document.getElementById('modalTitle').innerHTML = "Zrušit rezervaci";
    document.getElementById('cancelModal').innerHTML = "Nerušit";
    document.getElementById('confirmRemove').innerHTML = "Ano, zrušit";
    $('#confirmRemove').off().on("click", () => {confirmRemove(reservationID)});
    //$("#confirmRemove").attr("onclick", "confirmRemove('" + reservationID + "');");

    $('#confirmModal').modal('show');
},
removeAssistant = (assistantID, name, surname) => {
    document.getElementById('confirmBody').innerHTML = "Opravdu chcete odebrat uživatele <strong>" + name + " " + surname + "</strong> jako asistenta?<br/><br/>Uživatel zůstane v databázi jako rodič<br/><span class='text-muted'>Asistentovi budou odebrány všechny nastavené volné časy z databáze.</span>";
    document.getElementById('modalTitle').innerHTML = "Odebrat asistenta";
    document.getElementById('cancelModal').innerHTML = "Neodebírat";
    document.getElementById('confirmRemove').innerHTML = "Ano, odebrat";
    $('#confirmRemove').off().on("click", () => {changeRole("id", assistantID, "parent")});
    //$("#confirmRemove").attr("onclick", "changeRole('id', '" + assistantID + "', 'parent');");
    $('#confirmModal').modal('show');
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