const puppeteer = require('puppeteer');

module.exports = class Redbubble extends Shop	{
	constructor(config) {
		super(config);
		this.path = config['path'];
	}

	async connect() {
		this.browser = await puppeteer.launch({
			headless: false
		});

    this.page = await this.browser.newPage();
		this.page.setViewport({ width: 1024, height: 800});

		// login seite aufrufen
    await this.page.goto(this.server+'/auth/login');

		// cookie bestätigen
		//await this.page.click('#RB_React_Component_CookieBanner_1 button');
	}

	async login() {
		//await this.page.click('.login-form [name="cognitoUsername"]');
	    //await this.page.keyboard.type(this.user);

	    //await this.page.click('.login-form [name="password"]');
	    //await this.page.keyboard.type(this.pw);

	    //await this.page.click('.login-form button');

	    await this.page.waitForNavigation({timeout: 10, waitUntil: 'load'});
	}

	async uploadDesign(filePath, fileName) {
		this.fileName = fileName;

		await this.page.goto(this.server+'/portfolio/images/new?ref=account-nav-dropdown');

		// auf den upload button warten
		await this.page.waitForSelector('#select-image-single');

		// datei hochladen
		const fileInput = await this.page.$('#select-image-single');
		await fileInput.uploadFile(filePath);

		// warten bis das design im dom ist
		await this.page.waitForSelector('.single-upload.has-image');
		//await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
	}

	async addProduct(type) {
		await this.page.click('[data-type="'+type+'"] .product-buttons .enable-all');
		await this.page.click('[data-type="'+type+'"] .product-buttons .edit-product');

		switch(type) {
			case '':

			break;
		}
		await this.page.waitForSelector('.image-box.clothing [data-color="'+this.shirtColor+'"]');
		await this.page.click('.image-box.clothing [data-color="'+this.shirtColor+'"]');

		// farbe auswählen
		await this.page.evaluate((shirtColor) => {
			var colors = document.querySelectorAll('.color-filter .color');

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

			var colorInputs = document.querySelectorAll('[data-color="'+shirtColor+'"]');

			for(var i = 0; i < colorInputs.length; ++i) {
				var colorInput = colorInputs[i];
				colorInput.click();
			}


			// funktioniert noch nicht
			var bgColors = document.querySelectorAll('.background-color');

			for(var i = 0; i < bgColors.length; ++i) {
				var color = bgColors[i];

				switch(shirtColor) {
					case 'white':
						color.value = '#ffffff';
						break;

					case 'black':
					default:
						color.value = '#000000';
						break;
				}
			}
		}, this.shirtColor);

		// kurze pause
		await this.page.waitFor(400);
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

		await this.page.waitForSelector('.product-buttons .disable-all');

		// alle produkte deaktivieren
		await this.page.evaluate(() => {
			const disableLinks = document.querySelectorAll('.product-buttons .disable-all');

			for(var x = 0; x < disableLinks.length; ++x) {
				var disableLink = disableLinks[x];
				disableLink.click();
			}
		});


		// normales t-shirt
		await this.addProduct('clothing');

		// groß druck t-shirt
		await this.addProduct('large_clothing');

		switch(this.shirtColor) {
			case 'white':
				//await this.addProduct('panel_clothing');
			break;
		}

		// title einfügen
		await this.page.click('#work_title_de');
		await this.page.keyboard.type(title);

		// beschreibung einfügen
		await this.page.click('#work_description_de');
		await this.page.keyboard.type(description);

		// neue keywords hinzufügen
		await this.page.click('#work_tag_field_de');
		await this.page.keyboard.type(keywords);

		// design & fotografie deaktivieren
		await this.page.click('#media_design');

		// t-shirt als vorschau
		await this.page.evaluate(() => {
			var defaultPreview = document.querySelector('#work_default_product');
			defaultPreview.value = 'classic-tee';
		});

		// kein erwachsener inhalt
		await this.page.click('#work_safe_for_work_true');


		// rechte bestätigen
		await this.page.click('#rightsDeclaration');

		// veröffentlichen
		await this.page.click('#submit-work');
		await this.page.waitForNavigation({timeout: 120000, waitUntil: 'load'});
	}

	async close() {
		await this.browser.close();
	}
}
