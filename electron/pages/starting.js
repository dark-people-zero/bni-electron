const {ipcRenderer} = require('electron');

let version = window.location.hash.substring(1);
document.getElementById('version').innerText = version;
console.log("sudah mulai");
ipcRenderer.on('message', function(event, text) {
    console.log(text);
    document.getElementById('messages').innerText = text;
})

ipcRenderer.on("download", (e, opt) => {
    document.getElementById("totalDownload").innerText = opt.total;
    document.getElementById("block-network").style.display = "flex";
    document.querySelector("#block-network font").innerText = opt.network;
})