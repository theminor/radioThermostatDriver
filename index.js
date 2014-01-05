var util = require('util');
var stream = require('stream');
var exec = require('child_process').exec;
var commands = require('./commands');
// var configHandlers = require('./config-handlers');

util.inherits(Driver,stream);
util.inherits(Device,stream);

// not so elegant way to store all of the devices created by the driver...
var deviceList = [];

// my variables (***TODO: incorporate these into configuration)
var updateInterval = 30000; // update interval in milliseconds (for example, 600000 = 10 minutes)
var pauseAfterSetToUpdate = 10000; // time in milliseconds to wait after submitting/setting data before we try to run an update
var pauseBetweenUpdateCommands = 5; // time in seconds to wait between submitting/setting the two data requests
var ipAddressOfThermostat = "192.168.1.135"; // ip address of the thermostat
var tstatCmd = "curl -s http://" + ipAddressOfThermostat + "/tstat";

function Driver(opts,app) {
	this._app = app;
	app.once('client::up',function(){
		commands.forEach( this.createCommandDevice.bind(this) );
		process.nextTick( function() { 	app.log.info("UPDATE"); updateDevices(app) }, updateInterval); // Once all devices are set up, establish a single update process that updates every "updateInterval" seconds
	}.bind(this));
}

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

function updateDevices(app) {	// runs every "updateInterval" seconds
	app.log.info("Updating radioThermostatDriver Devices...");
	app.log.info("radioThermostatDriver executing command: " + tstatCmd);
	exec(tstatCmd, function(error, stdout, stderr) {
		app.log.info("Result of radioThermostatDriver command: " + stdout);
		if (error) {
			if (error != null) {
				app.log.warn('radioThermostatDriver : ' + this.name + ' error! - ' + error);
				return;
		  };
		};
		if (stderr) {
			if (stderr != null) {
				app.log.warn('radioThermostatDriver : ' + this.name + ' stderr! - ' + stderr);
				return;
			};
		};
		var inputString = (stdout + '');
		var thermostatData = eval ("(" + inputString + ")");
		if (!thermostatData) {
			app.log.warn('radioThermostatDriver was unable to parse data recieved. No update was made this cycle.');
			return;
		};
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
	});
};

Device.prototype.write = function(dataRcvd) {
	var app = this._app;
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
				setTimeout( function() { updateDevices(app) }, pauseAfterSetToUpdate);
			});
		}
		else {
			app.log.info(this.name + ' - error parsing data!');
		};		
	}
	else {
		app.log.info("radioThermostatDriver Device " + this.name + " received data, but this type of device can't update");
	}
}

module.exports = Driver;

