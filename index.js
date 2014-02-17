var util = require('util');
var stream = require('stream');
var http = require('http');
var commands = require('./commands');

util.inherits(Driver,stream);
util.inherits(Device,stream);

function Driver(opts, app) {
	var self = this;
	self._app = app;
	self.opts = opts;
	self.ips = {};	// an easy reference to all the devices. ips is structured like this: { "192.168.1.111" : [ device1, device 2, etc. ], "192.168.1.112" : [ device1, device 2, etc. ] }
	app.once('client::up',function(){
		self.establishDevices();
		process.nextTick(function() {	// Once all devices are set up, establish a single update process that updates every "updtInt" seconds
			setInterval(function() {
				self.updateDevices();
			}, opts.updtInt);
		});
	});
};

Driver.prototype.establishDevices = function() {
	var self = this;
	var ipList = self.opts.ipadr.split("|");
	for(var devIp in self.ips) {								// first remove any ips which are in the tracked device list, but have been removed from the options list
		var found = false;
		ipList.forEach(function(listIp) {
			if (listIp.trim() === devIp.trim()) { found = true; };
		});
		if (!found) { self.ips[devIp.trim()] = undefined; };	// devIp (the tracked device list) was never found in the list of ips in the options list, so remove it from the tracked device list
	};															// I found no documentation on the ninja blocks api (which is incomplete) as to how to emit a 'remove' or similar functionality for devices...
	self.opts.ipadr.split("|").forEach(function(singleIp) {		// next add any devices in the options list that are not already in the tracked device list
		var trimmedIp = singleIp.trim();
		if (!self.ips[trimmedIp]) {								// see if it is there already. If not, add it
			self.ips[trimmedIp] = [];
			commands.forEach(function(cmd) {					// for each ip, add a new device for each command in commands.js
				var d = new Device(self._app, cmd, trimmedIp);
				self.emit('register', d);
				self.ips[trimmedIp].push(d);					// add it to the list of tracked devices in ips
				d.parentDevice = self;							// reference for updating later...
			});
		};
	});
	self.updateDevices();
};

Driver.prototype.updateDevices = function() {
	var self = this;
	self._app.log.info("Updating radioThermostatDriver Devices...");
	for (ip in self.ips) {	// fetch the data once per ip address, then use that data and parse many times as necessary per device
		var curIp = ip;
		if (self.ips[curIp]) {	// cover the weird case of an undefined key in the object (perhaps in case one got removed by changing settings, for example)
			self._app.log.info("radioThermostatDriver connecting to: http://" + curIp + "/tstat");
			http.get(			// see http://nodejs.org/docs/v0.5.2/api/http.html#http.get
			{	host: curIp,		// example would be "curl -s http://" + ipAddressOfThermostat + "/tstat"
				port: 80,
				path: '/tstat'
			},
			function (res) {
				var result = '';
				res.on('data', function (chunk) {
					result += chunk;
				});
				res.on('end', function () {
					var inputString = (result + '');
					self._app.log.info("Result of radioThermostatDriver command from " + curIp + " : " + inputString);
					var tstatData = eval ("(" + inputString + ")"); // return data into var tstatData
					if (!tstatData) {
						self._app.log.warn('radioThermostatDriver was unable to parse data recieved from ' + curIp + ' - No update was made this cycle.');
					}
					else {
						self._app.log.info("Updating devices for ip " + curIp);
						self.ips[curIp].forEach(function(device) {
							self._app.log.info("Updating " + device.name);
							device.lastData = tstatData;
							var parsedResult = undefined;
							(device.config.getStg || []).forEach(function(fn) {
								try {
									parsedResult = fn(tstatData);
								} catch(e) {
									parsedResult = undefined;
								}
								self._app.log.info(device.name + ' - parse data: ' + inputString + ' --> ' + parsedResult);
							});
							if (parsedResult !== undefined) {
								self._app.log.info(device.name + ' - emitting data: ' + parsedResult);
								device.emit('data', parsedResult);
							}
							else {
								self._app.log.info(device.name + ' - did not emmit data!');
							};
						});
					};
				});
			}).on('error', function(e) {
				self._app.log.warn('radioThermostatDriver : ' + self.name + ' error! - ' + e.message);
			});
		};
	};
};

function Device(app, config, ip) {
	app.log.info('Creating radioThermostatDriver Device : ' + ip + ' - ' + config.name);	// Keep as log.info
	this._app = app;
	this.config = config;
	this.ip = ip;
	this.readable = true;
	this.writeable = config.canSet || false;
	if (this.writeable) { app.log.info('radioThermostatDriver Device ' + config.name + ' is readable and writable' ); } else app.log.info('radioThermostatDriver Device ' + config.name + ' is readable only' );
	this.V = config.vendorId || 0;
	this.D = config.deviceId;
	this.G = 'rtd' + (config.name + ip).replace(/[^a-zA-Z0-9]/g, '');
	this.name = 'radioThermostatDriver - ' + ip + ' - ' + config.name;
};

Device.prototype.write = function(dataRcvd) {
	var self = this;
	self._app.log.info("radioThermostatDriver Device " + self.name + " received data: " + dataRcvd);
	if (self.config.canSet) {
		var postData = undefined;
		(self.config.setStg || []).forEach(function(fn) {
			try {
				postData = fn(self.ip, dataRcvd, self.lastData);
			} catch(e) {
				postData = undefined;
			}
		});
		self._app.log.info("radioThermostatDriver string: " + postData);
		if (postData !== undefined) {
			self._app.log.info(self.name + " - submitting data to thermostat: " + postData);
			var post_req = http.request(
				{
					host: self.ip,
					port: 80,
					path: '/tstat',
					method: 'POST',
					headers: {
					  'Content-Type': 'application/x-www-form-urlencoded',
					  'Content-Length': postData.length
					}
				}, function(res) {
					var result = '';
					res.setEncoding('utf8');
					res.on('data', function (chunk) {
						result += chunk;
					});
					res.on('end', function () {
						self._app.log.info(self.name + " - Result: " + result);
						setTimeout( function() { self.parentDevice.updateDevices() }, self.parentDevice.opts.pauseAftUpdt );
					});
				}
			);
			post_req.write(postData);
			post_req.end();
		}
		else {
			self._app.log.info(self.name + ' - error parsing data!');
		};                
	}
	else {
		self._app.log.info("radioThermostatDriver Device " + self.name + " received data, but this type of device can't update");
	};
};

Driver.prototype.config = function(rpc, cb) {
	var self = this;
	if (!rpc) {
		self._app.log.info("radioThermostatDriver main config window called");
		return cb(null, {        // main config window
			"contents":[
				{ "type": "paragraph", "text": "The radioThermostatDriver allows you to monitor and control WiFi Thermostats such as the ones from radiothermostat.com. Enter the settings below to get started, and please make sure you get a confirmation message after hitting 'Submit' below. (You may have to click it a couple of times. If you don't get a confirmation message, the settings did not update!)"},
				{ "type": "input_field_text", "field_name": "ip_addr_text", "value": self.opts.ipadr, "label": 'IP Address(es) of Your Thermostat(s) - separate the ip addresses of multiple thermostats with a pipe character ("|")', "placeholder": self.opts.ipadr, "required": true},
				{ "type": "input_field_text", "field_name": "update_int_secs_text", "value": self.opts.updtInt/1000, "label": "Update Interval in Seconds", "placeholder": self.opts.updtInt/1000, "required": true},
				{ "type": "input_field_text", "field_name": "pause_bt_cmds_secs_text", "value": self.opts.pauseBtCmds, "label": "Seconds to Pause Between Thermostat Commands", "placeholder": self.opts.pauseBtCmds, "required": true},
				{ "type": "input_field_text", "field_name": "pause_aft_updt_secs_text", "value": self.opts.pauseAftUpdt/1000, "label": "Seconds to Pause After a Command Before Updating", "placeholder": self.opts.pauseAftUpdt/1000, "required": true},
				{ "type": "paragraph", "text": " "},
				{ "type": "submit", "name": "Submit", "rpc_method": "submt" },
				{ "type": "close", "name": "Cancel" },
			]
		});
	};
	if (rpc.method == "submt") {
		self._app.log.info("radioThermostatDriver config window submitted. Checking data for errors..."); // check for errors
		var rgx = new RegExp("^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"); // Test ip_addr_text to match this regex - simple ip address checking does not check nodes for > 255, but should suffice for now...
		var ipsOK = true;	// will set to false if we find one that is invalid
		rpc.params.ip_addr_text.split("|").forEach(function(ip) {	// test each ip address for match with the regex
			if (!rgx.test(ip.trim())) { ipsOK = false };
		});
		if (!ipsOK) {
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": 'IP address was invalid - please use standard ipv4 address, such as: 123.45.6.789. If using multiple ip addresses, selerate each with a pipe charagter ("|"). Do not put and spaces between them. Please try again.' },
					{ "type": "close"    , "name": "Close" }
				]
			});                        
			return;
		}
		else if (!(rpc.params.update_int_secs_text >= 0)) {        // update_int_secs_text must evaluate to a positive number 
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "the 'update interval' must be a number and can't be negative. Please try again." },
					{ "type": "close"    , "name": "Close" }
				]
			});                        
			return;                        
		}
		else if (!(rpc.params.pause_bt_cmds_secs_text >= 0)) {        // pause_bt_cmds_secs_text must evaluate to a positive number 
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "The 'pause between commands' interval must be a number and can't be negative. Please try again." },
					{ "type": "close"    , "name": "Close" }
				]
			});                        
			return;                                
		}        
		else if (!(rpc.params.pause_aft_updt_secs_text >= 0)) {        // pause_aft_updt_secs_text must evaluate to a positive number 
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "The 'pause after update' interval must be a number and can't be negative. Please try again." },
					{ "type": "close"    , "name": "Close" }
				]
			});                        
			return;                                
		}
		else {        // looks like the submitted values were valid, so update
			self._app.log.info("radioThermostatDriver data appears valid. Saving settings...");
			self.opts.ipadr = rpc.params.ip_addr_text;
			self.opts.updtInt = rpc.params.update_int_secs_text * 1000; // need this in milliseconds
			self.opts.pauseBtCmds = rpc.params.pause_bt_cmds_secs_text; // this optin isn't used right now...
			self.opts.pauseAftUpdt = rpc.params.pause_aft_updt_secs_text * 1000; // also need this in milliseconds
			self.save();
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "Configuration was successful. radioThermostatDriver values should update shortly!" },
					{ "type": "close"    , "name": "Close" }
				]
			});
			self.establishDevices();
		};
	}
	else {
		self._app.log.warn("radioThermostatDriver - Unknown rpc method was called!");
	};
};

module.exports = Driver;
