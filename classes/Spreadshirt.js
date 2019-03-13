const puppeteer = require('puppeteer');

module.exports = class Spreadshirt extends Shop	{
	constructor(config) {
		super(config);
	}

	async connect() {
		this.browser = await puppeteer.launch({
			headless: true
		});

    this.page = await this.browser.newPage();
		this.page.setViewport({ width: 1024, height: 800});

		// seite aufrufen
    await this.page.goto(this.server);

		// cookie bestätigen
		await this.page.click('.cookie-banner .btn-primary');
	}

	async login() {
			await this.page.click('.login-form #loginUsername');
	    await this.page.keyboard.type(this.user);

	    await this.page.click('.login-form #loginPassword');
	    await this.page.keyboard.type(this.pw);

	    await this.page.click('.login-form #login-button');

	    await this.page.waitForNavigation();
	}

	async uploadDesign(filePath, fileName) {
		this.fileName = fileName;

		await this.page.goto(this.server+'/designs');

		// auf den upload button warten
		await this.page.waitForSelector('#upload-btn');
		await this.page.click('#upload-btn');

		// datei hochladen
		const fileInput = await this.page.$('#design-upload-open-file-browser-qa [type="file"]');
		await fileInput.uploadFile(filePath);

		// warten bis das design im dom ist
		await this.page.waitForSelector('.card.idea-state-unpublished', {timeout: 120000});
		//await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
	}

	async editDesign(meta) {

		if(!meta || !meta[this.language]) {
			meta = this.meta;
		}

		const description = meta[this.language]['description'];
		const keywords = meta[this.language]['keywords'];

		if(meta[this.language]['title']) {
			var title = meta[this.language]['title'];
		}else {
			var title = this.fileName.substr(0, this.fileName.lastIndexOf('.'));
		}

		title = this.generateTitle(title, 50);

		await this.page.goto(this.server+'/designs');

		// design öffnen
		await this.page.waitForSelector('.card.idea-state-unpublished .design-preview');
		await this.page.click('.card.idea-state-unpublished .design-preview');

		await this.page.waitForSelector('.btn-progress.btn-primary');

		// gibt es eine shop auswahl
		if(this.hasShops) {
			// shops auswählen
			await this.page.waitForSelector('#marketplace-pos-card');
			await this.page.click("#marketplace-pos-card .toggle");

			// weiter
			await this.page.click('.btn-progress.btn-primary');
		}

		// template auswahl
		if(this.template) {
			//await this.page.waitForSelector('.toolbar-header .load-template');
			await this.page.click('.toolbar-header .load-template');

			await this.page.waitForSelector('.apply-template-dialog .template-item');

			let i = await this.page.evaluate((template) => {
				const templates = document.querySelectorAll('.template-item');
				let c = -1;

				for(var i = 0; i < templates.length; ++i) {
					 let temp = templates[i];
					 let name = temp.querySelector('.name .inline-edit p');

					 if(name.innerText == template) {
						 c = i;
						 temp.querySelector('.actions .btn.btn-primary').classList.add('btn-template-use');
					 }
				}

				return c;
			}, this.template);

			// template gefunden
			if(i >-1) {
				// template auswählen
				await this.page.click('.template-item .actions .btn-template-use');
			}else {
				console.error('Template nicht gefunden: '+this.template);
				process.exit(1);
			}
		}else {
			// design farben anpassen

			// zur produkt hinzufügen seite
			await this.page.click('.product-list .add-product a');

			await this.page.waitForSelector('.color-filter .color');

			// farbe auswählen
			await this.page.evaluate((shirtColor) => {
				const colors = document.querySelectorAll('.color-filter .color');
				for(var i = 0; i < colors.length; ++i) {
					var color = colors[i];

					switch(shirtColor) {
						case 'white':

							if(color.style.backgroundColor.replace(new RegExp(' ', 'g'), '') == 'rgb(255,255,255)' || color.style.backgroundColor.indexOf('#fff') > -1) {
								color.click();
							}
							break;

						case 'black':
						default:
							if(color.style.backgroundColor.replace(new RegExp(' ', 'g'), '') == 'rgb(0,0,0)' || color.style.backgroundColor.indexOf('#000') > -1) {
								color.click();
							}
							break;
					}
				}
			}, this.shirtColor);

			// kurze pause
			await this.page.waitFor(500);

			// auswahl anwenden
			await this.page.click('.color-filter .link-green');

			// kurze pause
			await this.page.waitFor(100);

			// bestätigen
			await this.page.click('.bottom-toolbar .btn-primary');

			// auf selektor warten
			await this.page.waitForSelector('#account-settings-save-button');
		}

		// standard design vergrössern
		/*
		await this.page.click('.product-list .product[data-filter-id="'+this.defaultDesign+'"] .hover-overlay');
		await this.page.waitForSelector('#design-size-slider');
		const designSize = this.designSize;
		await this.page.$eval('#design-size-slider', (el, designSize) => {
			el.value = (el.max / 100) * designSize;

		}, designSize);
		*/

		// check for close modal
		await this.page.evaluate(() => {
				let area = document.querySelector('.state-partnerarea-idea');

				const int = setInterval(() => {
					if(!area.classList.contains('modal-open')) {
							document.querySelector('#account-settings-save-button').classList.add('modal-close');
							clearInterval(int);
					}
				}, 100);
		});

		// wait for modal closing
		await this.page.waitForSelector('#account-settings-save-button.modal-close');
		// kurze pause
		await this.page.waitFor(100);
		// click next button
		await this.page.click('#account-settings-save-button.modal-close', {clickCount: 2});

		// beschreibung und keywords anpassen
		await this.page.waitForSelector('#input-design-name');

		if(meta[this.language]['title']) {
			// title einfügen
			await this.page.click('#input-design-name', {clickCount: 3});
			await this.page.keyboard.type(title);
		}

		// beschreibung einfügen
		await this.page.click('#input-design-description', {clickCount: 3});
		// kurze pause
		await this.page.waitFor(100);
		// eingabe
		await this.page.keyboard.type(description);

		// alle keywords entfernen
		await this.page.evaluate(() => {
			const keywords = document.querySelectorAll('.tag-input-container .tag-input-item');

			for(var i = 0; i < keywords.length; ++i) {
				keywords[i].click();
			}
		});

		// neue keywords hinzufügen
		await this.page.click('.tag-input-container input');

		const aKeywords = keywords.split(',').sort(function() {
			return .5 - Math.random();
		});;

		// keywords einzeln hinzufügen, ansonsten gibt es probleme
		for(var i = 0; i < aKeywords.length; ++i) {
			await this.page.keyboard.type(aKeywords[i].trim());
			// kurze pause, ansonsten werden die werte nicht richtig übernommen
			await this.page.waitFor(210);
			await this.page.keyboard.type(String.fromCharCode(13));
			// kurze pause, ansonsten werden die werte nicht richtig übernommen
			await this.page.waitFor(210);
		}

		// preis eingeben
		await this.page.click('.commission .btn.manual');
		await this.page.waitForSelector('.manual-input [name="commission"]');
		await this.page.click('.manual-input [name="commission"]', {clickCount: 2});
		await this.page.keyboard.type(this.price);

		// veröffentlichen
		await this.page.click('.btn-progress.btn-primary');
		await this.page.waitForSelector('.confirm-dialog');
	}

	async close() {
		await this.browser.close();
	}
}
