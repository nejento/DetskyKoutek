document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addChildModal').addEventListener('submit',  (e) => {e.preventDefault(); addChildren(true);});
});

const addChildren = () => {
    let name = $("#addChildModal [name='jmeno']")[0].value,
        surname = $("#addChildModal [name='prijmeni']")[0].value,
        birthdateParse = /(\d{1,2})[.\s]*(\d{1,2})[.\s]*(\d{4})/.exec($("#addChildModal [name='vek']")[0].value),
        note = $("#addChildModal [name='poznamka']")[0].value,
        phone = $("#addChildModal [name='phone']")[0].value,
        birthdate = new Date(parseInt(birthdateParse[3]), parseInt(birthdateParse[2]) - 1, parseInt(birthdateParse[1]), parseInt(birthdateParse[1]), parseInt(birthdateParse[2]));

    if (name !== "" && surname !== "" && /^[+]?[()/0-9. -]{9,}$/.test(phone) && birthdate !== null) {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/user/children/first", true);
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

        xhr.send(encodeURI(`name=${name}&surname=${surname}&birthdate=${birthdate.toISOString()}&parentnote=${note}&phone=${phone}`));
    } else {
        $("#no-valid").show();
    }
};