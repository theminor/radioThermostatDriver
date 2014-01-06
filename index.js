var util = require('util');
var stream = require('stream');
var exec = require('child_process').exec;
var commands = require('./commands');

util.inherits(Driver,stream);
util.inherits(Device,stream);

// not so elegant way to store all of the devices created by the driver, plus a few variables...
var deviceList = [];
var updateInterval = 300000; // update interval in milliseconds (for example, 600000 = 10 minutes)
var pauseAfterSetToUpdate = 7000; // time in milliseconds to wait after submitting/setting data before we try to run an update
var pauseBetweenUpdateCommands = 5; // time in seconds to wait between submitting/setting the two data requests - this is not currently used...
var ipAddressOfThermostat = "192.168.1.111"; // ip address of the thermostat

function Driver(opts,app) {
	this._app = app;
	this.opts = opts;
	if (opts.ipadr) ipAddressOfThermostat = opts.ipadr; // ugly way to track these, but it should work for now...
	if (opts.updtInt) updateInterval = opts.updtInt;
	if (opts.pauseAftUpdt) pauseAfterSetToUpdate = opts.pauseAftUpdt;
	app.once('client::up',function(){
		commands.forEach( this.createCommandDevice.bind(this) );
		updateDevices(app, opts);
		process.nextTick(function() {	// Once all devices are set up, establish a single update process that updates every "updateInterval" seconds
			setInterval(function() {
				updateDevices(app, opts);
			}, updateInterval);
		});
	}.bind(this));
};

Driver.prototype.createCommandDevice = function(cmd) {
	var d = new Device(this._app, cmd);
	this.emit('register', d);
	deviceList.push(d);
};

function Device(app, config) {
	app.log.info('Creating radioThermostatDriver Device : ' + config.name);
	var self = this;
	this._app = app;
	this.config = config;
	this.readable = true;
	this.writeable = config.canSet || false;
	if (this.writeable) { app.log.info('radioThermostatDriver Device ' + config.name + ' is readable and writable' ); } else app.log.info('radioThermostatDriver Device ' + config.name + ' is readable only' );
	this.V = config.vendorId || 0;
	this.D = config.deviceId;
	this.G = 'rtd' + (config.name).replace(/[^a-zA-Z0-9]/g, '');
	this.name = 'radioThermostatDriver - ' + config.name;
	// this.read();
};

function updateDevices(app, opts) {	// runs every "updateInterval" seconds
	app.log.info("Updating radioThermostatDriver Devices...");
	var tstatCmd = "curl -s http://" + ipAddressOfThermostat + "/tstat";
	app.log.info("radioThermostatDriver executing command: " + tstatCmd);
	exec(tstatCmd, function(error, stdout, stderr) {
		app.log.info("Result of radioThermostatDriver command: " + stdout);
		if (error) {
			if (error != null) {
				app.log.warn('radioThermostatDriver : ' + this.name + ' error! - ' + error);
			};
		}
		else if (stderr) {
			if (stderr != null) {
				app.log.warn('radioThermostatDriver : ' + this.name + ' stderr! - ' + stderr);
			};
		}
		else {
			var inputString = (stdout + '');
			var thermostatData = eval ("(" + inputString + ")");
			if (!thermostatData) {
				app.log.warn('radioThermostatDriver was unable to parse data recieved. No update was made this cycle.');
			}
			else {
				deviceList.forEach(function(dev){
					app.log.info('Updating radioThermostatDriver Device: ' + dev.name);
					var parsedResult = undefined;
					(dev.config.data || []).forEach(function(fn) {
						try {
							parsedResult = fn(thermostatData);
						} catch(e) {
							parsedResult = undefined;
						}
						app.log.info(dev.name + ' - parse data: ' + inputString + ' --> ' + parsedResult);
					});
					if (parsedResult !== undefined) {
						app.log.info(dev.name + ' - emmitting data: ' + parsedResult);
						dev.emit('data', parsedResult);
					}
					else {
						app.log.info(dev.name + ' - did not emmit data!');
					};
				});
			};
		};
	});
};

Device.prototype.write = function(dataRcvd) {
	var app = this._app;
	var opts = this.opts;
	app.log.info("radioThermostatDriver Device " + this.name + " received data: " + dataRcvd);
	app.log.info("radioThermostatDriver Device canSet: " + this.config.canSet);
	if (this.config.canSet) {
		var stgSubmit = undefined;
		(this.config.setStg || []).forEach(function(fn) {
			try {
				stgSubmit = fn(ipAddressOfThermostat, dataRcvd);
			} catch(e) {
				stgSubmit = undefined;
			}
		});
		app.log.info("radioThermostatDriver string: " + stgSubmit);
		if (stgSubmit !== undefined) {
			app.log.info(this.name + " - submitting data to thermostat: " + stgSubmit);
			var rslt = exec(stgSubmit, function (error, stdout, stderr) {
				stdout.replace(/(\n|\r|\r\n)$/, '');
				app.log.info(this.name + " - Result: " + stdout);
				setTimeout( function() { updateDevices(app, opts) }, pauseAfterSetToUpdate);
			});
		}
		else {
			app.log.info(this.name + ' - error parsing data!');
		};		
	}
	else {
		app.log.info("radioThermostatDriver Device " + this.name + " received data, but this type of device can't update");
	}
};

Driver.prototype.config = function(rpc,cb) {
	var self = this;
	if (!rpc) {
		this._app.log.info("radioThermostatDriver main config window called");
		return cb(null, {	// main config window
			"contents":[
				{ "type": "paragraph", "text": "The radioThermostatDriver allows you to monitor and control WiFi Thermostats such as the ones from radiothermostat.com. Enter the settings below to get started, and please make sure you get a confirmation message after hitting 'Submit' below. (You may have to click it a couple of times. If you don't get a confirmation message, the settings did not update!)"},
				{ "type": "input_field_text", "field_name": "ip_addr_text", "value": "", "label": "IP Address of Your Thermostat", "placeholder": ipAddressOfThermostat, "required": true},
				{ "type": "input_field_text", "field_name": "update_int_secs_text", "value": "", "label": "Update Interval in Seconds", "placeholder": updateInterval/1000, "required": true},
				{ "type": "input_field_text", "field_name": "pause_bt_cmds_secs_text", "value": "", "label": "Seconds to Pause Between Thermostat Commands", "placeholder": pauseBetweenUpdateCommands, "required": true},
				{ "type": "input_field_text", "field_name": "pause_aft_updt_secs_text", "value": "", "label": "Seconds to Pause After a Command Before Updating", "placeholder": updateInterval/1000, "required": true},
				{ "type": "paragraph", "text": " "},
				{ "type": "submit", "name": "Submit", "rpc_method": "submt" },
				{ "type": "close", "name": "Cancel" },
			]
		});
	};
	if (rpc.method == "submt") {
		this._app.log.info("radioThermostatDriver config window submitted. Checking data for errors...");
		// check for errors
		var rgx = new RegExp("^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"); // Test ip_addr_text to match this regex - simple ip address checking does not check nodes for > 255, but should suffice for now...
		if (!rgx.test(rpc.params.ip_addr_text)) {
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "IP address was invalid - please use standard ipv4 address, such as: 123.45.6.789. Please try again." },
					{ "type": "close"    , "name": "Close" }
				]
			});			
			return;
		}
		else if (!(rpc.params.update_int_secs_text >= 0)) {	// update_int_secs_text must evaluate to a positive number 
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "the 'update interval' must be a number and can't be negative. Please try again." },
					{ "type": "close"    , "name": "Close" }
				]
			});			
			return;			
		}
		else if (!(rpc.params.pause_bt_cmds_secs_text >= 0)) {	// pause_bt_cmds_secs_text must evaluate to a positive number 
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "The 'pause between commands' interval must be a number and can't be negative. Please try again." },
					{ "type": "close"    , "name": "Close" }
				]
			});			
			return;				
		}	
		else if (!(rpc.params.pause_aft_updt_secs_text >= 0)) {	// pause_aft_updt_secs_text must evaluate to a positive number 
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "The 'pause after update' interval must be a number and can't be negative. Please try again." },
					{ "type": "close"    , "name": "Close" }
				]
			});			
			return;				
		}
		else {	// looks like the submitted values were valid, so update
			this._app.log.info("radioThermostatDriver data appears valid. Saving settings...");
            self.opts.ipadr = rpc.params.ip_addr_text;
            self.opts.updtInt = rpc.params.update_int_secs_text * 1000; // need this in milliseconds
			self.opts.pauseBtCmds = rpc.params.pause_bt_cmds_secs_text; // this optin isn't used right now...
			self.opts.pauseAftUpdt = rpc.params.pause_aft_updt_secs_text * 1000; // also need this in milliseconds
			ipAddressOfThermostat = self.opts.ipadr; // ugly way to track these, but it should work for now...
			updateInterval = self.opts.ipadr;
			pauseAfterSetToUpdate = self.opts.ipadr;
			self.save();
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "Configuration was successful. (TODO: actually update!) radioThermostatDriver values should update shortly!" },
					{ "type": "close"    , "name": "Close" }
				]
			});
			updateDevices(this._app, self.opts);
		};
	}
	else {
		this._app.log.info("radioThermostatDriver - Unknown rpc method was called!");
	};
};

module.exports = Driver;

