(function(){

/*================================================
 * CONFIG
================================================*/
const _CONFIG = {
	env: 'production', // development|production
	initial_page: 'main-menu',
	tutorial: true,
	volume_music: 0.7,
	volume_sound: 0.5,
	win_condition: 1000,
	reward_kill: 150,
	reward_tame: 100,
	max_hp: 100,
	max_condition: 15,
	enemy_live: true
}

var _dev = _CONFIG.env === 'development';

/*================================================
 * THE GAME
================================================*/
var app = new Vue({
	el: '#app',
	data: () => initialData(),
	mounted () {
		if(_dev) console.log('[app] Mounted.')
		document.getElementById('app').style.display = 'block';

		this.setAudio();
		if(_CONFIG.initial_page === 'grove') this.startGame();
	},
	methods: {
		setAudio: function(){
			var self = this;
			this.$refs.bgm.volume = _CONFIG.volume_music;

			var buttons = document.querySelectorAll('button');
			this.buttons = buttons;

			var hover = this.$refs.hover;
			hover.volume = _CONFIG.volume_sound;

			var click = this.$refs.click;
			click.volume = _CONFIG.volume_sound;

			this.audio = {
				hover: hover,
				click: click
			}

			for (var i = 0; i < buttons.length; i++) {
				var button = buttons[i];
				button.addEventListener('mouseover', function(){
					button.setAttribute('style', 'transform: scale(1.025)')
					if(!self.muteSound){hover.play();}
				});
				button.addEventListener('mouseout', function(){
					button.setAttribute('style', 'transform: scale(1)')
					if(!self.muteSound){hover.play();}
				});
				button.addEventListener('click', function(){
					if(!self.muteSound){click.play();}
				});
			}
		},
		playAudio: function(type){
			if(!this.muteSound){
				var audio = document.createElement("audio");
				audio.volume = _CONFIG.volume_sound;
				if(type=='hover'){
					audio = this.$refs.hover;
				}else if(type=='craft'){
					audio.src = "craft.wav";
					audio.volume = 0.5;
				}else if(type.toLowerCase()=='twig'){
					audio.src = "twig.wav";
				}else if(type.toLowerCase()=='branch'){
					audio.src = "branch.wav";
				}else if(type.toLowerCase()=='cat'){
					audio.src = "cat.wav";
					audio.volume = 0.2;
				}else if(type.toLowerCase()=='deadcat'){
					audio.src = "deadcat.wav";
					audio.volume = 0.2;
				}else if(type.toLowerCase()=='walk'){
					audio.src = "walk.wav";
					audio.volume = 0.1;
				}
				else{
					audio.src = "click.wav";
					// this.$refs.click.play();
				}
				audio.play();
			}
		},
		mute: function(target){
			if(target == 'sound'){
				this.muteSound = !this.muteSound;
			}else{
				this.muteMusic = !this.muteMusic;
			}
		},
		logger: function(msg){
			this.logMessages.push(msg);
		},
		beginHandle: function(){
			if(this.tutorial){
				this.page = 'create-char';
			}else{
				this.startGame();
			}
		},
		createdHandle: function(){
			if(this.tutorial){
				this.page = 'scene-1';
			}else{
				this.startGame();
			}
		},
		startGame: function(){
			if(this.page !== 'grove') this.page = 'grove';
			this.logger('-- '+this.environment.name+' --');
			window.addEventListener('click', clickListener, true);

			this.renderMap();
			this.moveEnemies();
			enableMove();

			this.countInterval = setInterval(() => {
				this.timeCount++;
			}, 1000);
		},
		moveEnemies: function() {
			if(_CONFIG.enemy_live){
				this.enemy.live();

				if(this.enemy1) this.enemy1.live();
			}
		},
		randomChar: function(){
			this.char.name = randomIndex(_charNames);
			this.char.symbol = randomIndex(_symbols);
			this.char.color = randomIndex(_colors);
		},
		moveListener: function(code, key){
			// console.log(code, key)
			this.showCraftBtn = false;
			this.isBattling = false;

			if(this.craftingSlot.length>0){
				while(this.craftingSlot.length>0){
					this.drop(this.craftingSlot[0], 0);
				}
			}

			var cp = this.char.position;
			var dir = null;
			var steps = 0;

			if(code === 119 || key === 'w' || code === 38){
				dir = 'n'; steps -= 9;
			}
			else if(code === 97 || key === 'a'  || code === 37){
				dir = 'w'; steps--;
			}
			else if(code === 115 || key === 's' || code === 40){
				dir = 's'; steps += 9;
			}
			else if(code === 100 || key === 'd'  || code === 39){
				dir = 'e'; steps++;
			}

			var okay = checkMove(dir, this.map[cp]);
			if(okay){
				this.lookat = null;
				this.isCrafting = false;
				this.char.move(dir, steps);

				// check if meet enemy
				checkSituation(this.char, this.enemy);

				if(this.enemy1) checkSituation(this.char, this.enemy1);
			}
		},
		renderMap(){
			this.map = this.environment.map;
			for (var i = 0; i < this.map.length; i++) {
				var tile = this.map[i];

				this.setCoordinate(this.char, tile);
				this.setCoordinate(this.enemy, tile);

				if(this.enemy1) this.setCoordinate(this.enemy1, tile);
			}
		},
		setCoordinate(obj, tile){
			if(tile.position == obj.position){
				obj.x = tile.x;
				obj.y = tile.y;
			}
		},
		searchArea: function(position){
			this.isCrafting = false;
			this.lookat = 'area';
			this.selectedArea = this.map[position];

			if(this.selectedArea.items.length>0){
				this.showCraftBtn = true;
			}else{
				this.logger('found nothing.');
			}
		},
		markArea: function(position){
			var area = this.map[position];
			area.marked = !area.marked;
			// console.log('marked.', area)
		},
		addToSlot: function(stick, source, index){
			console.log('adding '+stick.name+' to slot from '+source);
			if(stick.condition>=30){
				this.logger('That stick is in the best condition.');
			}else{

				// --
				this.isCrafting = true;
				if(this.craftingSlot.length<2){
					this.craftingSlot.push({
						item: stick,
						source: source
					});
					console.log(this.craftingSlot)

					if(source == 'ground'){
						this.map[this.char.position].items.splice(index, 1);
					}else if(source == 'hand'){
						console.log('NULLING')
						this.char.stick = null;
						console.log(this.char.stick)
					}else{
						console.log('source unknown')
					}
				}
				// --

			}
		},
		craft: function(){
			var self = this;
			this.char.craft(this.craftingSlot[0], this.craftingSlot[1], function(newStick){
				if(newStick){
					if(self.char.stick){
						self.dropStick();
					}
					self.char.stick = newStick;
				}
			});
			self.isCrafting = false;
		},
		drop: function(slot, index){
			console.log('dropping from slot: ', slot);

			if(slot.source == 'ground'){
				this.map[this.char.position].items.push(slot.item);
			}else if(slot.source == 'hand'){
				this.char.stick = slot.item;
			}else{
				console.log('dropping: source unknown');
			}
			this.craftingSlot.splice(index, 1);
		},
		dropStick: function(){
			this.map[this.char.position].items.push(this.char.stick);
			this.char.stick = null;
		},
		resetWindow: function(){
			Object.assign(this.$data, initialData());
			this.map = this.environment.map;
			this.gameIsOver = false;
			disableMove();
			console.clear();
		}
	},
	watch: {
		logMessages: function(){
			var self = this;
			setTimeout(function(){
				if(self.$refs.logWindow){
					self.$refs.logWindow.scrollTop = self.$refs.logWindow.scrollHeight+20;
				}
			},100);
		},
		howtoplayPopup: function(val){
			if(val){
				this.enemy.stop();
				disableMove();
			}else{
				this.enemy.live();
				enableMove();
			}
		},
		isCrafting: function(val){
			if(!val){
				if(this.craftingSlot.length>0){
					this.drop(this.craftingSlot[0], 0);
					if(this.craftingSlot.length>0){
						this.drop(this.craftingSlot[0], 0);
					}
				}
			}
		},
		isRenaming: function(val){
			if(val){
				disableMove();
			}else{
				enableMove();
			}
		},
		muteMusic: function(val){
			if(val){
				this.$refs.bgm.pause();
			}else{
				this.$refs.bgm.play();
			}
		},
		page: function(to, from){
			if(_dev) console.log('[PAGE] from: '+from, 'to: '+to)
		}
	},
	filters: {
		format: function(val){
			return val.toFixed(2);
		}
	}
});

/*================================================
 * FUNCTIONS
================================================*/
// STICK
function Stick(data){
	var smsc = new Date().getTime();
	var words = ['s', 't', 'i', 'c', 'k'];
	var randomId = words[random(0,6)-1]+(smsc-random(0,1000)).toString();

	this.id = randomId;
	this.name = data.name;
	this.shape = 'wood';
	this.condition = data.condition;
	this.max_condition = data.condition;
	this.accuracy = data.accuracy;
	this.spawn_percentage = data.spawn_percentage;
	this.holdable = true;
	this.custom = data.custom;
	this.rename = function(new_name){
		// console.log('renaming...')
		this.name = new_name;
		app.logger('Your stick has been renamed to '+new_name);
	}
	return this;
}

function stickCheck(stick){
	var broken = false;
	if(stick.condition <= 0){
		broken = true;
	}
	return broken;
}

//================================================
// ENVIRONMENT
function Environment(data){
	this.name = data.name;
	this.width = 9;
	this.length = 9;
	this.items = data.items;
	this.map = [];
	this.generateMap = function(){
		for (var i = 0; i < (this.width*this.length); i++) {
			var map = [];

			// set items
			var items = [];
			for (var j = 0; j < this.items.length; j++) {
				var roll = random(0, 100);

				var item = new Stick({
					name: this.items[j].name,
					condition: this.items[j].condition,
					accuracy: this.items[j].accuracy,
					spawn_percentage: this.items[j].spawn_percentage
				});
				var sp = this.items[j].spawn_percentage;

				// if roll>=30 == 70% chance
				var amount = random(1, 5);

				if(roll >= (100-sp)){
					// console.log('PUSH'+i, amount)
					for (var k = 0; k < amount; k++) {
						item.id += j.toString();
						items.push(JSON.parse(JSON.stringify(item)));
					}
				}
			}

			// set edges
			var check = checkEdge(i);

			// set coordinate
			var x;
			var y = Math.floor(i/9);

			if (
				i>=9*y && i<9*(y+1)
			){
				x = i - (9*y);
			}
			// console.log(x);

			this.map.push({
				position: i,
				x: x,
				y: y,
				isEdge: check.isEdge,
				label: check.label,
				items: items,
				marked: false
			});
		}
		// console.log(this.map)
	};
	this.generateMap();
	return this;
}

function checkEdge(i){
	var isEdge = false;
	var label = null;

	if( i>=0 && i<=8 ){
		isEdge = true;
		label = 'n';
	}
	// west
	else if( i>=0 && i<=72 && i%9==0 ){
		isEdge = true;
		label = 'w';
	}
	// south
	else if( i>=72 && i<=80 ){
		isEdge = true;
		label = 's';
	}
	// east
	else if( i>=8 && i<=80 && i%9==8 ){
		isEdge = true;
		label = 'e';
	}else{
		isEdge = false;
		label = null;
	}

	if(i==0){
		isEdge = true;
		label = 'nw';
	}
	else if(i==8){
		isEdge = true;
		label = 'ne';
	}
	else if(i==72){
		isEdge = true;
		label = 'sw';
	}
	else if(i==80){
		isEdge = true;
		label = 'se';
	}

	return {
		isEdge: isEdge,
		label: label
	};
}

//================================================
// CHAR
function Char(data){
	this.name = data.name;
	this.symbol = data.symbol;
	this.color = data.color;
	this.exp = 0;
	this.max_exp = _CONFIG.win_condition;
	this.health = _CONFIG.max_hp;
	this.damage = 1.5;
	this.position = 76;
	this.x = 4;
	this.y = 8;
	this.stick = null;
	this.hold = function(stick, cont){
		// console.log('holding: '+ stick.name)
		this.stick = JSON.parse(JSON.stringify(stick));
		for (var i = 0; i < cont.length; i++) {
			if(stick.id == cont[i].id){
				cont.splice(i, 1);
			}
		}
	};
	this.unhold = function(){
		this.stick = null;
	};
	this.craft = function(slot1, slot2, callback){
		console.log('crafting:', slot1, slot2);

		// FIND MASTER STICK
		var master;

		if(slot1.item.custom && slot2.item.custom){
			master = slot1.item;
		}else if(slot1.item.custom){
			master = slot1.item;
		}else if(slot2.item.custom){
			master = slot2.item;
		}else{
			console.log('no custom material');
		}

		// NEW NAME
		var new_stick_name = '';

		if(master){
			console.log('master:', master);
			new_stick_name = master.name;
		}else{
			var nn = slot1.item.name.split(' ')[0];
			new_stick_name = nn+' '+_stickNames[random(0, _stickNames.length-1)];
		}

		// NEW CONDITION
		console.log('cond1: '+slot1.item.condition+'| cond2: '+slot2.item.condition);
		var avg = (slot1.item.condition + slot2.item.condition)/2;
		if(avg<1){ avg = 1 }
		console.log('avg: '+avg);
		var cond = avg + random(avg-2, avg+2);
		console.log('new cond: '+cond);

		// NEW STICK!
		var stick = new Stick({
			name: new_stick_name,
			condition: cond,
			custom: true,
			max_condition: cond,
			accuracy: 100,
			spawn_percentage: 70
		});
		app.logger('You have made a '+stick.name+'.');

		// DESTROY MATERIAL
		app.craftingSlot = [];

		this.exp += random(0,3);
		if(this.exp>=_CONFIG.win_condition){
			gameOver(true);
		}
		app.sticksCount++;
		callback(stick);
	};
	this.hit = function(target){
		if(_dev) console.log('[HITTING]: ',target)
		if(target){
			var self = this;
			app.isCrafting = false;

			// weapon check
			var weapon;
			if(this.stick){ weapon = this.stick.name; }
			else{ weapon = 'bare hands'; }

			app.logger('Hit '+target.name+' with '+ weapon +'.');

			// if hit has an amount
			if(target.shape && target.shape == 'wood'){
				target.condition -= this.damage*1.1;
				if(target.condition <= 0){
					console.log('BREAK')
					var cont = app.map[this.position].items;
					for (var i = 0; i < cont.length; i++) {
						if(target.id == cont[i].id){
							cont.splice(i, 1);
						}
					}
				}
			}

			// stick check
			var broken;
			if(this.stick){
				this.stick.condition--;
				broken = stickCheck(this.stick);
			}else{
				// attacked with bare hands
				this.health--;
			}
			if(broken){
				app.logger(this.stick.name+ ' has broken.');
				this.unhold();
			}

			// if hit enemy
			if(target && target.health){
				this.hitEnemy(target);
				// console.log('asu', target)
			}

			this.exp+=random(0, 3);
			if(this.exp<100){
				this.damage+=0.01;
			}else{
				this.damage += (this.exp/10000);
			}

			this.check();
		}
	};
	this.hitEnemy = function(target){
		let self = this;

		if(target.health<=0){
			stopping();
		}else{
			target.health-=this.damage;
			if(target.name){
				app.logger('You dealt '+this.damage.toFixed(2)+' damage to '+target.name);
			}

			if(target.health<=0){
				stopping();
			}
		}
		this.exp+=10;

		function stopping(){
			if(target){
				// clearInterval(target.attackInterval)
				target.dead();

				app.isBattling = false;
				if(target.name){
					app.logger('You killed a '+target.name+' !!! (+ '+_CONFIG.reward_kill+' exp)');
				}
				app.playAudio('deadcat');

				target = null;
				if(app.enemy){
					app.enemy = null;
				}
				app.enemyKilled = true;
				self.health+=20;
				self.exp+=_CONFIG.reward_kill;
			}
		}
	};
	this.move = function(dir, steps){
		this.position+=steps;
		this.x = app.map[this.position].x;
		this.y = app.map[this.position].y;
		// console.log(app.map[this.position])
		app.moveCount++;
		app.playAudio('walk');
		if(app.moveCount%4==0){
			this.exp++;
			if(this.exp>=_CONFIG.win_condition){
				gameOver(true);
			}
		}
	};
	this.check = function(){
		if(this.health<=0){
			gameOver(false);
		}
		if(this.exp>=_CONFIG.win_condition){
			gameOver(true);
		}
	};
	this.observe = function(target){
		app.logger('Observed: '+target.name+' | Damage: '+target.damage+' | Health: '+target.health);
		target.observed = true;
	},
	this.tame = function(target){
		if(target.observed){
			// console.log('taming...')

			var roll = random(0, 100);
			// if roll>=30 == 70% chance
			// console.log(roll)
			if(roll>=(100-this.damage)){
				target.stopAttack;
				target.health = 100;
				target.tamed = true;
				app.enemyTamed = true;
				this.health+=20;
				this.exp+=_CONFIG.reward_tame;
				app.logger(target.name + 'has been tamed! (+ '+_CONFIG.reward_tame+' exp)');
				clearInterval(target.attackInterval);
				if(this.exp>=_CONFIG.win_condition){
					gameOver(true);
				}
			}else{
				app.logger('Failed to tame.');
			}
		}
	},
	this.heal = function(){
		if(this.health<100){
			this.health++;
		}
	}
	return this;
}

//================================================
// ENEMY
function Enemy(data){
	var smsc = new Date().getTime();
	var words = ['s', 't', 'i', 'c', 'k'];
	var randomId = words[random(0,6)-1]+(smsc-random(0,1000)).toString();

	this.id = randomId;
	this.name = data.name;
	this.position = data.position;
	this.x = 4;
	this.y = 4;
	this.health = 100;
	this.damage = 8;
	this.color = data.color;
	this.moveInterval = null;
	this.attackInterval = null;
	this.stopAttack = clearInterval(this.attackInterval);
	this.attack_speed = 1000;
	this.move_speed = 500;
	this.max_speed = 200;
	this.stopped = false;
	this.observed = false;
	this.tamed = false;
	this.isDead = false;
	this.pattern = [];
	this.live = function(){
		if(!this.isDead){
			var self = this;
			this.stopped = false;
			this.moveInterval = setInterval(function(){
				var dirs = ['s', 'w', 'n', 'e'];
				var roll = random(0,5);
				var percent = random(0,102)-1
				var chance = app.char.exp/9;

				var dir;

				if(percent<=chance){
					// console.log('GET HIM!')
					if(self.pattern.length>=2){
						self.pattern = [];
					}

					if(self.x < app.char.x){
						self.pattern.push('e');
					}else if(self.x > app.char.x){
						self.pattern.push('w');
					}else{
						self.pattern.push(dirs[roll-1]);
					}

					if(self.y < app.char.y){
						self.pattern.push('s');
					}else if(self.y > app.char.y){
						self.pattern.push('n');
					}else{
						self.pattern.push(dirs[roll-1]);
					}

					dir = self.pattern[0];
				}else{
					dir = dirs[roll-1];
				}

				var check = checkMove(dir, app.environment.map[self.position]);
				if(check){
					self.move(dir);
					self.pattern.splice(0,1)
				}
			}, this.move_speed);
		}
	};
	this.stop = function(){
		clearInterval(this.moveInterval);
		this.stopped = true;
	};
	this.move = function(dir){
		if(!this.isDead){
			var self = this;
			if(!this.tamed){
				if(random(0,10) > 4){
					if(dir=='n'){
						this.position -= 9;
					}else if(dir=='w'){
						this.position--;
					}else if(dir=='s'){
						this.position += 9;
					}else if(dir=='e'){
						this.position++;
					}
					checkSituation(app.char, this);
				}
			}else{
				setInterval(function(){
					self.position=app.char.position;
				}, 250)
			}
		}
	};
	this.attack = function(target){
		if(!this.tamed && !this.isDead){
			// console.log('enemy attacking:' , target)
			var self = this;
			this.attackInterval = setInterval(function(){
				var dmg = random(self.damage-2, self.damage+1);

				target.health-=dmg;
				if(self.name){
					app.logger(self.name+' dealt '+Math.floor(dmg)+' damage.');
				}
				app.playAudio('cat');

				// console.log(target.health)
				if(target.health<=0 || target.position != self.position){
					clearInterval(self.attackInterval);
					if(target.health<=0){
						gameOver(false);
					}
				}
			}, self.attack_speed);
		}
	};
	this.dead = function(){
		this.stop();
		clearInterval(this.attackInterval);
	};

	return this;
}

function checkMove(dir, tile){
	var res = true;
	if(tile && tile.isEdge){
		var ti = tile.isEdge;
		var tl = tile.label.split('');
		if (ti && dir == tl[0] || dir == tl[1]) { res = false }
	}
	return res;
}

function checkSituation(a, b){
	if(a && b){
		if(a.position == b.position){
			b.stop();
			if(!b.tamed){
				b.attack(a);
				app.isBattling = true;
			}
		}else{
			if(b.stopped){
				b.live();
			}
		}
	}else{
		console.log('check situation parameter error;');
	}
}

//================================================
// INITIAL DATA
function initialData(){
	return {
		char: new Char({
			name: randomIndex(_charNames),
			symbol: randomIndex(_symbols),
			color: randomIndex(_colors)
		}),
		enemy: new Enemy({
			name: 'Wildcat',
			color: 'Red',
			position: 40
		}),
		// enemy1: new Enemy({
		// 	name: 'Wildcat1',
		// 	color: 'Black',
		// 	position: 30
		// }),
		environment: new Environment({
			name: 'The Black Grove',
			items: [
				new Stick({id: 'twg', name: 'Twig', condition: _CONFIG.max_condition-11, accuracy: 100, spawn_percentage: 70, custom: false}),
				new Stick({id: 'twg', name: 'Sprig', condition: _CONFIG.max_condition-9, accuracy: 100, spawn_percentage: 70, custom: false}),
				new Stick({id: 'brc', name: 'Branch', condition: _CONFIG.max_condition-5, accuracy: 50, spawn_percentage: 40, custom: false}),
				new Stick({id: 'lmb', name: 'Limb', condition: _CONFIG.max_condition-1, accuracy: 25, spawn_percentage: 10, custom: false}),
				new Stick({id: 'bgh', name: 'Bough', condition: _CONFIG.max_condition, accuracy: 25, spawn_percentage: 10, custom: false}),
			]
		}),
		map: [],

		page: _CONFIG.initial_page,
		howtoplayPopup: false,
		lookat: null,
		selectedArea: null,
		isCrafting: false,
		logMessages: [],
		isBattling: false,
		gameIsOver: false,
		win: false,
		showCraftBtn: false,
		craftingSlot: [],
		isRenaming: false,
		showHelp: true,
		tutorial: _CONFIG.tutorial,

		countInterval: null,
		timeCount: 0,
		clickCount: 0,
		moveCount: 0,
		sticksCount: 0,
		enemyKilled: false,
		enemyTamed: false,
		allAreaMarked: false,

		audio: null,
		buttons: [],
		muteSound: false,
		muteMusic: true,

		symbols: _symbols,
		colors: _colors,

		showShortcut: false,
		showCredits: false
	}
}

//================================================
function keypressListener(e){
	// console.log(e.keyCode, e.key)
	if(e.key == 'q' || e.key == 'e' || e.keyCode == 113){
		app.$refs.lookAround.click();
	}else if(e.key == 'r' || e.keyCode == 114){
		if(app.$refs.recraft){
			app.$refs.recraft.click();
		}
	}else if(e.key == 'c' || e.keyCode == 99){
		if(app.$refs.showCraft){
			app.$refs.showCraft.click();
		}
	}else if(e.key == 'f' || e.keyCode == 70){
		if(app.$refs.marker){
			app.$refs.marker.click();
		}
	}else if(e.keyCode == 32){
		if(app.$refs.craft){
			app.$refs.craft.click();
		}
	}else if(
		e.keyCode === 119 || e.key === 'w' || e.keyCode === 38 ||
		e.keyCode === 97 || e.key === 'a'  || e.keyCode === 37 ||
		e.keyCode === 115 || e.key === 's' || e.keyCode === 40 ||
		e.keyCode === 100 || e.key === 'd'  || e.keyCode === 39
		){
		app.moveListener(e.keyCode, e.key);
	}
}

function disableMove(){
	window.removeEventListener('keydown', keypressListener, true);
}

function enableMove(){
	window.addEventListener('keydown', keypressListener, true);
}

function clickListener(){
	app.clickCount++;
}

function random(n, m){
	return Math.floor(Math.random() * (n - m + 1)) + m
}

function randomIndex(arr){
	var r = Math.floor(Math.random()*arr.length);
	return arr[r];
}

//================================================
function gameOver(condition){
	if(!app.gameIsOver){
		if(condition){
			// console.log('WIN:', condition)
			app.win = true;
		}else{
			// console.log('LOST')
			app.win = false;
		}
		var allMarked = true;
		for (var i = 0; i < app.map.length; i++) {
			var tile = app.map[i];
			if(!tile.marked){
				allMarked = false;
			}
		}
		app.allAreaMarked = allMarked;
		app.gameIsOver = true;
		clearInterval(app.countInterval);
		clearInterval(app.enemy.moveInterval);
		clearInterval(app.enemy.attackInterval);
		disableMove();
		window.removeEventListener('click', clickListener, true);
	}
}

})();