var configMessages = require('./config-messages');

/**
 * Called from the driver's config method when a
 * user wants to see a menu to configure the driver
 * @param  {Function} cb Callback to send a response back to the user
 */
exports.menu = function(cb) {
	cb(null,configMessages.menu);
};

/**
 * Called when a user clicks the 'Submit'
 * button we sent in the menu request
 * @param  {Object}   params Parameter object
 * @param  {Function} cb     Callback to send back to the user
 */
exports.submt = function(params,cb) {
	var payloadToSend = configMessages.submt;
	
	// check for errors
	var rgx = new RegExp("^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"); // Test ip_addr_text to match this regex - simple ip address checking does not check nodes for > 255, but should suffice for now...
	if (!rgx.test(params.ip_addr_text)) {
		payloadToSend.contents = [
			{ "type": "paragraph", "text": "IP address was invalid - please use standard ipv4 address, such as: 123.45.6.789. Please try again." },
			{ "type": "close"    , "name": "Close" }
		];
		cb(null,payloadToSend);
	}
	else if (!(params.update_int_secs_text >= 0)) {	// update_int_secs_text must evaluate to a positive number 
		payloadToSend.contents = [
			{ "type": "paragraph", "text": "the 'update interval' must be a number and can't be negative. Please try again." },
			{ "type": "close"    , "name": "Close" }
		];
		cb(null,payloadToSend);
	}
	else if (!(params.pause_bt_cmds_secs_text >= 0)) {	// pause_bt_cmds_secs_text must evaluate to a positive number 
		payloadToSend.contents = [
			{ "type": "paragraph", "text": "The 'pause between commands' interval must be a number and can't be negative. Please try again." },
			{ "type": "close"    , "name": "Close" }
		];
		cb(null,payloadToSend);
	}	
	else if (!(params.pause_aft_updt_secs_text >= 0)) {	// pause_aft_updt_secs_text must evaluate to a positive number 
		payloadToSend.contents = [
			{ "type": "paragraph", "text": "The 'pause after update' interval must be a number and can't be negative. Please try again." },
			{ "type": "close"    , "name": "Close" }
		];
		cb(null,payloadToSend);
	}
	else {	// looks like the submitted values were valid, so update
		payloadToSend.contents = [
			{ "type": "paragraph", "text": "Configuration was successful. (TODO: actually update!) radioThermostatDriver values should update shortly!" },
			{ "type": "close"    , "name": "Close" }
		];
		
		// ***TODO: update settings			
		cb(null,payloadToSend);
	};
};

