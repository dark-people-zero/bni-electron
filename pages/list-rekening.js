window.$ = window.jQuery = require("jquery");
const { ipcRenderer } = require('electron');

var dataRekening = ipcRenderer.sendSync("get-list-rekening");
var configGoogleSheet = ipcRenderer.sendSync("get-config-google-sheet");
var tableRekening = $("#tableRekening");

function setTable(data) {
    $(".loading").removeClass("show");
    if (data.length > 0) {
        tableRekening.find("tbody").children().remove();
        data.forEach((val,i) => {
            var tr = $(`
                <tr class="text-center">
                    <td>${i+1}</td>
                    <td>${val.username}</td>
                    <td>${val.password}</td>
                    <td>${val.norek}</td>
                    <td>${val.interval}s</td>
                    <td>
                        <div class="d-flex justify-content-center align-items-center">
                            <a href="javascript:void(0);" class="play-mutasi me-2" data-username="${val.username}">
                                <span class="material-symbols-outlined">play_circle</span>
                            </a>
                            <a href="javascript:void(0);" class="update-mutasi  me-2" data-username="${val.username}">
                                <span class="material-symbols-outlined">edit</span>
                            </a>
                            <a href="javascript:void(0);" class="delete-mutasi text-danger" data-username="${val.username}">
                                <span class="material-symbols-outlined text-danger">delete</span>
                            </a>
                        </div>
                    </td>
                </tr>
            `)

            tr.find(".update-mutasi").click(function() {
                var username = $(this).data("username");
                var data = dataRekening.find(e => e.username == username);
                $("#username").val(data.username);
                $("#password").val(data.password);
                $("#norek").val(data.norek);
                $("#interval").val(data.interval);

                $('input[name="method"]').val("put-"+username);

                $("#titleForm").text("Form Update");
                $("#modalForm").modal("show");

            })

            tr.find(".delete-mutasi").click(function() {
                var username = $(this).data("username");
                dataRekening = dataRekening.filter(e => e.username != username);
                setTable(dataRekening);
                ipcRenderer.send("put-list-rekening", dataRekening);
            })

            tr.find(".play-mutasi").click(function() {
                var username = $(this).data("username");
                var index = dataRekening.findIndex(e => e.username == username);
                dataRekening[index].status = true;
                ipcRenderer.send("put-list-rekening", dataRekening);
                ipcRenderer.send("play-mutasi");
            })

            tableRekening.find("tbody").append(tr);
        });
    }else{
        tableRekening.find("tbody").children().remove();
        var tr = $(`
            <tr>
                <td colspan="7" class="text-center">Belum ada data rekening / data rekening tidak di temukan</td>
            </tr>
        `)
        tableRekening.find("tbody").append(tr)
    }
}

function updateBtnConfigGoogleSheet() {
    if (configGoogleSheet.status !== undefined) {
        $("#setGoogleSheet").addClass("d-none");
        $("#updateGoogleSheet").removeClass("d-none");
        if (configGoogleSheet.status) {
            $("#startGoogleSheet").addClass("d-none");
            $("#stopGoogleSheet").removeClass("d-none");
        }else{
            $("#startGoogleSheet").removeClass("d-none");
            $("#stopGoogleSheet").addClass("d-none");
        }
    }else{
        $("#setGoogleSheet").removeClass("d-none");
    }

    $(".loading").removeClass("show");
}

$("#setGoogleSheet").click(() => {
    $("#typeFormGoogleSheet").val("post");
    $("#titleGoogleSheet").text("Set Config Google Sheet");
    $("#modalGoogleSheet").modal("show");
});
$("#updateGoogleSheet").click(() => {
    $("#typeFormGoogleSheet").val("put");
    $("#titleGoogleSheet").text("Update Config Google Sheet");
    $("#spreadsheetId").val(configGoogleSheet.spreadsheetId);
    $("#range").val(configGoogleSheet.range);
    $("#modalGoogleSheet").modal("show");
});

setTable(dataRekening);
updateBtnConfigGoogleSheet();

$("#searchRekening").keyup(function() {
    var val = $(this).val();
    console.log(val);
    if (val == "") {
        setTable(dataRekening);
    }else{
        var newData = dataRekening.filter(e => {
            return e.username.includes(val) || e.password.includes(val) || e.norek.includes(val);
        });

        setTable(newData);
    }
})

$("#btnAdd").click(() => {
    $("#titleForm").text("Form Add");
    $('input[name="method"]').val("post");
    $("#modalForm").modal("show");
})

$("#formGlobal").submit(function(e) {
    e.preventDefault();
    var data = {};
    var form = $(this).serialize();
    form.split("&").forEach(e => {
        var x = e.split("=");
        data[x[0]] = x[1];
    });
    $("#modalForm").modal("hide");
    $(".loading").addClass("show");
    
    if (data.method == "post") {
        data.status = false;
        dataRekening.push(data);
    }

    if (data.method.includes("put")) {
        var username = data.method.replaceAll("put-","");
        var index = dataRekening.findIndex(e => e.username == username);
        data.method = "put";
        dataRekening[index] = data;
    }
    setTable(dataRekening);

    ipcRenderer.send("put-list-rekening", dataRekening);
})

$("#modalForm").on("hidden.bs.modal", e => {
    $("#formGlobal").trigger("reset");
})

$("#modalGoogleSheet").on("hidden.bs.modal", e => {
    $("#formGoogleSheet").trigger("reset");
})

$("#formGoogleSheet").submit(function(e) {
    e.preventDefault();
    $("#modalGoogleSheet").modal("hide");
    $(".loading").addClass("show");
    var method = $("#typeFormGoogleSheet").val();
    var spreadsheetId = $("#spreadsheetId").val();
    var range = $("#range").val();

    configGoogleSheet.spreadsheetId = spreadsheetId;
    configGoogleSheet.range = range;
    
    if (method == "post") configGoogleSheet.status = true;

    ipcRenderer.send("put-config-google-sheet", configGoogleSheet);

    updateBtnConfigGoogleSheet();
});

$("#startGoogleSheet").click(() => {
    configGoogleSheet.status = true;
    $(".loading").addClass("show");
    ipcRenderer.send("put-config-google-sheet", configGoogleSheet);

    updateBtnConfigGoogleSheet();
})

$("#stopGoogleSheet").click(() => {
    configGoogleSheet.status = false;
    $(".loading").addClass("show");
    ipcRenderer.send("put-config-google-sheet", configGoogleSheet);

    updateBtnConfigGoogleSheet();
})