radioThermostatDriver
=====================

This driver interfaces with Radio Thermostats such as those from radiothermostat.com and similar wifi-based home thermostats

Example Widget for the beta ninja blocks dashboard can be found here:
https://gist.github.com/theminor/8214114

To get the thermostat modes working, you need to add a "state" for each possible operating mode in each "device" created. To do this, after installing the driver, log into your "classic" dashboard (that is, not the beta dashboard) and first find the "radioThermostatDriver - Thermostat Operating Mode" device. Click the little configure menu and "Add New State". Do this to add these states:

Thermostat Mode Off
Thermostat Heat Mode
Thermostat Cool Mode
Thermostat Auto Mode
Thermostat Mode Unknown

Next, add these states to the "radioThermostatDriver - Thermostat Fan Operating Mode" device:

Thermostat Fan Auto Mode
Thermostat Fan Mode On
Thermostat Fan Auto/Circ
Thermostat Fan Unknown

And for "radioThermostatDriver - Thermostat Hold Mode", add:

Thermostat Hold Disabled
Thermostat Hold Enabled
Thermostat Hold Unknown
