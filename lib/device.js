var stream = require('stream')
  , util = require('util')
  , exec = require('child_process').exec,
    child;

// var stream = require('stream')
//  , util = require('util');

// Give our device a stream interface
util.inherits(Device,stream);

// Export it
module.exports=Device;

//my Variables
var setTemp = 0; // to store the current set temperature
var updateInterval = 30000; // update interval in milliseconds
var ipAddressOfThermostat = "192.168.1.135";


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

        process.nextTick(function() {

                /**
                * Called whenever there is data from the Ninja Platform
                * This is required if Device.writable = true
                *
                * @param  {String} data The data received
                */
                // Device.prototype.write = function(data) {

                        // I'm being actuated with data!
                //      console.log(data);
                // };

                setInterval(function() {
                        child = exec("curl http://" + ipAddressOfThermostat + "/tstat", function (error, stdout, stderr) {  // the radio thermostat outputs json data upon querey to http://ipaddress/tstat/
                                stdout.replace(/(\n|\r|\r\n)$/, '');
                                console.log("Data received from 'curl http://" + ipAddressOfThermostat + "/tstat :' " + stdout);
                                self.emit('data',stdout);
                        });
                }, updateInterval); // update every "updateInterval" seconds
        });
};

/**
 * Called whenever there is data from the Ninja Platform
 * This is required if Device.writable = true
 *
 * @param  {String} data The data received
 */
Device.prototype.write = function(data) {
        // I'm being actuated with data!
        console.log("Data received from the Ninja Platform: " + data);

};
