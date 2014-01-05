module.exports = [
    {
        name: 'Thermostat Current Temperature',
        deviceId: 9,
        data: [function(thermostatData) {
			return thermostatData.temp;
        }],
		canSet: false,
    },
    {
        name: 'Thermostat Target Temperature',
        deviceId: 9,
        data: [function(thermostatData) {
			var tTemp = thermostatData.t_cool;
			if (!tTemp) tTemp = thermostatData.t_heat;
			return tTemp;
        }],
		canSet: true,
		setStg: [function(ipAddr, val) { // example:   curl -d '{"t_cool":67,"t_heat":67}' http://1.1.1.1/tstat
			if (isNaN(val)) return ""; else return "curl -d '{\"t_cool\":" + val + ",\"t_heat\":" + val + "}' http://" + ipAddr + "/tstat";	// setStg just returns the string we want to execute
        }],
    },
    {
        name: 'Thermostat Operating Mode',		// current thermostat operating mode ("tmode") - will be one of: 0: OFF, 1: HEAT, 2: COOL, 3: AUTO
        deviceId: 244,
        data: [function(thermostatData) {
			var opModes = ["Thermostat Mode Off","Thermostat Heat Mode","Thermostat Cool Mode","Thermostat Auto Mode"];
			return opModes[thermostatData.tmode] || "Thermostat Mode Unknown";
        }],
		canSet: true,
		setStg: [function(ipAddr, mode) { // example:   curl -d '{"tmode":1}' http://1.1.1.1/tstat  (turns to heat mode)
			var modNum = {"Thermostat Mode Off":0,"Thermostat Heat Mode":1,"Thermostat Cool Mode":2,"Thermostat Auto Mode":3};
			if (modNum[mode]) return "curl -d '{\"tmode\":" + modNum[mode] + "}' http://" + ipAddr + "/tstat"; else return "";
        }],
    },
    {
        name: 'Thermostat Fan Operating Mode',		// show current thermostat fan operating mode ("fmode") - will be one of: 0: AUTO, 1: AUTO/CIRCULATE, 2: ON
        deviceId: 244,
        data: [function(thermostatData) {
			var fanOpModes = ["Thermostat Fan Auto Mode","Thermostat Fan Auto/Circulate Mode","Thermostat Fan Mode On"];
			return fanOpModes[thermostatData.fmode] || "Thermostat Fan Mode Unknown";
        }],
		canSet: true,
		setStg: [function(ipAddr, mode) { // example:   curl -d '{"tmode":1}' http://1.1.1.1/tstat  (turns to heat mode)
			var modNum = {"Thermostat Fan Auto Mode":0,"Thermostat Fan Auto/Circulate Mode":1,"Thermostat Fan Mode On":2};
			if (modNum[mode]) return "curl -d '{\"tmode\":" + modNum[mode] + "}' http://" + ipAddr + "/tstat"; else return "";
        }],
    },	
    {
        name: 'Thermostat Time',		// output a string of the thermostat time ("time":{"day":0,"hour":0,"minute":0}}) - day 0 = Monday
        deviceId: 3680,
        data: [function(thermostatData) {
			var daysWeek = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday', 'Sunday'];
			var weekDay = daysWeek[thermostatData.time.day];
			var paddedMin = (thermostatData.time.minute < 10) ? ("0" + thermostatData.time.minute) : thermostatData.time.minute;
			return weekDay + ", " + thermostatData.time.hour + ":" + paddedMin; // for example, "Wednesday, 13:34"
        }],
		canSet: false,
    },  
];

