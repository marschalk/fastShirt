const   Log = require('./classes/Log.js');
const   log = new Log();
		Shop = require('./classes/Shop.js'),
        Spreadshirt = require('./classes/Spreadshirt.js');
		Redbubble = require('./classes/Redbubble.js');
		Shirtee = require('./classes/Shirtee.js');

const   fs = require('fs'),
        readline = require('readline'),
        puppeteer = require('puppeteer'),
		os = require('os'),
		csv = require('fast-csv');

const package = require('./package.json');
const config = require('./config.json');
const csvFile = './upload.csv';

log.info('--- '+package.name+' '+package.version+' ---');

let aCSVData = [];
let aCSVHeader = [];
fs.createReadStream(csvFile)
.pipe(csv({headers: true, delimiter:','}))
.on('data', function(data) {
	aCSVData.push(data);

	if(aCSVHeader.length == 0) {
		for(let key in data) {
			aCSVHeader.push(key);
		}
	}
})
.on('end', function(data){
	(async () => {

		if(config.spreadshirt) {
			for(var x = 0; x < config.spreadshirt.length; ++x) {
				await runShop(Spreadshirt, config.spreadshirt[x]);
			}
		}

		if(config.redbubble) {
			for(var x = 0; x < config.redbubble.length; ++x) {
				await runShop(Redbubble, config.redbubble[x]);
			}
		}

		if(config.shirtee) {
			for(var x = 0; x < config.shirtee.length; ++x) {
				await runShop(Shirtee, config.shirtee[x]);
			}
		}
	})();
});

function runShop(shopClass, shopConf) {
	if(shopConf['skip']) {
		log.info('skip '+shopConf['server']);
	}else {
		const shopObj = new shopClass(shopConf);

		shopObj.connect().then(() => {
			shopObj.login().then(() => {
				uploadFile(shopObj, 0, shopConf['csvCheckField']);
			}).catch((err) => {
				log.error('Login failed: '+ shopObj.server + ' with '+ shopObj.user);
				const rl = readline.createInterface(process.stdin, process.stdout);
				rl.question('Try again (y/n): ', (answer) => {
					rl.close();
					if(answer.toLowerCase() == 'y') {
						uploadFile(shopObj, 0, shopConf['csvCheckField']);
					}else {
						shopObj.close();
					}
				});
			});
		}).catch((err) => {
			log.error('Connection failed: '+ shopObj.server);
			log.info(err);
		});
	}
}

function uploadFile(obj, counter, fieldShopKey) {
	if(aCSVData[counter]) {
		let aRow = aCSVData[counter];

		obj.setMeta({
			"de": {
				"title": aRow['title_de'],
				"description": aRow['description_de'],
				"keywords": correctKeywords(aRow['keywords_de'])
			},
			"en": {
				"title": aRow['title_en'],
				"description": aRow['description_en'],
				"keywords": correctKeywords(aRow['keywords_en'])
			}
		});

		obj.setShirtColor(aRow['shirt_color']);
		obj.setTemplate(aRow['template']);

		// 0 = no upload
		// 2 = already uploaded
		if(aRow[fieldShopKey] == 1 && obj.checkConf()) {
			log.info('Upload '+(counter + 1)+' of '+ aCSVData.length + ' - '+obj.server);

			var path = aRow['path'];
			// redbubble path, because a different size is uploaded here
			if(obj.path) {
					path = aRow['path'] + '/' + obj.path;
			}
			log.info(`path: ${path}`);

			// the file exists?
			if(!fileExists(path + aRow['file'])) {
					//log.info('File Not Found: ' + aRow['path'] + aRow['file']);
					log.info('File Not Found: ' + path + aRow['file']);
					uploadFile(obj, counter + 1, fieldShopKey);
			}else {
					obj.uploadDesign(path + aRow['file'], aRow['file']).then(() => {
							obj.editDesign().then(() => {
									aCSVData[counter][fieldShopKey] = 2;
									updateCSV();
									uploadFile(obj, counter + 1, fieldShopKey);
							}).catch((err) => {
									log.info(err);
									const rl = readline.createInterface(process.stdin, process.stdout);
									rl.question('Try again (y/n): ', (answer) => {
											rl.close();
											if(answer.toLowerCase() == 'y') {
													uploadFile(obj, counter, fieldShopKey);
											}else {
													uploadFile(obj, counter + 1, fieldShopKey);
											}
									});
							});
					}).catch((err) => {
							log.info(err);
					});
			}
		}else {
			//log.info('Skip '+(counter + 1)+' von '+ aCSVData.length + ' - '+obj.server);

			uploadFile(obj, counter + 1, fieldShopKey);
		}
	}else {
		updateCSV();
		log.info(obj.server + ' success');
		obj.close();
	}
}

function updateCSV() {
	let ws = fs.createWriteStream(csvFile);

	let aCSVFileData = [aCSVHeader];

	for(var i = 0; i < aCSVData.length; ++i) {
		let aRow = aCSVData[i];
		let x = 0;
		let aCSVRow = [];

		for(let key in aRow){
			aCSVRow.push(aRow[key]);
		}

		aCSVFileData.push(aCSVRow);
	}

	csv.write(aCSVFileData, {headers: true, delimiter:','})
	.pipe(ws);
}

function fileExists(filePath) {
    try {
        return fs.statSync(filePath).isFile();
    }catch (err) {
        return false;
    }
}

function correctKeywords(keywords) {
	if(!keywords == '') {
		//replace the ';' with a ',' for use as comma seperated keywords
		keywords = keywords.replace(/;/g,",");
		log.info('replaced semicolon in keywords with commas for real power usage :-) :' + keywords);
	}
	return keywords;
}
