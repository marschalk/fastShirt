const   puppeteer = require('puppeteer');
const   request = require('request-promise-native');
const   poll = require('promise-poller').default;
const 	Log = require('../classes/Log');
const 	log = new Log();
const   timeout = millis => new Promise(resolve => setTimeout(resolve, millis));

module.exports = class Redbubble extends Shop	{
	constructor(config) {
		super(config);
		this.path = config['path'];
	}

	async connect() {
		//start puppeteer and load browser options
		this.browser = await puppeteer.launch({
			headless: false, 							//set to False we can see the browser, set to True hides it. 
			//slowMo: 250 								//slow down by 250ms so we can see what its doing.
		});

    	this.page = await this.browser.newPage();
		this.page.setViewport({ width: 1024, height: 800});  // setting the view port size of the browser. 

		// login seite aufrufen
    	await this.page.goto(this.server+'/auth/login');

		// cookie bestätigen
		await this.page.click('#RB_React_Component_CookieBanner_1 button');
	}

	async login() {

		const apiKey = '86b88e5c291b3486c3917d06b2883f90';

		log.info('trying to log in...')
		// short break because the wait for selector does not seam to fucking work as i thought it might. 
		await this.page.waitFor(400);

		const requestId = await this.initiateCaptchaRequest(apiKey);

		await this.page.click('.login-form [name="cognitoUsername"]');
	    await this.page.keyboard.type(this.user);

	    await this.page.click('.login-form [name="password"]');
	    await this.page.keyboard.type(this.pw);

		log.info(`requestId: ${requestId}`);

		await this.page.click('.login-form button'); 

	    const response = await this.pollForRequestResults(apiKey, requestId);
	    log.info(`response: ${response}`);
	    await page.evaluate(`document.getElementById("g-recaptcha-response").innerHTML="${response}";`);

	    await this.page.waitForNavigation({timeout: 10, waitUntil: 'load'});
	}

	async initiateCaptchaRequest(apiKey) {
		log.info('initiating Captcha request');
		const formData = {
			method: 'userrecaptcha',
			googleKey: '6LdkZisUAAAAACQ1YvSn_fsTXRLoNCsiYuoKyDH7',
			pageurl: 'https://www.redbubble.com/auth/login',
			key: apiKey,
			json: 1

		};
		const response = await request.post('http://2captcha.com/in.php', {form: formData});
		return JSON.parse(response).request;
	}

	async pollForRequestResults(key, id, retries = 30, interval = 1500, delay = 15000) {
		log.info('Polling Captcha results');
  		await timeout(delay);
  		return poll({
    		taskFn: requestCaptchaResults(key, id),
    		interval,
    		retries
  		});
	}

    requestCaptchaResults(apiKey, requestId) {
		log.info('Collecting Captcha results');
  		const url = `http://2captcha.com/res.php?key=${apiKey}&action=get&id=${requestId}&json=1`;
  		return async function() {
    		return new Promise(async function(resolve, reject){
      			const rawResponse = await request.get(url);
      			const resp = JSON.parse(rawResponse);
      			if (resp.status === 0) return reject(resp.request);
      			resolve(resp.request);
    		});
  		}
	}


	async uploadDesign(filePath, fileName) {
		this.fileName = fileName;

		await this.page.goto(this.server+'/portfolio/images/new?ref=account-nav-dropdown');

		// wait for the upload button
		await this.page.waitForSelector('#select-image-single', {timeout: 120000});

		// Upload file
		const fileInput = await this.page.$('#select-image-single');
		//log.info(`Atempting to upload file:${this.fileName}, using path:${filePath}` )
		await fileInput.uploadFile(filePath);

		// wait until the design is in the cathedral
		await this.page.waitForSelector('.single-upload.has-image', {timeout: 120000});
		//await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
	}

	async configureProduct(type, size) {
		// short break because the wait for selector does not seam to fucking work as i thought it might. 
		await this.page.waitFor(400);
		//atempting a pause to ensure elements are loaded - this does not work!!!!! rahhhhhghh.
		await this.page.waitForSelector('[data-type="'+type+'"] .product-options-panel .design-size', {timeout: 120000});
				
		//doing some slider magic for the sizing of the design, /2 is 50%, /4 is 25% and so on.
		let sliderHandle = await this.page.$('[data-type="'+type+'"] .product-options-panel .design-size');
		let handle = await sliderHandle.boundingBox();
		var sizeDecimal = size/100;
		var positionX = 1/sizeDecimal;
		console.log(`type: ${type}, size: ${size}, sizeDecimal: ${sizeDecimal}, positionX${positionX}`);

		await this.page.mouse.move(handle.x + handle.width / positionX, handle.y + handle.height /2);
		await this.page.mouse.down();
		await this.page.mouse.up();

		// centre product veritcally and horzontally

		await this.page.click('[data-type="'+type+'"] .product-options-panel .vertical');
		await this.page.click('[data-type="'+type+'"] .product-options-panel .horizontal');


		//apply the changes to the product.
		await this.page.click('[data-type="'+type+'"] .buttons .apply-changes');

	}

	async addProduct(type) {
		await this.page.click('[data-type="'+type+'"] .product-buttons .enable-all');
		await this.page.click('[data-type="'+type+'"] .product-buttons .edit-product');

		switch(type) {
			case 'clothing':
				//nothing to do here
				//TODO: grey if we can but would like inverted function for colour. 
			break;
			case 'large_clothing':
				//nothing to do here
				//TODO: Some shade of grey for all of these.
			break;
			case 'panel_tank':
				await this.configureProduct('panel_tank', 27);
			break;
			case 'womens_panel_clothing':
				await this.configureProduct('womens_panel_clothing', 31);
			break;
			case 'panel_dress':
				await this.configureProduct('panel_dress', 37);
				//TODO: would like to raise the design by a bit, about quater of the hieght of the design. 
			break;
			case 'panel_clothing':
				await this.configureProduct('panel_clothing', 34);
			break;
			case 'trapeze_dress':
				await this.configureProduct('trapeze_dress', 6);
				//TODO:  will need a function for 6% size and repeated pattern offset grid, and centered hor and vir.
			break;
			case 'phone':
				await this.configureProduct('phone', 13);
			break;
			case 'sticker':
				//nothing to do here
			break;
            case 'phone_wallet':
				await this.configureProduct('phone_wallet', 3);
				//TODO:  will need a function for 3% size and repeated pattern offset grid, and centered hor and vir.
			break;
			case 'throw_pillow':
				await this.configureProduct('throw_pillow', 26);
			break;
            case 'floor_pillow':
				//TODO:  await this.configureProduct('floor_pillow', 56);
				//TODO:  need new function for this gui. 
			break;
			case 'print':
				//nothing to do here
			break;
			case 'laptop':
				await this.configureProduct('laptop', 39);
			break;
            case 'duvet':
				//TODO: will need a function for 6% size and repeated pattern offset grid, and centered hor and vir.
			break;
			case 'mug':
				await this.configureProduct('mug', 17);
			break;
			case 'travel_mug':
				await this.configureProduct('travel_mug', 23);
			break;
			case 'leggins':
				await this.configureProduct('leggings', 12);
				//TODO: will need a function for 12% size and repeated pattern offset grid, and centered hor and vir.
			break;
			case 'pencil_skirt':
				await this.configureProduct('pencil_skirt', 4);
				//TODO: will need a function for 12% size and repeated pattern offset grid, and centered hor and vir.
			break;
			case 'scarf':
				await this.configureProduct('scarf', 4);
				//TODO: will need a function for 12% size and repeated pattern offset grid, and centered hor and vir.
			break;
			case 'tablet':
				await this.configureProduct('tablet', 30);
			break;
			case 'drawstring_bag':
				await this.configureProduct('drawstring_bag', 6);
				//TODO: will need a function for 6% size and repeated pattern offset grid, and centered hor and vir.
			break;
			case 'spiral_notebook':
				await this.configureProduct('spiral_notebook', 22);
			break;
			case 'hardback_journal':
				await this.configureProduct('hardcover_journal', 3);
				//TODO: will need a function for 3% size and repeated pattern offset grid, and centered hor and vir.
			break;
			case 'clock':
				await this.configureProduct('clock', 28);
			break;
			case 'gallery_board':
				//nothing to do here atm
			case 'acrylic_block':
				//nothing to do here atm
				//TODO: will need a function for 81% size, and centered hor and vir.
			break;
			case 'tapestry':
				//nothing to do here atm
			break;
			case 'bath_mat':
				//nothing to do here atm
				//TODO: will need a function for 12% size and repeated pattern offset grid, and centered hor and vir.
			break;
			case 'water_bottle':
				//nothing to do here atm
				//TODO: will need a function for 7% size and repeated pattern offset grid, and centered hor and vir.
			break;
			case 'mounted_print':
				//nothing to do here atm
				//TODO: will need a function for 59% size, and centered hor and vir.
			break;
			case 'cotton_tote_bag':
				//nothing to do here atm
				//TODO: will need a function for 30% size, and centered hor and vir.
			break;
			case 'socks':
				//nothing to do here atm
				//TODO: will need a function for 9% size and repeated pattern offset grid, and centered hor and vir.
			break;
		}

		await this.page.waitForSelector('.image-box.clothing [data-color="'+this.shirtColor+'"]', {timeout: 120000});
		await this.page.click('.image-box.clothing [data-color="'+this.shirtColor+'"]');

		// choose color
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


			// doesn't work yet
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

		// short break
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

		await this.page.waitForSelector('.product-buttons .disable-all', {timeout: 120000});

		// deactivate all products
		await this.page.evaluate(() => {
			const disableLinks = document.querySelectorAll('.product-buttons .disable-all');
        
			for(var x = 0; x < disableLinks.length; ++x) {
				var disableLink = disableLinks[x];
				console.log(disableLink);
				disableLink.click();
			}
		});

		var product = new Array('clothing',
						'large_clothing',
						'panel_tank',
						'womens_panel_clothing',
						'panel_dress',
						'panel_clothing',
						'trapeze_dress',
						'phone',
						'sticker',
						'phone_wallet',
						'throw_pillow',
						'floor_pillow',
						'print',
						'laptop',
						'duvet',
						'mug',
						'travel_mug',
						'leggings',
						'pencil_skirt',
						'scarf',
						'tablet',
						'drawstring_bag',
						'spiral_notebook',
						'hardcover_journal',
						'clock',
						'gallery_board',
						'acrylic_block',
						'tapestry',
						'bath_mat',
						'water_bottle',
						'mounted_print',
						'cotton_tote_bag',
						'socks'
						)
		
		//activate products in a smarter way
		for (var i = 0; i < product.length; i++) {
			console.log(`enable: ${product[i]}`);
  			await this.addProduct(product[i]);
		}

		// title einfügen
		await this.page.click('#work_title_en');
		await this.page.keyboard.type(title);

		// insert description
		await this.page.click('#work_description_en');
		await this.page.keyboard.type(description);

		// neue keywords hinzufügen
		await this.page.click('#work_tag_field_en');
		await this.page.keyboard.type(keywords);

		// design & fotografie deaktivieren
		await this.page.click('#media_design');
		await this.page.click('#media_digital');

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
		await this.page.waitForSelector('.shared-components-pages-PromotePage-PromotePage__content--SJYpM', {timeout: 120000})
		//await this.page.waitForNavigation({timeout: 120000, waitUntil: 'load'});

	}

	async close() {
		await this.browser.close();
	}
}
