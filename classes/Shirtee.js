const puppeteer = require('puppeteer');

module.exports = class Shirtee extends Shop	{
	constructor(config) {
		super(config);

		this.category = config['category'];
	}

	async connect() {
		this.browser = await puppeteer.launch({
			headless: true
		});

	    this.page = await this.browser.newPage();
		this.page.setViewport({ width: 1024, height: 800});

		// login seite aufrufen
	    await this.page.goto(this.server+'/customer/account/login/');

		// cookie bestätigen
		await this.page.waitForSelector('.cc-dismiss', {timeout: 120000});
		await this.page.click('.cc-dismiss');
	}

	async login() {
		await this.page.click('#login-form [name="login[username]"]');
	    await this.page.keyboard.type(this.user);

	    await this.page.click('#login-form [name="login[password]"]');
	    await this.page.keyboard.type(this.pw);

	    await this.page.click('#login-form button');

	    await this.page.waitForNavigation({timeout: 120000});
	}

	async uploadDesign(filePath, fileName) {
		this.fileName = fileName;

		await this.page.goto(this.server+'/designer/');

		// auf den file input warten
		await this.page.waitForSelector('#filesToUpload', {timeout: 120000});

		try {
				// alte bilder entfernen
				await this.page.click('#remove-img-btn');
		}catch(e) {}

		// kurze pause
		await this.page.waitFor(500);

		// datei hochladen
		const fileInput = await this.page.$('#filesToUpload');
		await fileInput.uploadFile(filePath);

		// warten bis das design im dom ist
		await this.page.waitForSelector('#uploadedImages .clipart-image', { timeout: 120000 });

		// auf preis anpassung warten
		await this.page.waitForSelector('#front_price', { timeout: 120000 });

		// kurze pause
		await this.page.waitFor(500);
	}

	async addProduct(type) {
		await this.page.evaluate((type) => {
			const product = document.querySelector('.product-dropdown #cs-'+type);
			product.click();
		}, type);
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

		title = this.generateTitle(title, 40);

		let colorId = 16;

		switch(this.shirtColor) {
			case 'white':
				colorId = 3;
				break;
		}

		await this.page.evaluate((colorId) => {
			document.querySelector('#right-color-group [data-color_id="'+colorId+'"]').click();
		}, colorId);

		// abstand nach oben korrigieren
		let top = 25;
		await this.page.evaluate((top) => {
				var containerCanvases = window.pd.containerCanvases;

				for(var key in containerCanvases) {
						containerCanvases[key]._objects.forEach(function(object, i) {
								containerCanvases[key]._objects[i].top = top;
						});
				}

				window.pd.containerCanvases = containerCanvases;
		}, top);

		// weiter zum hinzufügen der verschiedenen produkte
		await this.page.waitForSelector('#pd_gt_product', {timeout: 120000});
		await this.page.click('#pd_gt_product');

		// auf nächsten schritt warten
		await this.page.waitForSelector('#product-designer', {timeout: 120000});

		/*
		// abstand nach oben korrigieren
		await this.page.evaluate(function() {
				let layers = JSON.parse(window.pd.params.layers);
				for(i in layers) {
						layers[i]['objects'].forEach(function(item, x) {
								layers[i]['objects'][x]['top'] = 25;
						});
				}

				window.pd.params.layers = JSON.stringify(layers);
		});

		// kurze pause
		await this.page.waitFor(200);
		*/

		// produkte hinzufügen
		let products = [
			/* herren */
			1337,
			1652,
			1654,
			1656,
			1658,
			3889,
			4309,
			722852,
			/* Damen */
			1649,
			1655,
			1657,
			722890,
			/* V-Neck */
			1650,
			/* Tank Tops */
			1660,
			/* Hoddies */
			722722,
			722844,
			/* Sport */
			/*
			722769,
			722788
			*/
		];

		for(var i = 0; i < products.length; ++i) {
			this.addProduct(products[i]);
		}

		// farbe auswählen
		await this.page.evaluate((shirtColor) => {
			let colors = document.querySelectorAll('.add-all-colors.color-white');

			switch(shirtColor) {
				case 'white':
					colors = document.querySelectorAll('.add-all-colors.color-black');
					break;
			}

			for(var i = 0; i < colors.length; ++i) {
				let color = colors[i];
				color.click();
			}
		}, this.shirtColor);

		// kurze pause
		await this.page.waitFor(400);

		// nächster schritt
		await this.page.click('#pd_gt_product');

		// kurze pause
		await this.page.waitFor(200);

		await this.page.waitForSelector('#sales_name', {timeout: 120000});

		// kurze pause
		await this.page.waitFor(200);

		// title einfügen
		await this.page.click('#sales_name');
		await this.page.keyboard.type(title);
		await this.page.waitFor(400);

		// beschreibung einfügen
		await this.page.evaluate((description) => {
			document.querySelector('#sales_description').value = '<p>'+description+'</p>';
		}, description);

		// neue keywords hinzufügen
		await this.page.click('#tags-input');

		const aKeywords = keywords.split(',');

		// keywords einzeln hinzufügen, ansonsten gibt es probleme
		for(var i = 0; i < aKeywords.length; ++i) {
			await this.page.keyboard.type(aKeywords[i].trim());
			// kurze pause, ansonsten werden die werte nicht richtig übernommen
			await this.page.waitFor(100);
			await this.page.keyboard.type(' ');
			// kurze pause, ansonsten werden die werte nicht richtig übernommen
			await this.page.waitFor(100);
		}

		// kategorie setzen sofern vorhanden
		if(this.category) {
			await this.page.evaluate((category) => {
				document.querySelector('#categories_ids').value = category;
			}, this.category);
		}

		let link = title.trim().replace(/[-_!?/]/gi, '')
				.replace(/[ ]/gi, '-')
				.replace(/--/gi, '-')
				.replace(/--/gi, '-')
				.replace(/--/gi, '-')
				.replace(/--/gi, '-')
				.replace(/[äÄ]/gi,'ae')
				.replace(/[öÖ]/gi,'oe')
				.replace(/[üÜ]/gi,'oe')
				.replace(/[ß]/gi,'ss')
				.replace(/[é]/gi,'e')
				.toLowerCase();

		// link einfügen und veröffentlichen
		await this.page.evaluate((link) => {
			let linkSurfix = '';
			let counter = 0;
			let linkInput = document.querySelector('#sales_url');
			let submitLink = document.querySelector('#pd_sales_right');
			let newLink = '';

			// link setzen
			linkInput.value = link;
			// abschicken
			submitLink.click();

			const int = setInterval(() => {
				linkSurfix = '-'+counter;
				newLink = link+linkSurfix;
				++counter;

				if(linkInput.hasClassName('validation-failed')) {
					// link setzen
					linkInput.value = newLink;
					// abschicken
					submitLink.click();
				}else {
					clearInterval(int);
				}
			}, 1000);
		}, link);


		// veröffentlichen
		//await this.page.click('#pd_sales_right');
		await this.page.waitForNavigation({timeout: 120000, waitUntil: 'load'});
	}

	async close() {
		await this.browser.close();
	}
}
