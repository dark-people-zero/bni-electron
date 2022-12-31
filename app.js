const {app, BrowserWindow, ipcMain, Menu} = require('electron');
const log = require('electron-log');
const { autoUpdater } = require("electron-updater");
const isDev = require("electron-is-dev");
const path = require("path");
const fs = require("fs");
const io = require("socket.io-client");
const os = require('os');
const storage = require('electron-json-storage');
storage.setDataPath(os.tmpdir());
const UserAgent = require("user-agents");
const moment = require("moment");
const readerPdf = require('./readerPdf');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

let statusRobot = false;

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
var templateMenu = [
    {
        label: 'Start Robot',
        click() { 
            if (!statusRobot) {
                statusRobot = true;
                script.FunrunProses();
            }
        }
    },
    {
        label: 'Stop Robot',
        click() { 
            // if(bankWindows) bankWindows.webContents.send("stop");
            script.stopCountDown();
        }
    },
    {
        label: 'Reload',
        click() {
            if(bankWindows) bankWindows.webContents.executeJavaScript(`
                window.location.reload();
            `)
        }
    }
]

let starting, listRekening, bankWindows, socket;
function sendStatusToWindow(text) {
    log.info(text);
    starting.webContents.send('message', text);
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function createStarting() {
    starting = new BrowserWindow({
        frame: false,
        minWidth: 100,
        minHeight: 100,
        height: 100,
        width: 100,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        resizable: false,
    });
    // starting.webContents.openDevTools();
    starting.on('closed', () => starting = null);
    starting.loadURL(`file://${__dirname}/pages/starting.html#v${app.getVersion()}`);
    setTimeout(() => {
        if (isDev) {
            func.init();
        }else{
            autoUpdater.checkForUpdatesAndNotify();
        }
    }, 500);
}

function listRekeningWindows() {
    listRekening = new BrowserWindow({
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        resizable: false
    });
    listRekening.on('closed', () => listRekening = null);
    listRekening.loadURL(`file://${__dirname}/pages/list-rekening.html`);
    // listRekening.webContents.openDevTools();
}

var getDaysArray = function(start, end) {
    for(var arr=[],dt=new Date(start); dt<=new Date(end); dt.setDate(dt.getDate()+1)){
        arr.push(moment(dt));
    }
    return arr;
};

function createBankWindows() {
    const userAgent = new UserAgent({ deviceCategory: 'desktop' });
    bankWindows = new BrowserWindow({
        minWidth: 1000,
        minHeight: 750,
        width: 1000,
        height: 750,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        resizable: false
    });
    bankWindows.on('closed', () => {
        bankWindows = null;
        dataRekening.reset();
        listRekeningWindows();
    });
    bankWindows.webContents.session.on("will-download", (event, item, webContent) => {
        item.setSavePath(path.join(os.tmpdir(),item.getFilename()));
        item.on('updated', (event, state) => {
            if (state === 'interrupted') {
                console.log('Download is interrupted but can be resumed')
            }
        })
        item.once('done', async (event, state) => {
            if (state === 'completed') {
                const now = moment().format("YYYY-MM-DD");
                const rangeDate = getDaysArray(now,now);
                var data = await readerPdf(item.getSavePath(),rangeDate);
                var rek = dataRekening.active();
                socket.emit("updateData", {
                    type: "mutasi",
                    rek: rek,
                    data: data,
                    date: now
                });
                script.createNotif();
                script.countDown();
                setTimeout(() => {
                    script.FunrunProses();
                }, rek.interval*1000);
            } else {
              console.log(`Download failed: ${state}`)
            }
        })
    })
    
    bankWindows.webContents.session.clearCache();
    bankWindows.webContents.session.clearAuthCache();
    bankWindows.webContents.session.clearStorageData();
    bankWindows.webContents.setUserAgent(userAgent.toString());
    var url = "https://ibank.bni.co.id/corp/AuthenticationController?__START_TRAN_FLAG__=Y&FORMSGROUP_ID__=AuthenticationFG&__EVENT_ID__=LOAD&FG_BUTTONS__=LOAD&ACTION.LOAD=Y&AuthenticationFG.LOGIN_FLAG=1&BANK_ID=BNI01&LANGUAGE_ID=002";
    var urlLang01 = "https://ibank.bni.co.id/corp/AuthenticationController?__START_TRAN_FLAG__=Y&FORMSGROUP_ID__=AuthenticationFG&__EVENT_ID__=LOAD&FG_BUTTONS__=LOAD&ACTION.LOAD=Y&AuthenticationFG.LOGIN_FLAG=1&BANK_ID=BNI01&LANGUAGE_ID=001";

    try {
        bankWindows.webContents.debugger.attach('1.3');
    } catch (err) {
        console.log('Debugger attach failed: ', err);
        log.info('Debugger attach failed: ', err)
    }
    
    bankWindows.webContents.debugger.on('detach', (event, reason) => {
        console.log('Debugger detached due to: ', reason);
        log.info('Debugger detached due to: ', reason);
    });
      
    bankWindows.webContents.debugger.on('message', async (event, method, params) => {
        if (method === 'Network.responseReceived') {
            var url1 = params.response.url;
            if (url1 == url || url1 == urlLang01) {
                var dt = dataRekening.active();
                bankWindows.webContents.executeJavaScript(`
                    document.querySelector('input[name="AuthenticationFG.USER_PRINCIPAL"]').value = "${dt.username}";
                    document.querySelector('input[name="AuthenticationFG.ACCESS_CODE"]').value = "${dt.password}";
                    document.querySelector('input[name="AuthenticationFG.VERIFICATION_CODE"]').focus();
                `);
            }
        }
    })
        
    bankWindows.webContents.debugger.sendCommand('Network.enable');
    bankWindows.loadURL(url);
    // bankWindows.webContents.openDevTools();
    
}

const func = {
    init: () => {
        starting.close();
        listRekeningWindows();
    },
    playMutasi: () => {
        listRekening.close();
        createBankWindows();
    }
}

const dataRekening = {
    has: () => {
        storage.has('list-rekening', function(error, hasKey) {
            if (error) throw error;
          
            if (!hasKey) {
                storage.set('list-rekening', [], function(error) {
                    if (error) throw error;
                });
            }
        });
    },
    get: () => {
        return storage.getSync('list-rekening');
    },
    put: (data) => {
        storage.set('list-rekening', data, function(error) {
            if (error) throw error;
        });
    },
    active: () => {
        var data = dataRekening.get();
        return data.find(e => e.status);
    },
    reset: () => {
        var data = dataRekening.get();
        data = data.map(e => {
            e.status = false;
            return e;
        });
        
        storage.set('list-rekening', data, function(error) {
            if (error) throw error;
        });

    },
    clear: () => {
        storage.clear(function(error) {
            if (error) throw error;
        });
    }
}

const script = {
    countDown: () => {
        var dataRek = dataRekening.active();
        bankWindows.webContents.executeJavaScript(`
            if (!document.querySelector("#locationbar p span span.time")) {
                var timeDefault = ${dataRek.interval};
                var time = timeDefault;
                var span = document.createElement("span");
                span.classList.add("time");
                span.style.fontWeight = "bold";
                span.style.fontSize = "30px";
                span.style.color = "#FFF";
                span.style.marginLeft = "20px";
                span.textContent = timeDefault;
                var timeInterval = setInterval(() => {
                    time = time - 1;
                    span.textContent = time;
                    if (time == 0) time = timeDefault;
                }, 1000);
                document.querySelector("#locationbar p span").append(span);
            }
        `);
    },
    stopCountDown: () => {
        bankWindows.webContents.executeJavaScript(`clearInterval(timeInterval);`);
        statusRobot = false;
    },
    FunrunProses: () => {
        var dataRek = dataRekening.active();
        bankWindows.webContents.executeJavaScript('document.querySelector("#Informasi-Saldo--Mutasi_Mutasi-Tabungan--Giro").click();');
        setTimeout(() => {
            bankWindows.webContents.executeJavaScript('document.querySelector("#SummaryList").outerHTML;', true).then(e => {
                const dom = new JSDOM(e);
                var td = dom.window.document.querySelectorAll("table tbody tr td");
                var dt = [...td].map(e => e.textContent.replaceAll("\n", "").replaceAll(" ", ""));
                socket.emit("updateData", {
                    type: "saldo",
                    rek: dataRek,
                    data: dt,
                    date: moment().format("YYYY-MM-DD")
                });
                setTimeout(() => {
                    bankWindows.webContents.executeJavaScript('document.querySelector("#VIEW_TRANSACTION_HISTORY").click();');
                    setTimeout(() => {
                        bankWindows.webContents.executeJavaScript('document.querySelector("#okButton").click();');
                    }, 2000);
                }, 1000);
            })
        }, 1000);
    },
    createNotif: () => {
        bankWindows.webContents.executeJavaScript(`
            var div = document.createElement("div");
            div.style.position = "relative";
            div.style.padding = "1rem";
            div.style.color = "#084298";
            div.style.backgroundColor = "#cfe2ff";
            div.style.border = "1px solid #b6d4fe";
            div.style.borderRadius = "0.375rem";
            div.style.maxWidth = "995px";
            div.style.margin = "auto";
            div.style.marginLeft = "1rem";
            div.textContent = "Mutasi berhasil di kirimkan.";
            document.querySelector("#header").append(div);
            setTimeout(() => {
                div.remove();
            }, 3000);
        `)
    }
}

autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow("Check Vesion");
})

autoUpdater.on('update-available', (info) => {
    sendStatusToWindow("Update Available");
})

autoUpdater.on('error', (err) => {
    sendStatusToWindow('Error in auto-updater. ' + err);
})

autoUpdater.on('download-progress', (progressObj) => {
    var percent = Math.ceil(progressObj.percent);
    var transferred = formatBytes(progressObj.transferred);
    var total = formatBytes(progressObj.total);
    var speed = formatBytes(progressObj.bytesPerSecond);
    
    sendStatusToWindow('Downloaded ' + percent + '%');
    starting.webContents.send("download", {
        total: ' (' + transferred + "/" + total + ')',
        network: speed
    })
})

autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('Update downloaded');
    autoUpdater.quitAndInstall();
});

autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('Update not available.');
    func.init();
})

app.on('ready', function() {
    const menu = Menu.buildFromTemplate(templateMenu);
    Menu.setApplicationMenu(menu);
    createStarting();
    socket = io.connect("http://54.151.144.228:9994");
    // socket = io.connect("http://localhost:9994");
    dataRekening.has();
    // createBankWindows();
});

app.on('window-all-closed', () => {
    if (process.platform !== "darwin") app.quit();
});