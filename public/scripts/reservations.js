$('#date.form-control').datepicker({
    format: "dd. mm. yyyy",
    language: "cs",
    startDate: '0d',
    autoclose: true
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addReservation').addEventListener('submit',  (e) => {e.preventDefault(); newReservation();});
    document.querySelectorAll('.removeReservation').forEach(item => {
        item.addEventListener('click', event => {
            removeReservation(event.target.getAttribute("data-resid"));
        });
    });
});

const newReservation = () => {
    if (document.getElementById("date").value !== "" && document.getElementById("timeFrom").value !== "" && document.getElementById("timeTo").value !== "") {
        let dateParse = /(\d{1,2})[.\s]*(\d{1,2})[.\s]*(\d{4})/.exec(document.getElementById("date").value),
            startTimeParse = /([01]?[0-9]|2[0-3])[:.,]([0-5][0-9])/.exec(document.getElementById("timeFrom").value),
            endTimeParse = /([01]?[0-9]|2[0-3])[:.,]([0-5][0-9])/.exec(document.getElementById("timeTo").value),
            startDate = new Date(parseInt(dateParse[3]), parseInt(dateParse[2]) - 1, parseInt(dateParse[1]), parseInt(startTimeParse[1]), parseInt(startTimeParse[2])),
            endDate = new Date(parseInt(dateParse[3]), parseInt(dateParse[2]) - 1, parseInt(dateParse[1]), parseInt(endTimeParse[1]), parseInt(endTimeParse[2])),
            childID = $('#childSelector').val();

        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/user/reservations/new", true);
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
                document.getElementById("no-success").innerText = "Nepovedlo se přidat rezervaci. Server ohlásil chybu.";
                $('#no-success').show();
            }
        };

        xhr.send(encodeURI(`childid=${childID}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`));

    } else {
        $("#no-valid").show();
    }
    return false;
},
removeReservation = (reservationID) => {
    //Opravdu chcete zrušit tuto rezervaci <strong></strong> pro
    let name = $("#reservation_" + reservationID + " h5")[0].innerText,
        date = $("#reservation_" + reservationID + " p")[0].innerText;
    document.getElementById('confirmBody').innerHTML = "Opravdu chcete zrušit rezervaci <strong>" + date + "</strong> pro <strong>" + name + "</strong>?";
    $('#confirmRemove').off().on("click", () => {confirmRemove(reservationID)});
    //$("#confirmRemove").attr("onclick", "confirmRemove('" + reservationID + "');");
    $('#confirmModal').modal('show');
},
confirmRemove = (reservationID) => {
    if (reservationID !== null) {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/user/reservations/remove", true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                if (response.error) {
                    document.getElementById("no-success-remove").innerText = response.error;
                    $('#no-success').show();
                } else if (response.confirmed) {
                    location.reload();
                } else {
                    document.getElementById("no-success-remove").innerText = "Došlo k chybě, zkuste to prosím znovu.";
                    $('#no-success').show();
                }
            } else {
                document.getElementById("no-success-remove").innerText = "Nepovedlo se zrušit rezervaci. Server ohlásil chybu.";
                $('#no-success').show();
            }
        };
        xhr.send(encodeURI(`reservationid=${reservationID}`));
    } else {
        $("#no-valid-remove").show();
    }
};