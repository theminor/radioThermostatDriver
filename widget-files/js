var tempValElement = element.find(".currentTempValue");
var tempSetElement = element.find(".setTempValue");
var opModeElement = element.find(".opMode");
var fanModeElement = element.find(".fanMode");
var thermTimeElement = element.find(".thermTime");
var setTempInputElement = element.find(".setTempInput");
var setTempBtnElement = element.find(".setTempBtn");
var prgDataElement = element.find(".prgData");

// set temperature button click
setTempBtnElement.on("click", function() {
  // the _.each statement below parses all devices in this widget
  // instead, we could just have var device = scope.GetNinjaDevice(device) for a single device
  var setNum = Number(setTempInputElement[0].value);
  if (setNum) {
    _.each(scope.Widget.devices, function(d) {
      var device = scope.GetNinjaDevice(d);
      device.Emit('{"resourceLocation":"/tstat", "resourceData":{"t_heat":' + setNum + '}}');
    });
    setTempInputElement[0].value = setNum + " (Submitted...)";
  } else {
    setTempInputElement[0].value = "Invalid Number";
  }
});

scope.onData = function(data) {
  var thermostatData = eval ("(" + data.DA + ")");
  
  // show curent temperature ("temp")
  tempValElement.html("Current Temp: " + thermostatData.tempData.temp + "&deg;");

  // show operating mode ("tmode") - will be one of: 0: OFF, 1: HEAT, 2: COOL, 3: AUTO
  var operMode = "Unknown";
  switch (thermostatData.tempData.tmode) {
    case 0:
      operMode="Off";
      break;
    case 1:
      operMode="Heat";
      break;
    case 2:
      operMode="Cool";
      break;
    case 3:
      operMode="Auto";
      break;
  }
  opModeElement.html("Operating Mode: " + operMode);
  
  // show target temperature (either "t_cool" or "t_heat")
  var tTemp = thermostatData.tempData.t_cool;
  if (!tTemp) tTemp = thermostatData.tempData.t_heat;
  if (!tTemp) tTemp = "Unknown";
  tempSetElement.html("Target Temp: " + tTemp + "&deg;");

  // show fan operating mode ("fmode") - will be one of: 0: AUTO, 1: AUTO/CIRCULATE, 2: ON 
  var fanOpMode = "Unknown";
  switch (thermostatData.tempData.fmode) {
    case 0:
      fanOpMode="Auto";
      break;
    case 1:
      fanOpMode="Auto/Circulate";
      break;
    case 2:
      fanOpMode="On";
      break;
  }
  fanModeElement.html("Fan Mode: " + fanOpMode);

  // show thermostat time ("time":{"day":0,"hour":0,"minute":0}}) - day 0 = Monday
  var daysWeek = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday', 'Sunday'];
  var weekDay = daysWeek[thermostatData.tempData.time.day];
  var paddedMin = (thermostatData.tempData.time.minute < 10) ? ("0" + thermostatData.tempData.time.minute) : thermostatData.tempData.time.minute;
  thermTimeElement.html(weekDay + ", " + thermostatData.tempData.time.hour + ":" + paddedMin);

  // program Data
  var heatPrgData = JSON.stringify(thermostatData.heatProgData);
  var coolPrgData = JSON.stringify(thermostatData.coolProgData)
  prgDataElement.html("<p> Heating Program Data: " + heatPrgData + "</p><p>Cooling Program Data: " + coolPrgData + "</p>");

  
}
