document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('yearSelector').addEventListener('change',  () => getMonths());
    document.querySelectorAll('.removeReservation').forEach(item => {
        item.addEventListener('click', event => {
            removeReservation(event.target.getAttribute("data-resid"));
        });
    });
});

const monthNames = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"],
getMonths = () => {
    let year = $("#yearSelector").val();
    if (year !== "") {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/user/getmonths", true);
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
popupToast = (title, body, error = false) => {
    let clone = document.getElementById('template_toast').content.cloneNode(true);
    $('#toastList').append(clone);
    if (error) $('.toast:last .toast-header').removeClass("bg-fptul").addClass("bg-danger");
    $('.toast:last .title')[0].innerHTML = title;
    $('.toast:last .toast-body')[0].innerHTML = body;
    $('.toast:last').toast({delay: 8000});
    $(".toast:last").toast('show');
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