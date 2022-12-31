
(async() => {
    var rangeDate = getDaysArray(now,now);
    var x = await readerPdf(path.join(os.tmpdir(), 'OpTransactionHistoryTpr30-12-2022.pdf'),rangeDate);
    console.log(x);
})()
// C:\Users\darkp\AppData\Local\Temp\OpTransactionHistoryTpr30-12-2022.pdf
// export GH_TOKEN=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 && npm run publish
