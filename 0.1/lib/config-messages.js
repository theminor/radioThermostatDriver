exports.menu = {
	"contents":[
		{ "type": "paragraph", "text": "The radioThermostatDriver allows you to monitor and control WiFi Thermostats such as the ones from radiothermostat.com. Enter the settings below to get started, and please make sure you get a confirmation message after hitting 'Submit' below. (You may have to click it a couple of times. If you don't get a confirmation message, the settings did not update!)"},
		{ "type": "input_field_text", "field_name": "ip_addr_text", "value": "", "label": "IP Address of Your Thermostat", "placeholder": "192.168.1.135", "required": true},
		{ "type": "input_field_text", "field_name": "update_int_secs_text", "value": "", "label": "Update Interval in Seconds", "placeholder": "600", "required": true},
		{ "type": "input_field_text", "field_name": "pause_bt_cmds_secs_text", "value": "", "label": "Seconds to Pause Between Thermostat Commands", "placeholder": "5", "required": true},
		{ "type": "input_field_text", "field_name": "pause_aft_updt_secs_text", "value": "", "label": "Seconds to Pause After a Command Before Updating", "placeholder": "10", "required": true},
		{ "type": "paragraph", "text": " "},
		{ "type": "submit", "name": "Submit", "rpc_method": "submt" },
		{ "type": "close", "name": "Cancel" },
	]
};

exports.submt = {
	"contents":[
		{ "type": "paragraph", "text": "There was an Error Submitting..."},
	]
};

