const fs = require('fs')
const pdfParse = require('pdf-parse')
const moment = require("moment");

const readerPdf = async (file, date) => {
  let readFileSync = fs.readFileSync(file)
  try {
    var hasil = [];
    await pdfParse(readFileSync, {
        pagerender: function(pageData) {
			let now = date.map(e => {
				return {
					id: e.locale('id').format('DD-MMM-YYYY'),
					en: e.locale('en').format('DD-MMM-YYYY'),
					year: e.format('YYYY')
				}
			})

			let render_options = {
				//replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
				normalizeWhitespace: true,
				//do not attempt to combine same line TextItem's. The default value is `true`.
				disableCombineTextItems: false
			}
		 
			return pageData.getTextContent(render_options).then(function(textContent) {
				let text = '', start = false;
				var satuLine = true;
				var resultJson = [];
				var items = textContent.items.filter(e => e.height == 12);
				items.forEach(item => {
					now.forEach(e => {
						if (item.str.includes(e.id) || item.str.includes(e.en)) start = true;
					});

					if (start) {
						if (item.str.includes("No")) {
							if (item.str.length == 2) satuLine = false;
						}
						
						if (satuLine){
							text += "|"+item.str;
						}else{
							text += "|"+item.str+"#";
							resultJson.push(text);
							text = "";
							satuLine = true;
						}
					}
				});
				return "##"+JSON.stringify(resultJson);
			});
		}
    }).then(e => {
        var y = date.map(e => e.format('YYYY'));
        var text = e.text.replaceAll('\n','').split('##').filter(e => e != '').map(e => JSON.parse(e)).reduce((a,b) => a.concat(b));

        hasil = text.map((e,i) => {
            var t1 = e.includes("|Transaksi") ? e.split("|Transaksi").at(-1) : e;
			
			y.forEach(year => {
				if (t1.includes(year)) {
					t1 = t1.split(year+"|");
					t1[0] = t1[0]+year;
				}
			});
			
            var t2 = t1[1].replaceAll("|Db.", "##|Db.").replaceAll("|Cr.", "##|Cr.").split("##|");
            var t3 = t2[1].replaceAll("Db.", "Db.##").replaceAll("Cr.", "Cr.##").split(".##|");
            var t4 = t3[1].split("|")
            var res = {
                tanggal: t1[0].replaceAll("|", ""),
                transaksi: t2[0].replaceAll("|Tanpa Kategori","").replaceAll("|"," "),
                type: t3[0],
                jumlah: t4[0],
                saldo: t4[1]
            }

            return res;
        });
    })

    return hasil;
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = readerPdf;