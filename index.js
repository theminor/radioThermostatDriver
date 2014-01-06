var util = require('util');
var stream = require('stream');
var exec = require('child_process').exec;
var commands = require('./commands');

util.inherits(Driver,stream);
util.inherits(Device,stream);

// not so elegant way to store all of the devices created by the driver, plus a few variables...
var deviceList = [];
var weathDataFeatures = ["conditions"]  // a single api request can combine many forms of data so as to save you # of requests per day, etc. - can be: alerts, almanac, astronomy, conditions, currenthurricane, forecast, forecast10day, geolookup, history, hourly, hourly10day, planner, rawtide, satellite, tide, webcams, yesterday
var apiKey = "xxx"; // api key obtained from http://www.wunderground.com/weather/api/ (documentation: http://www.wunderground.com/weather/api/d/docs)
var zipCode = "10007"; // zip code of location
var useFahrenheit = true; // set false to use Celsius
var pauseAfterSetToUpdate = 5000; // in milliseconds
var updateInterval = 300000; // in milliseconds

function Driver(opts,app) {
	this._app = app;
	this.opts = opts;
	if (opts.apiKey) apiKey = opts.apiKey; // ugly way to track these, but it should work for now...
	if (opts.zipCode) zipCode = opts.zipCode;
	if (opts.useFahrenheit) useFahrenheit = opts.useFahrenheit;	
	if (opts.pauseAfterSetToUpdate) pauseAfterSetToUpdate = opts.pauseAfterSetToUpdate;	
	if (opts.updateInterval) updateInterval = opts.updateInterval;		
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
	app.log.info('Creating weatherDriver Device : ' + config.name);
	var self = this;
	this._app = app;
	this.config = config;
	this.readable = true;
	this.writeable = config.canSet || false;
	if (this.writeable) { app.log.info('weatherDriver Device ' + config.name + ' is readable and writable' ); } else app.log.info('weatherDriver Device ' + config.name + ' is readable only' );
	this.V = config.vendorId || 0;
	this.D = config.deviceId;
	this.G = 'wd' + (config.name).replace(/[^a-zA-Z0-9]/g, '');
	this.name = 'weatherDriver - ' + config.name;
	// this.read();
};

function updateDevices(app, opts) {	// runs every "updateInterval" seconds
	app.log.info("Updating weatherDriver Devices...");
	var getTempCmd = "curl -s http://api.wunderground.com/api/" + apiKey + "/" + weathDataFeatures.join("/") + "/q/" + zipCode + ".json";  // example: http://api.wunderground.com/api/6ed6c7fe07d64fa7/conditions/q/30736.json - See api for documentation - http://api.wunderground.com/api/apiKey/features (can be combined more than one)/settings (leave out to accept defaults)/q/query (the location - can be a zip code, city, etc).format (json or xml)
	app.log.info("weatherDriver executing command: " + getTempCmd);
	exec(getTempCmd, function(error, stdout, stderr) {
		app.log.info("Result of weatherDriver command: " + stdout);
		if (error) {
			if (error != null) {
				app.log.warn('weatherDriver : ' + this.name + ' error! - ' + error);
			};
		}
		else if (stderr) {
			if (stderr != null) {
				app.log.warn('weatherDriver : ' + this.name + ' stderr! - ' + stderr);
			};
		}
		else {
			var useFht = false;
			if (useFahrenheit==true || useFahrenheit=="true") { useFht = true }; // account for "false" stored as string
			var inputString = (stdout + '');
			var wData = eval ("(" + inputString + ")");
			if (!wData) {
				app.log.warn('weatherDriver was unable to parse data recieved. No update was made this cycle.');
			}
			else {
				deviceList.forEach(function(dev){
					app.log.info('Updating weatherDriver Device: ' + dev.name);
					var parsedResult = undefined;
					(dev.config.data || []).forEach(function(fn) {
						try {
							parsedResult = fn(wData, useFht);
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
	app.log.info("weatherDriver Device " + this.name + " received data: " + dataRcvd);
	app.log.info("weatherDriver Device canSet: " + this.config.canSet);
	if (this.config.canSet) {
		var stgSubmit = undefined;
		(this.config.setStg || []).forEach(function(fn) {
			try {
				stgSubmit = fn(apiKey, dataRcvd);
			} catch(e) {
				stgSubmit = undefined;
			}
		});
		app.log.info("weatherDriver string: " + stgSubmit);
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
		app.log.info("weatherDriver Device " + this.name + " received data, but this type of device can't update");
	}
};

Driver.prototype.config = function(rpc,cb) {
	var self = this;
	if (!rpc) {
		this._app.log.info("weatherDriver main config window called");
		return cb(null, {	// main config window
			"contents":[
				{ "type": "paragraph", "text": "The weatherDriver allows you to monitor the weather outside. To use this, you'll need a free api from http://www.wunderground.com/weather/api/ - Enter the settings below to get started, and please make sure you get a confirmation message after hitting 'Submit' below. (You may have to click it a couple of times. If you don't get a confirmation message, the settings did not update!)"},
				{ "type": "input_field_text", "field_name": "api_text", "value": apiKey, "label": "API from wunderground.com", "placeholder": apiKey, "required": true},
				{ "type": "input_field_text", "field_name": "zip_code_text", "value": zipCode, "label": "Zip Code", "placeholder": zipCode, "required": true},
				{ "type": "input_field_select", "field_name": "use_fahrenheit_select", "label": "Temperature Type to Display", "options": [{ "name": "Fahrenheit", "value": true, "selected": useFahrenheit}, { "name": "Celsius", "value": false, "selected": !useFahrenheit}], "required": true },
				{ "type": "input_field_text", "field_name": "pause_aft_updt_secs_text", "value": pauseAfterSetToUpdate/1000, "label": "Seconds to Pause After a Command Before Updating", "placeholder": pauseAfterSetToUpdate/1000, "required": true},
				{ "type": "input_field_text", "field_name": "update_interval_text", "value": updateInterval/1000, "label": "How frequently to update data in seconds. (NOTE each update counts as an api call, so limit this per the number of calls per day your api plan allows)", "placeholder": updateInterval/1000, "required": true},
				{ "type": "paragraph", "text": " "},
				{ "type": "submit", "name": "Submit", "rpc_method": "submt" },
				{ "type": "close", "name": "Cancel" },
			]
		});
	};
	if (rpc.method == "submt") {
		this._app.log.info("weatherDriver config window submitted. Checking data for errors...");
		// check for errors
		if (!(rpc.params.zip_code_text >= 0)) {	// zip_code_text must evaluate to a positive number or 0
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "zip code must be a number and can't be negative. Please try again." },
					{ "type": "close"    , "name": "Close" }
				]
			});			
			return;			
		}
		else if (!(rpc.params.pause_aft_updt_secs_text >= 0)) {	// pause_aft_updt_secs_text must evaluate to a positive number or 0
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "The 'pause after update' interval must be a number and can't be negative. Please try again." },
					{ "type": "close"    , "name": "Close" }
				]
			});			
			return;				
		}
		else if (!(rpc.params.update_interval_text >= 0)) {	// update_interval_text must evaluate to a positive number or 0
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "The 'update interval' must be a number and can't be negative. Please try again." },
					{ "type": "close"    , "name": "Close" }
				]
			});			
			return;				
		}		
		else {	// looks like the submitted values were valid, so update
			this._app.log.info("weatherDriver data appears valid. Saving settings...");
            self.opts.apiKey = rpc.params.api_text;
            self.opts.zipCode = rpc.params.zip_code_text;
			self.opts.useFahrenheit = rpc.params.use_fahrenheit_select;
			self.opts.pauseAftUpdt = rpc.params.pause_aft_updt_secs_text * 1000; // also need this in milliseconds
			self.opts.updateInterval = rpc.params.update_interval_text * 1000; // also need this in milliseconds			
			apiKey = self.opts.apiKey; // ugly way to track these, but it should work for now...
			zipCode = self.opts.zipCode;
			useFahrenheit = self.opts.useFahrenheit;
			pauseAftUpdt = self.opts.pauseAftUpdt;
			updateInterval = self.opts.updateInterval;			
			self.save();
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "Configuration was successful. weatherDriver values should update shortly!" },
					{ "type": "close"    , "name": "Close" }
				]
			});
			updateDevices(this._app, self.opts);
		};
	}
	else {
		this._app.log.info("weatherDriver - Unknown rpc method was called!");
	};
};

module.exports = Driver;
