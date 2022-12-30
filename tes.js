const readerPdf = require("./readerPdf");
const moment = require("moment");
const path = require("path");
const os = require("os");
const now = moment().format("YYYY-MM-DD");
var getDaysArray = function(start, end) {
    for(var arr=[],dt=new Date(start); dt<=new Date(end); dt.setDate(dt.getDate()+1)){
        arr.push(moment(dt));
    }
    return arr;
};

(async() => {
    var rangeDate = getDaysArray(now,now);
    var x = await readerPdf(path.join(os.tmpdir(), 'OpTransactionHistoryTpr30-12-2022.pdf'),rangeDate);
    console.log(x);
})()
// C:\Users\darkp\AppData\Local\Temp\OpTransactionHistoryTpr30-12-2022.pdf