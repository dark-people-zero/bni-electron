window.$ = window.jQuery = require("jquery");
const { ipcRenderer } = require('electron');
const ipc = ipcRenderer;
const moment = require("moment");

const config = ipc.sendSync("config");

closeBtn.addEventListener('click', () => ipc.send("win:close", {child: false}));
minimizeBtn.addEventListener('click', () => ipc.send('win:minimize', {child: false}));
maxResBtnFull.addEventListener('click', () => {
    document.getElementById("maxResBtnFull").style.display = 'none';
    document.getElementById("minResBtnFull_exit").style.display = 'inline-block';

    ipc.send("win:maximizeRestore", {child: false});
})
minResBtnFull_exit.addEventListener('click', () => {
    document.getElementById("maxResBtnFull").style.display = 'inline-block';
    document.getElementById("minResBtnFull_exit").style.display = 'none';
    ipc.send("win:maximizeRestore", {child: false});
})

let intervalRobot = null;

function getData() {
    $(".loading-table").addClass("show");
    $.ajax({
        type: "get",
        url: config.baseurl+"/transaction",
        dataType: "json",
        success: function (res) {
            $(".loading-table").removeClass("show");
            $("#statusRobot").attr("class", "spinner-grow text-success");
            if (res.status) {
                var tbody = $("#tableRequest tbody");
                tbody.children().remove();
                if (res.data.length > 0) {
                    const datax = [...new Map(res.data.map((m) => [m.account.username, m])).values()];
                    datax.forEach((e,i) => {
                        var d_start = moment(e.date_start).locale('id').format("DD MMMM YYYY");
                        var d_end = moment(e.date_end).locale('id').format("DD MMMM YYYY");
                        var tr = $(`
                            <tr class="text-center">
                                <td>${i+1}</td>
                                <td>${e.account.username}</td>
                                <td>${e.account.norek}</td>
                                <td>
                                    <small class="badge rounded-pill text-bg-primary">${e.type}</small>
                                </td>
                                <td>${d_start}</td>
                                <td>${d_end}</td>
                                <td>
                                    ${e.status ? '<span class="material-symbols-outlined text-success fw-bold" style="font-size: large;">check_circle</span>' : '<div class="spinner-border spinner-border-sm text-info" role="status"></div>'}
                                </td>
                            </tr>
                        `);

                        tbody.append(tr);
                    });

                    var dataFilter = datax.filter((e,i) => i < 20);
                    dataFilter.forEach(e => {
                        ipc.send("win:create", e);
                    });
                }else{
                    tbody.append($(`
                        <tr>
                            <td colspan="7" class="text-center">Belum ada data request / data request tidak di temukan</td>
                        </tr>
                    `))
                }
            }
        },
        error: () => {
            $(".loading-table").removeClass("show");
            $("#statusRobot").attr("class", "spinner-grow text-warning");
        }
    });
}

function updateData(params) {
    var settings = {
        "url": config.baseurl+"/transaction/"+params.id,
        "method": "POST",
        "timeout": 0,
        "headers": {
          "Content-Type": "application/json"
        },
        "data": JSON.stringify({
          "data": params.data,
          "status": true
        }),
    };
      
    $.ajax(settings).done(function (response) {
        console.log(response);
    });
}

ipc.on("update:data", (event, params) => updateData(params));

// start robot 
$("#startRobot").click(function() {
    startRobot();
})

// // stop robot 
$("#stopRobot").click(function() {
    $(this).hide();
    $("#startRobot").show();
    $("#statusRobot").attr("class", "spinner-grow text-danger");
    $(".loading-table").removeClass("show");

    if(intervalRobot) clearInterval(intervalRobot);

    var tbody = $("#tableRequest tbody");
    tbody.children().remove();
    tbody.append($(`
        <tr>
            <td colspan="7" class="text-center">Belum ada data request / data request tidak di temukan</td>
        </tr>
    `))
})

function startRobot() {
    $("#startRobot").hide();
    $("#stopRobot").show();
    $("#statusRobot").attr("class", "spinner-grow text-warning");
    getData();
    intervalRobot = setInterval(() => getData(), 10000);
}

document.addEventListener("DOMContentLoaded", function () { 
    startRobot();
})