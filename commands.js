module.exports = [
    {
        name: 'Thermostat Current Temperature',
        deviceId: 9,
        getStg: [function(thermostatData) {
			return thermostatData.temp;
        }],
		canSet: false,
    },
    {
        name: 'Thermostat Target Temperature',
        deviceId: 31,
        getStg: [function(thermostatData) {
			var tTemp = thermostatData.t_cool;
			if (!tTemp) tTemp = thermostatData.t_heat;
			return tTemp;
        }],
		canSet: true,
		setStg: [function(ipAddr, data, lastData) { // example:   curl -d '{"t_cool":67,"t_heat":67}' http://1.1.1.1/tstat
			if (isNaN(data)) {
				return undefined;
			}
			else {
				if (lastData.t_heat) { return "curl -d '{\"t_heat\":" + data + "}' http://" + ipAddr + "/tstat"; }
				else if (lastData.t_cool) { return "curl -d '{\"t_cool\":" + data + "}' http://" + ipAddr + "/tstat"; }
				else { return undefined; }
			}
			// if (isNaN(data)) return ""; else return "curl -d '{\"t_cool\":" + data + ",\"t_heat\":" + data + "}' http://" + ipAddr + "/tstat";        // setStg just returns the string we want to execute
        }],
    },
    {
        name: 'Thermostat Hold Mode',                // current thermostat hold mode ("tmode") - will be one of: 0: disabled, 1: enabled
        deviceId: 244,
        getStg: [function(thermostatData) {
			var hmModes = ["Thermostat Hold Disabled","Thermostat Hold Enabled"];
			return hmModes[thermostatData.tmode] || "Thermostat Hold Unknown";
        }],
		canSet: true,
		setStg: [function(ipAddr, data, lastData) { // example:   curl -d '{"hold":1}' http://1.1.1.1/tstat  (turns hold on)
			var hldNum = {"Thermostat Hold Disabled":0,"Thermostat Hold Enabled":1};
			if (hldNum[data]) { return "curl -d '{\"hold\":" + hldNum[mode] + "}' http://" + ipAddr + "/tstat"; } else { return undefined; };
        }],
    },
    {
        name: 'Thermostat Operating Mode',                // current thermostat operating mode ("tmode") - will be one of: 0: OFF, 1: HEAT, 2: COOL, 3: AUTO
        deviceId: 244,
        getStg: [function(thermostatData) {
			var opModes = ["Thermostat Mode Off","Thermostat Heat Mode","Thermostat Cool Mode","Thermostat Auto Mode"];
			return opModes[thermostatData.tmode] || "Thermostat Mode Unknown";
        }],
		canSet: true,
		setStg: [function(ipAddr, data, lastData) { // example:   curl -d '{"tmode":1}' http://1.1.1.1/tstat  (turns to heat mode)
			var modNum = {"Thermostat Mode Off":0,"Thermostat Heat Mode":1,"Thermostat Cool Mode":2,"Thermostat Auto Mode":3};
			if (modNum[data]) { return "curl -d '{\"tmode\":" + modNum[data] + "}' http://" + ipAddr + "/tstat"; } else { return undefined; };
        }],
    },
    {
        name: 'Thermostat Fan Operating Mode',                // show current thermostat fan operating mode ("fmode") - will be one of: 0: AUTO, 1: AUTO/CIRCULATE, 2: ON
        deviceId: 244,
        getStg: [function(thermostatData) {
			var fanOpModes = ["Thermostat Fan Auto Mode","Thermostat Fan Auto/Circ","Thermostat Fan Mode On"];
			return fanOpModes[thermostatData.fmode] || "Thermostat Fan Unknown";
        }],
		canSet: true,
		setStg: [function(ipAddr, data, lastData) { // example:   curl -d '{"tmode":1}' http://1.1.1.1/tstat  (turns to heat mode)
			var modNum = {"Thermostat Fan Auto Mode":0,"Thermostat Fan Auto/Circ":1,"Thermostat Fan Mode On":2};
			if (modNum[data]) { return "curl -d '{\"tmode\":" + modNum[data] + "}' http://" + ipAddr + "/tstat"; } else { return undefined; };
        }],
    },        
    {
        name: 'Thermostat Time',                // output a string of the thermostat time ("time":{"day":0,"hour":0,"minute":0}}) - day 0 = Monday
        deviceId: 3680,
        getStg: [function(thermostatData) {
			var daysWeek = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday', 'Sunday'];
			var weekDay = daysWeek[thermostatData.time.day];
			var paddedMin = (thermostatData.time.minute < 10) ? ("0" + thermostatData.time.minute) : thermostatData.time.minute;
			return weekDay + ", " + thermostatData.time.hour + ":" + paddedMin; // for example, "Wednesday, 13:34"
        }],
		canSet: false,
    },  
];

/*
    name: string - the name of the device
    deviceId: number - the device id of the device - see http://ninjablocks.com/pages/device-ids
    data: function to call which will return parsed date when given ((json object)thermostatData) as arguments
    canSet: boolean - set to true if device is writable
    setStg: a function to call if device is writable upon write which will return a string of the command to execute, given ((string)ipAddr, (string)data), (json object)lastData as arguments
	
	example retuned data: {"temp":65.50,"tmode":1,"fmode":0,"override":0,"hold":0,"t_heat":68.00,"tstate":1,"fstate":1,"time":{"day":1,"hour":10,"minute":9},"t_type_post":0}
*/
