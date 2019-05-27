'use strict';

const inherits = require('util').inherits;
const NestDeviceAccessory = require('./nest-device-accessory')();

const debounce = require('lodash.debounce');
const Promise = require('bluebird');

/* eslint-disable no-unused-vars */
var Accessory;
var Service;
var Characteristic;
var uuid;
/* eslint-enable no-unused-vars */

function celsiusToFahrenheit(temperature) {
  return (temperature * 1.8) + 32;
}

function fahrenheitToCelsius(temperature) {
  return (temperature - 32) / 1.8;
}

module.exports = function (exportedTypes) {
  if (exportedTypes && !Accessory) {
    Accessory = exportedTypes.Accessory;
    Service = exportedTypes.Service;
    Characteristic = exportedTypes.Characteristic;
    uuid = exportedTypes.uuid;

    var accessory = NestThermostatAccessory.prototype;
    inherits(NestThermostatAccessory, NestDeviceAccessory);
    NestThermostatAccessory.prototype.parent = NestDeviceAccessory.prototype;
    for (var item in accessory) {
      if (NestThermostatAccessory.prototype.hasOwnProperty.call(accessory, item)) {
        NestThermostatAccessory.prototype[item] = accessory[item];
      }
    }

    NestThermostatAccessory.deviceGroup = 'thermostats';
    NestThermostatAccessory.deviceType = 'thermostat';
    NestThermostatAccessory.model = 'Thermostat';
    NestThermostatAccessory.prototype.deviceGroup = NestThermostatAccessory.deviceGroup;
    NestThermostatAccessory.prototype.deviceType = NestThermostatAccessory.deviceType;
    NestThermostatAccessory.prototype.model = NestThermostatAccessory.model;
  }
  return NestThermostatAccessory;
};

function NestThermostatAccessory(connection, log, device, structure, platform) {
  NestDeviceAccessory.call(this, connection, log, device, structure, platform);

  const thermostatService = this.addService(Service.Thermostat)
    .setCharacteristic(Characteristic.Name, this.device.name + ' Thermostat');

  this.bindCharacteristic(
    thermostatService,
    Characteristic.CurrentHeatingCoolingState,
    'Current heating/cooling state',
    this.getCurrentHeatingCoolingState,
    null,
    this.formatCurrentHeatingCoolingState
  );

  this.bindCharacteristic(
    thermostatService,
    Characteristic.TargetHeatingCoolingState,
    'Target heating cooling state',
    this.getTargetHeatingCoolingState,
    this.setTargetHeatingCoolingState,
    this.formatTargetHeatingCoolingState
  );

  this.bindCharacteristic(
    thermostatService,
    Characteristic.CurrentTemperature,
    'Current temperature',
    this.getCurrentTemperature,
    null,
    this.formatTemperature
  );

  this.bindCharacteristic(
    thermostatService,
    Characteristic.TargetTemperature,
    'Target temperature',
    this.getTargetTemperature,
    this.setTargetTemperature,
    this.formatTemperature
  );

  this.bindCharacteristic(
    thermostatService,
    Characteristic.TemperatureDisplayUnits,
    'Temperature units',
    this.getTemperatureDisplayUnits,
    this.setTemperatureDisplayUnits,
    function (value) {
      return value === Characteristic.TemperatureDisplayUnits.FAHRENHEIT ? 'Fahrenheit' : 'Celsius';
    }
  );

  this.bindCharacteristic(
    thermostatService,
    Characteristic.CurrentRelativeHumidity,
    'Current humidity',
    this.getCurrentRelativeHumidity,
    null,
    function (value) {
      return value + '%';
    }
  );

  this.bindCharacteristic(
    thermostatService,
    Characteristic.CoolingThresholdTemperature,
    'Cooling threshold temperature',
    this.getCoolingThresholdTemperature,
    this.setCoolingThresholdTemperature,
    this.formatTemperature
  );

  this.bindCharacteristic(
    thermostatService,
    Characteristic.HeatingThresholdTemperature,
    'Heating threshold temperature',
    this.getHeatingThresholdTemperature,
    this.setHeatingThresholdTemperature,
    this.formatTemperature
  );

  if (this.device.has_fan) {
    const thermostatFanService = this.addService(Service.Fan);
    const formatFanState = function (val) {
      if (val) {
        return "On";
      }
      return "Off";
    };
    this.bindCharacteristic(thermostatFanService, Characteristic.On, "Fan State", this.getFanState, this.setFanState, formatFanState);
  }

  const homeService = this.addService(Service.Switch, "Home Occupied", "home_occupied");
  this.bindCharacteristic(homeService, Characteristic.On, "Home Occupied", this.getHome, this.setHome);

  const thermostatEcoModeService = this.addService(Service.Switch, "Eco Mode", "eco_mode");
  this.bindCharacteristic(thermostatEcoModeService, Characteristic.On, "Eco Mode", this.getEcoMode, this.setEcoMode);

  // Add custom characteristics

  this.addAwayCharacteristic(thermostatService); // legacy: now exposed as a Switch
  this.addEcoModeCharacteristic(thermostatService); // legacy: now exposed as a Switch

  if (this.device.has_fan === true) { // legacy: now exposed as a Fan
    this.addFanTimerActiveCharacteristic(thermostatService);
    this.addFanTimerDurationCharacteristic(thermostatService);
  }

  this.addHasLeafCharacteristic(thermostatService);

  this.addSunlightCorrectionEnabledCharacteristic(thermostatService);

  this.addSunlightCorrectionActiveCharacteristic(thermostatService);

  this.addUsingEmergencyHeatCharacteristic(thermostatService);

  this.updateData();
}

NestThermostatAccessory.prototype.formatCurrentHeatingCoolingState = function (value) {
  switch (value) {
    case Characteristic.CurrentHeatingCoolingState.OFF:
      return 'Off';
    case Characteristic.CurrentHeatingCoolingState.HEAT:
      return 'Heating';
    case Characteristic.CurrentHeatingCoolingState.COOL:
      return 'Cooling';
    default:
      return 'Unknown';
  }
};

NestThermostatAccessory.prototype.formatTargetHeatingCoolingState = function (value) {
  switch (value) {
    case Characteristic.TargetHeatingCoolingState.OFF:
      return 'Off';
    case Characteristic.TargetHeatingCoolingState.HEAT:
      return 'Heat';
    case Characteristic.TargetHeatingCoolingState.COOL:
      return 'Cool';
    case Characteristic.TargetHeatingCoolingState.AUTO:
      return 'Auto';
    default:
      return 'Unknown';
  }
};

NestThermostatAccessory.prototype.formatTemperature = function (temperature) {
  return (Math.round(temperature * 2) / 2) + '°C and ' + Math.round(celsiusToFahrenheit(temperature)) + '°F';
};

NestThermostatAccessory.prototype.getCoolingThresholdTemperature = function () {
  switch (this.device.hvac_mode) {
    case 'heat-cool':
      if (this.device.temperature_scale === 'F') {
        return fahrenheitToCelsius(this.device.target_temperature_high_f);
      }
      return this.device.target_temperature_high_c;
    case 'eco':
      if (this.device.temperature_scale === 'F') {
        return fahrenheitToCelsius(this.device.eco_temperature_high_f);
      }
      return this.device.eco_temperature_high_c;
    default:
      this.log.debug('Mode is set to ' + this.device.hvac_mode + ', unable to get cooling threshold temperature');
      return 10;
  }
};

NestThermostatAccessory.prototype.getCurrentHeatingCoolingState = function () {
  switch (this.device.hvac_state) {
    case 'off':
      return Characteristic.CurrentHeatingCoolingState.OFF;
    case 'heating':
      return Characteristic.CurrentHeatingCoolingState.HEAT;
    case 'cooling':
      return Characteristic.CurrentHeatingCoolingState.COOL;
    default:
      return Characteristic.CurrentHeatingCoolingState.OFF;
  }
};

NestThermostatAccessory.prototype.getCurrentRelativeHumidity = function () {
  return this.device.humidity;
};

NestThermostatAccessory.prototype.getCurrentTemperature = function () {
  if (this.device.temperature_scale === 'F') {
    return fahrenheitToCelsius(this.device.ambient_temperature_f);
  }
  return this.device.ambient_temperature_c;
};

NestThermostatAccessory.prototype.getHeatingThresholdTemperature = function () {
  switch (this.device.hvac_mode) {
    case 'heat-cool':
      if (this.device.temperature_scale === 'F') {
        return fahrenheitToCelsius(this.device.target_temperature_low_f);
      }
      return this.device.target_temperature_low_c;
    case 'eco':
      if (this.device.temperature_scale === 'F') {
        return fahrenheitToCelsius(this.device.eco_temperature_low_f);
      }
      return this.device.eco_temperature_low_c;
    default:
      this.log.debug('Mode is set to ' + this.device.hvac_mode + ', unable to get heating threshold temperature');
      return 0;
  }
};

NestThermostatAccessory.prototype.getTargetHeatingCoolingState = function () {
  switch (this.device.hvac_mode) {
    case 'heat':
      return Characteristic.TargetHeatingCoolingState.HEAT;
    case 'cool':
      return Characteristic.TargetHeatingCoolingState.COOL;
    case 'eco':
    case 'heat-cool':
      return Characteristic.TargetHeatingCoolingState.AUTO;
    case 'off':
    default:
      return Characteristic.TargetHeatingCoolingState.OFF;
  }
};

NestThermostatAccessory.prototype.getTargetTemperature = function () {
  switch (this.device.hvac_mode) {
    case 'eco':
    case 'heat-cool':
      this.log.debug('Mode is set to ' + this.device.hvac_mode + ', unable to get target temperature');
      return 10;
    default:
      if (this.device.temperature_scale === 'F') {
        return fahrenheitToCelsius(this.device.target_temperature_f);
      }
      return this.device.target_temperature_c;
  }
};

NestThermostatAccessory.prototype.getTemperatureDisplayUnits = function () {
  switch (this.device.temperature_scale) {
    case 'F':
      return Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
    case 'C':
    default:
      return Characteristic.TemperatureDisplayUnits.CELSIUS;
  }
};

NestThermostatAccessory.prototype.setCoolingThresholdTemperature = function (temperature, callback) {
  var targetTemperature = (Math.round(temperature * 2) / 2);
  var units = '°C';
  if (this.device.temperature_scale === 'F') {
    targetTemperature = Math.round(celsiusToFahrenheit(temperature));
    units = '°F';
  }
  this.log('Trying to set cooling threshold temperature to ' + targetTemperature + units);
  this.setCoolingThresholdTemperatureDebounced(targetTemperature, function () {
    this.log('Cooling threshold temperature set to ' + targetTemperature + units);
  }.bind(this));
  return Promise.resolve().asCallback(callback);
};

/* eslint-disable consistent-return */
NestThermostatAccessory.prototype.setCoolingThresholdTemperatureDebounced = debounce(function (temperature, callback) {
  const target = this.device.temperature_scale === 'F' ? 'target_temperature_high_f' : 'target_temperature_high_c';
  switch (this.device.hvac_mode) {
    case 'heat-cool':
      return Promise.resolve()
        .then(this.updateDevicePropertyAsync.bind(this, target, temperature, 'cooling threshold temperature'))
        .asCallback(callback);
    default:
      this.log.debug('Mode is set to ' + this.device.hvac_mode + ', unable to set cooling threshold temperature');
      break;
  }
}, 5000);
/* eslint-enable consistent-return */

NestThermostatAccessory.prototype.setHeatingThresholdTemperature = function (temperature, callback) {
  var targetTemperature = (Math.round(temperature * 2) / 2);
  var units = '°C';
  if (this.device.temperature_scale === 'F') {
    targetTemperature = Math.round(celsiusToFahrenheit(temperature));
    units = '°F';
  }
  this.log('Trying to set heating threshold temperature to ' + targetTemperature + units);
  this.setHeatingThresholdTemperatureDebounced(targetTemperature, function () {
    this.log('Heating threshold temperature set to ' + targetTemperature + units);
  }.bind(this));
  return Promise.resolve().asCallback(callback);
};

/* eslint-disable consistent-return */
NestThermostatAccessory.prototype.setHeatingThresholdTemperatureDebounced = debounce(function (temperature, callback) {
  const target = this.device.temperature_scale === 'F' ? 'target_temperature_low_f' : 'target_temperature_low_c';
  switch (this.device.hvac_mode) {
    case 'heat-cool':
      return Promise.resolve()
        .then(this.updateDevicePropertyAsync.bind(this, target, temperature, 'heating threshold temperature'))
        .asCallback(callback);
    default:
      this.log.debug('Mode is set to ' + this.device.hvac_mode + ', unable to set heating threshold temperature');
      break;
  }
}, 5000);
/* eslint-enable consistent-return */

NestThermostatAccessory.prototype.setTargetHeatingCoolingState = function (value, callback) {
  var state = null;
  switch (value) {
    case Characteristic.TargetHeatingCoolingState.HEAT:
      if (this.device.can_heat === true) {
        state = 'heat';
      } else {
        this.log('Device does not support heating, cannot set mode to heat');
        return undefined;
      }
      break;
    case Characteristic.TargetHeatingCoolingState.COOL:
      if (this.device.can_cool === true) {
        state = 'cool';
      } else {
        this.log('Device does not support cooling, cannot set mode to cool');
        return undefined;
      }
      break;
    case Characteristic.TargetHeatingCoolingState.AUTO:
      if (this.device.can_heat === true && this.device.can_cool === true) {
        state = 'heat-cool';
      } else {
        this.log('Device does not support heating or cooling, cannot set mode to auto');
        return undefined;
      }
      break;
    case Characteristic.TargetHeatingCoolingState.OFF:
    default:
      state = 'off';
      break;
  }
  this.log('Setting target heating cooling state to ' + state);
  return this.updateDevicePropertyAsync('hvac_mode', state, 'target heating cooling')
    .asCallback(callback);
};

NestThermostatAccessory.prototype.setTargetTemperature = function (temperature, callback) {
  var targetTemperature = (Math.round(temperature * 2) / 2);
  var units = '°C';
  if (this.device.temperature_scale === 'F') {
    targetTemperature = Math.round(celsiusToFahrenheit(temperature));
    units = '°F';
  }
  this.log('Trying to set target temperature to ' + targetTemperature + units);
  this.setTargetTemperatureDebounced(targetTemperature, function () {
    this.log('Target temperature set to ' + targetTemperature + units);
  }.bind(this));
  return Promise.resolve().asCallback(callback);
};

/* eslint-disable consistent-return */
NestThermostatAccessory.prototype.setTargetTemperatureDebounced = debounce(function (temperature, callback) {
  const target = this.device.temperature_scale === 'F' ? 'target_temperature_f' : 'target_temperature_c';
  switch (this.device.hvac_mode) {
    case 'eco':
    case 'heat-cool':
    case 'off':
      this.log.debug('Mode is set to ' + this.device.hvac_mode + ', unable to set target temperature');
      break;
    default:
      return Promise.resolve()
        .then(this.updateDevicePropertyAsync.bind(this, target, temperature, 'target temperature'))
        .asCallback(callback);
  }
}, 5000);
/* eslint-enable consistent-return */

NestThermostatAccessory.prototype.setTemperatureDisplayUnits = function (value, callback) {
  var units = null;
  switch (value) {
    case Characteristic.TemperatureDisplayUnits.FAHRENHEIT:
      units = 'F';
      break;
    case Characteristic.TemperatureDisplayUnits.CELSIUS:
    default:
      units = 'C';
      break;
  }
  return this.updateDevicePropertyAsync('temperature_scale', units, 'temperature display units')
    .asCallback(callback);
};

NestThermostatAccessory.prototype.getFanState = function () {
  return this.device.fan_timer_active;
};

NestThermostatAccessory.prototype.setFanState = function (targetFanState, callback) {
  this.log("Setting target fan state for " + this.name + " to: " + targetFanState);

  this.updateDevicePropertyAsync("fan_timer_active", Boolean(targetFanState), "fan enable/disable")
    .asCallback(function () {
      setTimeout(callback, 3000, ...arguments); // fan seems to "flicker" when you first enable it
    });
};

NestThermostatAccessory.prototype.getHome = function () {
  switch (this.structure.away) {
  case "home":
    return true;
  case "away":
  default:
    return false;
  }
};

NestDeviceAccessory.prototype.setHome = function (home, callback) {
  const val = !home ? 'away' : 'home';
  this.log.info("Setting Home for " + this.name + " to: " + val);
  const promise = this.connection.update(this.getStructurePropertyPath("away"), val);
  return promise
    .return(home)
    .asCallback(callback);
};

NestThermostatAccessory.prototype.getEcoMode = function () {
  return (this.device.hvac_mode === "eco");
};

NestThermostatAccessory.prototype.setEcoMode = function (eco, callback) {
  const val = eco ? 'eco' : this.device.previous_hvac_mode;
  this.log.info("Setting Eco Mode for " + this.name + " to: " + val);
  return this.updateDevicePropertyAsync("hvac_mode", val, "target heating cooling")
    .asCallback(callback);
};
