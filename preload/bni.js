const { ipcRenderer } = require('electron');
const moment = require("moment");
moment.locale('en');
var dataRekening = ipcRenderer.sendSync("active-list-rekening");
window.$ = window.jQuery = require("jquery");
var statusRobot = false;
var interValRobot, intTime;
var time = dataRekening.interval;

ipcRenderer.on("start", (e) => {
    runInterval();
})

ipcRenderer.on("stop", (e) => {
    statusRobot = false;
    clearInterval(interValRobot);
    clearInterval(intTime);
    localStorage.removeItem("startTime");
    localStorage.removeItem("runProses");
    localStorage.removeItem("clickSaldo");
    localStorage.removeItem("getSaldo");
})

ipcRenderer.on("getMutasi", (event) => {
    var date = document.querySelector('input[name="duration"]').value;
    date = date.split(' - ')[1];
    date = moment(date, "DD MMM YYYY").format('YYYY-MM-DD');
    var tr = document.querySelectorAll('.table tbody tr');
    var dt = [...tr].map(e => {
        var dateReal = e.children[0].textContent;
        if (dateReal.toLocaleLowerCase().includes('pend')) {
            dateReal = date;
        }else{
            dateReal = moment(dateReal, "DD/MM").format("YYYY-MM-DD");
        }
        var trxDt = dateReal
        var trailer = e.children[1].textContent
        var txnAmount = e.children[2].textContent
        var txnType = e.children[2].classList.contains('text-danger') ? 'D' : 'C';
        return {
            trxDt, trailer, txnAmount, txnType
        }
    });

    var section = document.querySelector('.table').closest('section');
    var small = section.querySelectorAll('small');
    small = [...small].find(e => e.textContent.toLocaleLowerCase().includes('saldo akhir'))
    var saldo = small.closest('div').querySelector('h5').textContent;
    
    ipcRenderer.send("update-mutasi", {
        rek: dataRekening,
        data: {
            saldo: saldo,
            mutasi: dt,
            startDate: dt[0].trxDt,
            endDate: dt[0].trxDt
        }
    });
});

ipcRenderer.on("show:notif", () => {
    var html = $(`
        <div style="position: relative; padding: 1rem; color: #084298; background-color: #cfe2ff; border: 1px solid #b6d4fe; border-radius: 0.375rem; max-width: 995px; margin: auto; margin-bottom: 1rem;">
            Mutasi berhasil di kirimkan.
        </div>
    `);
    $("#header").append(html);
    setTimeout(() => {
        html.remove();
    }, 3000);
})

var startTime = localStorage.getItem("startTime");
if ( startTime || startTime == "true") {
    runInterval();
}

var runProses = localStorage.getItem("runProses");
if (runProses || runProses == "true") {
    FunrunProses();
}

function runInterval() {
    if (!statusRobot) {
        localStorage.setItem("startTime", true);
        statusRobot = true;
        var span = $(`<span class="time">${time}</span>`);
        span.css("font-weight", "bold");
        span.css("font-size", "30px");
        span.css("color", "#FFF");
        span.css("margin-left", "20px");
        intTime = setInterval(() => {
            time = time - 1;
            span.text(time);
        }, 1000);
        $('#locationbar p span').first().append(span);
        interValRobot = setInterval(() => {
            FunrunProses();
            time = dataRekening.interval;
            span.text(time);
        }, dataRekening.interval*1000);
    }
}

function FunrunProses() {
    localStorage.setItem("runProses", true);
    var clickSaldo = localStorage.getItem("clickSaldo");
    if (clickSaldo || clickSaldo == "true") {
        var getSaldo = localStorage.getItem("getSaldo");
        if (getSaldo || getSaldo == "true") {
            setTimeout(() => {
                if (document.querySelector('div[role="alert"]')) {
                    var err = document.querySelector('div[role="alert"]').textContent;
                    ipcRenderer.send("update-mutasi", {
                        rek: dataRekening,
                        data: err,
                        date: moment(date, 'DD-MMM-YYYY hh:mm:ss').format("YYYY-MM-DD")
                    });
                }else{
                    document.querySelector("#okButton").click();
                }

                localStorage.removeItem("runProses");
                localStorage.removeItem("clickSaldo");
                localStorage.removeItem("getSaldo");
            }, 2000);
        }else{
            var date = document.querySelector('#lastLogin').textContent;
            var td = document.querySelectorAll("#SummaryList tbody tr td");
            td = [...td].map(e => e.textContent.replaceAll('\n',''));
            ipcRenderer.send("update-saldo", {
                rek: dataRekening,
                data: td,
                date: moment(date, 'DD-MMM-YYYY hh:mm:ss').format("YYYY-MM-DD")
            });

            localStorage.setItem("getSaldo", true);
            setTimeout(() => {
                document.querySelector("#VIEW_TRANSACTION_HISTORY").click();
            }, 1000);
        }
    }else{
        localStorage.setItem("clickSaldo", true);
        document.querySelector("#Informasi-Saldo--Mutasi_Mutasi-Tabungan--Giro").click();
    }
}