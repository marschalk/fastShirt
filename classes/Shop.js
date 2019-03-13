const 	puppeteer = require('puppeteer');
const 	Log = require('../classes/Log');
const 	log = new Log();

module.exports = class Shop	{
	constructor(config) {
		this.server = config['server'];
		this.user = config['user'];
		this.pw = config['pw'];
		this.price = config['price'];
		this.defaultDesign = config['defaultDesign'];
		this.designSize = config['designSize'];
		this.hasShops = config['hasShops'];
		this.shirtColor = config['shirtColor'];
		this.language = config['language'];
		this.meta = config['meta'];
	}

	checkConf() {
		let check = true;

		if(!this.server) {
			log.error('no server found check entries in config.js');
		}

		if(!this.user) {
			log.error('user undefined for '+this.server);
			check = false;
		}

		if(!this.pw) {
			log.error('password undefined for '+this.server);
		}

		if(this.meta) {
			let descr = this.meta[this.language]['description'];
			let keywords = this.meta[this.language]['keywords'];

			if(descr == '') {
				log.error('missing description for '+ this.server);
				check = false;
			}

			if(keywords == '' || keywords.split(',').length < 3) {
				log.error('missing keywords or less than 3 keywords for '+ this.server);
				check = false;
			}
		} else {
			check = false;
		}

		return check;
	}

	setMeta(meta) {
		this.meta = meta;
	}

	setShirtColor(color) {
		this.shirtColor = color;
	}

	setTemplate(template) {
		this.template = template;
	}

	generateTitle(title, length) {
		// short title
		var newTitle = '';
		var aTitle = title.split(' ');
		for(var i = 0; i < aTitle.length; ++i) {
				var temp = newTitle + " " + aTitle[i];
				if(temp.length <= length) {
			  	if(newTitle.length == 0) {
			      	newTitle = aTitle[i];
					}else {
							newTitle += ' ' + aTitle[i];
		      }
				}
		}

		return newTitle;
	}
}
