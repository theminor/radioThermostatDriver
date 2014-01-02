var stream = require('stream')
  , util = require('util')
  , exec = require('child_process').exec,
    child;

// Give our device a stream interface
util.inherits(Device,stream);

// Export it
module.exports=Device;

// my Variables
var updateInterval = 600000; // update interval in milliseconds (for example, 600000 = 10 minutes)
var pauseAfterSetToUpdate = 10000; // time in milliseconds to wait after submitting/setting data before we try to run an update
var pauseBetweenUpdateCommands = 5; // time in seconds to wait between submitting/setting the two data requests
var ipAddressOfThermostat = "192.168.1.135"; // ip address of the thermostat

function updateDevice(self) {
	// issues two commands to the thermostat device to get the temp data (stored in "tempData") and the program data (stored in "progData")
	// temp output: {"temp":0.0,"tmode":0,"fmode":0,"override":0,"hold":0,"t_cool":0.0,"time":{"day":0,"hour":0,"minute":0}}
	// program output (http://192.168.1.135/tstat/program/heat): {"0":[375,68,1365,60,1365,60,1365,60],"1":[375,68,1365,60,1365,60,1365,60],"2":[375,68,1365,60,1365,60,1365,60],"3":[375,68,1365,60,1365,60,1365,60],"4":[390,68,1365,60,1365,60,1365,60],"5":[390,68,1365,60,1365,60,1365,60],"6":[390,68,1365,60,1365,60,1365,60]}
	// full output: {"tempData":{temp output},"heatProgData":{program output}, "coolProgData":{program output}}
	var tempCmdSubmit = "curl http://" + ipAddressOfThermostat + "/tstat";
	var heatPrgCmdSubmit = "sleep " + pauseBetweenUpdateCommands + " && curl http://" + ipAddressOfThermostat + "/tstat/program/heat";
	var coolPrgCmdSubmit = "sleep " + pauseBetweenUpdateCommands + " && curl http://" + ipAddressOfThermostat + "/tstat/program/cool";
	var rsltStg = "";
	console.log("[radioThermostatDriver] Submitting command: " + tempCmdSubmit);
	// exec(command, [options], callback) -- see http://nodejs.org/api/child_process.html -- command is string of command to call, callback is Function called with the output when process terminates
	child = exec(tempCmdSubmit, function (error, stdout, stderr) {
		stdout.replace(/(\n|\r|\r\n)$/, '');
		console.log("[radioThermostatDriver] Result: " + stdout);
		rsltStg = '{"tempData":' + stdout + ',"heatProgData":'; // rsltStg is built as the results of the processes below finish
		console.log("[radioThermostatDriver] Submitting command: " + heatPrgCmdSubmit);
		child = exec(heatPrgCmdSubmit, function (error1, stdout1, stderr1) {
			stdout1.replace(/(\n|\r|\r\n)$/, '');
			console.log("[radioThermostatDriver] Result: " + stdout1);
			rsltStg = rsltStg + stdout1 + ',"coolProgData":';
			console.log("[radioThermostatDriver] Submitting command: " + coolPrgCmdSubmit);
			child = exec(coolPrgCmdSubmit, function (error2, stdout2, stderr2) {
				stdout2.replace(/(\n|\r|\r\n)$/, '');
				console.log("[radioThermostatDriver] Result: " + stdout2);			
				rsltStg = rsltStg + stdout2 + '}';
				console.log("[radioThermostatDriver] Combined Result: " + rsltStg);
				self.emit('data',rsltStg);
			});
		});
	});
};

/**
 * Creates a new Device Object
 *
 * @property {Boolean} readable Whether the device emits data
 * @property {Boolean} writable Whether the data can be actuated
 *
 * @property {Number} G - the channel of this device
 * @property {Number} V - the vendor ID of this device
 * @property {Number} D - the device ID of this device
 *
 * @property {Function} write Called when data is received from the Ninja Platform
 *
 * @fires data - Emit this when you wish to send data to the Ninja Platform
 */
function Device() {
	var self = this;

	// This device will emit data
	this.readable = true;
	// This device can be actuated
	this.writeable = true;

	this.G = "0"; // G is a string a represents the channel
	this.V = 0; // 0 is Ninja Blocks' device list
	this.D = 2000; // 2000 is a generic Ninja Blocks sandbox device

	process.nextTick( function() { updateDevice(self) }, updateInterval); // update every "updateInterval" seconds
};

/**
 * Called whenever there is data from the Ninja Platform
 * This is required if Device.writable = true
 *
 * @param  {String} data The data received
 */
Device.prototype.write = function(dataTxt) {
	// I'm being actuated with data
	// data should take the form:
	// {"resourceLocation":"/tstat", "resourceData":{"tmode":1,"t_heat":67}} -- this, for example, sets the heat mode and sets heat to 72
	// OR the following special string: "update" will submit an immediate update of the device
	console.log("[radioThermostatDriver] Data command received from the Ninja Platform: " + dataTxt);
	var self = this;
	if (dataTxt == "update") { updateDevice(self) }	else {
		var data = eval("(" + dataTxt + ")");
		var cmdSubmit = "curl -d '" + JSON.stringify(data.resourceData) + "' http://" + ipAddressOfThermostat + data.resourceLocation;
		console.log("[radioThermostatDriver] Submitting command: " + cmdSubmit);
		rslt =	exec(cmdSubmit, function (error, stdout, stderr) {
				stdout.replace(/(\n|\r|\r\n)$/, '');
				console.log("[radioThermostatDriver] Result: " + stdout);
				});
		setTimeout( function() { updateDevice(self) }, pauseAfterSetToUpdate);
	};
};

