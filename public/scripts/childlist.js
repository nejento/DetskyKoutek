document.addEventListener('DOMContentLoaded', () => {
    //document.getElementById('addChildModal').addEventListener('submit',  (e) => {e.preventDefault(); addChildren(true);});
    document.querySelectorAll('.editChildren').forEach(item => {
        item.addEventListener('submit', event => {
            event.preventDefault();
            editChildren(event.target.getAttribute("data-childid"));
        });
    });
    document.querySelectorAll('.removeChildren').forEach(item => {
        item.addEventListener('click', event => {
            let id = event.target.getAttribute("data-childid"),
                name = event.target.getAttribute("data-childnme"),
                surname = event.target.getAttribute("data-childsurname");
            removeChildren(id, name, surname);
        });
    });
    document.getElementById('modal-form').addEventListener('submit',  (e) => {e.preventDefault(); addChildren();});
    document.getElementById('changeContact').addEventListener('submit',  (e) => {e.preventDefault(); editPhone();});
});

const addChildren = () => {
    let name = $("#addChildModal [name='jmeno']")[0].value,
        surname = $("#addChildModal [name='prijmeni']")[0].value,
        birthdateParse = /(\d{1,2})[.\s]*(\d{1,2})[.\s]*(\d{4})/.exec($("#addChildModal [name='vek']")[0].value),
        note = $("#addChildModal [name='poznamka']")[0].value,
        birthdate = new Date(parseInt(birthdateParse[3]), parseInt(birthdateParse[2]) - 1, parseInt(birthdateParse[1]), parseInt(birthdateParse[1]), parseInt(birthdateParse[2]));

    if (name !== "" && surname !== "" && birthdate !== null) {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/user/children/new", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    document.getElementById("no-success").innerText = response.error;
                    $('#no-success').show();
                } else if (response.confirmed) {
                    location.reload();
                } else {
                    document.getElementById("no-success").innerText = "Došlo k chybě, zkuste to prosím znovu.";
                    $('#no-success').show();
                }
            } else {
                document.getElementById("no-success").innerText = "Nepovedlo se přidat díte do databáze. Server ohlásil chybu.";
                $('#no-success').show();
            }
        };

        xhr.send(encodeURI(`name=${name}&surname=${surname}&birthdate=${birthdate.toISOString()}&parentnote=${note}`));
    } else {
        $("#no-valid").show();
    }
},
editChildren = (diteID) => {
    let name = $("#collapse_" + diteID + " [name='jmeno']")[0].value,
        surname = $("#collapse_" + diteID + " [name='prijmeni']")[0].value,
        birthdateParse = /(\d{1,2})[.\s]*(\d{1,2})[.\s]*(\d{4})/.exec($("#collapse_" + diteID + " [name='vek']")[0].value),
        note = $("#collapse_" + diteID + " [name='poznamka']")[0].value,
        birthdate = new Date(parseInt(birthdateParse[3]), parseInt(birthdateParse[2]) - 1, parseInt(birthdateParse[1]), parseInt(birthdateParse[1]), parseInt(birthdateParse[2]));

    if (name !== "" && surname !== "" && birthdate !== null) {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/user/children/edit", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    document.getElementById("no-success").innerText = response.error;
                    $('#no-success').show();
                } else if (response.confirmed) {
                    location.reload();
                } else {
                    document.getElementById("no-success").innerText = "Došlo k chybě, zkuste to prosím znovu.";
                    $('#no-success').show();
                }
            } else {
                document.getElementById("no-success").innerText = "Nepovedlo se přidat dítě do databáze. Server ohlásil chybu.";
                $('#no-success').show();
            }
        };
        xhr.send(encodeURI(`diteid=${diteID}&name=${name}&surname=${surname}&birthdate=${birthdate.toISOString()}&parentnote=${note}`));
    } else {
        $("#no-valid").show();
    }
},
editPhone = () => {
    let phone = $("#changeContact [name='phone']")[0].value;

    if (/^[+]?[()/0-9. -]{9,}$/.test(phone)) {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/user/children/editphone", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    document.getElementById("no-success-phone").innerText = response.error;
                    $('#no-success').show();
                } else if (response.confirmed) {
                    location.reload();
                } else {
                    document.getElementById("no-success-phone").innerText = "Došlo k chybě, zkuste to prosím znovu.";
                    $('#no-success').show();
                }
            } else {
                document.getElementById("no-success-phone").innerText = "Nepovedlo se přidat dítě do databáze. Server ohlásil chybu.";
                $('#no-success').show();
            }
        };
        xhr.send(encodeURI(`phone=${phone}`));
    } else {
        $("#no-valid-phone").show();
    }
},
removeChildren = (diteID, name, surname) => {
    document.getElementById('confirmBody').innerHTML = "Opravdu chcete odebrat ze seznamu dítě <strong>" + name + " " + surname + "</strong>?";
    $('#confirmRemove').off().on("click", () => {confirmRemove(diteID)});
    //$("#confirmRemove").attr("onclick", "confirmRemove('" + diteID + "');");
    $('#confirmModal').modal('show');
},
confirmRemove = (diteID) => {
    if (diteID !== null) {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/user/children/remove", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    document.getElementById("no-success").innerText = response.error;
                    $('#no-success').show();
                } else if (response.confirmed) {
                    location.reload();
                } else {
                    document.getElementById("no-success").innerText = "Došlo k chybě, zkuste to prosím znovu.";
                    $('#no-success').show();
                }
            } else {
                document.getElementById("no-success").innerText = "Nepovedlo se odebrat dítě z databáze. Server ohlásil chybu.";
                $('#no-success').show();
            }
        };
        xhr.send(encodeURI(`diteid=${diteID}`));
    } else {
        $("#no-valid").show();
    }
};