var inherits = require('util').inherits;
var NestDeviceAccessory = require('./nest-device-accessory')();
var debounce = require('lodash.debounce');
var Promise = require('bluebird');
var Accessory, Service, Characteristic, uuid;

'use strict';

module.exports = function(exportedTypes) {
  if (exportedTypes && !Accessory) {
    Accessory = exportedTypes.Accessory;
    Service = exportedTypes.Service;
    Characteristic = exportedTypes.Characteristic;
    uuid = exportedTypes.uuid;

    var accessory = NestThermostatAccessory.prototype;
    inherits(NestThermostatAccessory, NestDeviceAccessory);
    NestThermostatAccessory.prototype.parent = NestDeviceAccessory.prototype;
    for (var item in accessory) {
      NestThermostatAccessory.prototype[item] = accessory[item];
    }

    NestThermostatAccessory.deviceType = "thermostat";
    NestThermostatAccessory.deviceGroup = "thermostats";
    NestThermostatAccessory.prototype.deviceType = NestThermostatAccessory.deviceType;
    NestThermostatAccessory.prototype.deviceGroup = NestThermostatAccessory.deviceGroup;
  }
  return NestThermostatAccessory;
};

function fahrenheitToCelsius(temperature) {
  return (temperature - 32) / 1.8;
}

function celsiusToFahrenheit(temperature) {
  return (temperature * 1.8) + 32;
}

function NestThermostatAccessory(connection, log, device, structure) {

  NestDeviceAccessory.call(this, connection, log, device, structure);

  var thermostatService = this.addService(Service.Thermostat)
    .setCharacteristic(Characteristic.Name, this.device.name + " " + "Thermostat");

  this.bindCharacteristic(
    thermostatService,
    Characteristic.CurrentHeatingCoolingState,
    "Current heating/cooling state",
    this.getCurrentHeatingCoolingState,
    null,
    this.formatCurrentHeatingCoolingState
  );

  this.bindCharacteristic(
    thermostatService,
    Characteristic.TargetHeatingCoolingState,
    "Target heating cooling state",
    this.getTargetHeatingCoolingState,
    this.setTargetHeatingCoolingState,
    this.formatTargetHeatingCoolingState
  );

  this.bindCharacteristic(
    thermostatService,
    Characteristic.CurrentTemperature,
    "Current temperature",
    this.getCurrentTemperature,
    null,
    this.formatTemperature
  );

  this.bindCharacteristic(
    thermostatService,
    Characteristic.TargetTemperature,
    "Target temperature",
    this.getTargetTemperature,
    this.setTargetTemperature,
    this.formatTemperature
  );

  this.bindCharacteristic(
    thermostatService,
    Characteristic.TemperatureDisplayUnits,
    "Temperature units",
    this.getTemperatureDisplayUnits,
    this.setTemperatureDisplayUnits,
    function (value) {
      return value == Characteristic.TemperatureDisplayUnits.FAHRENHEIT ? "Fahrenheit" : "Celsius";
    }
  );

  this.bindCharacteristic(
    thermostatService,
    Characteristic.CurrentRelativeHumidity,
    "Current humidity",
    this.getCurrentRelativeHumidity,
    null,
    function(value) {
      return value + "%";
    }
  );

  this.bindCharacteristic(
    thermostatService,
    Characteristic.CoolingThresholdTemperature,
    "Cooling threshold temperature",
    this.getCoolingThresholdTemperature,
    this.setCoolingThresholdTemperature,
    this.formatTemperature
  );

  this.bindCharacteristic(
    thermostatService,
    Characteristic.HeatingThresholdTemperature,
    "Heating threshold temperature",
    this.getHeatingThresholdTemperature,
    this.setHeatingThresholdTemperature,
    this.formatTemperature
  );

  thermostatService
    .getCharacteristic(Characteristic.CurrentTemperature)
    .setProps({
      minStep: 0.5
    });

  thermostatService
    .getCharacteristic(Characteristic.TargetTemperature)
    .setProps({
      minStep: 0.5
    });

  thermostatService
    .getCharacteristic(Characteristic.CoolingThresholdTemperature)
    .setProps({
      minStep: 0.5
    });

  thermostatService
    .getCharacteristic(Characteristic.HeatingThresholdTemperature)
    .setProps({
      minStep: 0.5
    });

  this.updateData();
}

NestThermostatAccessory.prototype.getCurrentHeatingCoolingState = function() {
  switch (this.device.hvac_state) {
    case "off":
      return Characteristic.CurrentHeatingCoolingState.OFF;
    case "heating":
      return Characteristic.CurrentHeatingCoolingState.HEAT;
    case "cooling":
      return Characteristic.CurrentHeatingCoolingState.COOL;
    default:
      return Characteristic.CurrentHeatingCoolingState.OFF;
  }
};

NestThermostatAccessory.prototype.formatCurrentHeatingCoolingState = function(value) {
  switch (value) {
    case Characteristic.CurrentHeatingCoolingState.OFF:
      return "Off";
    case Characteristic.CurrentHeatingCoolingState.HEAT:
      return "Heating";
    case Characteristic.CurrentHeatingCoolingState.COOL:
      return "Cooling";
  }
};

NestThermostatAccessory.prototype.getTargetHeatingCoolingState = function() {
  switch (this.device.hvac_mode) {
    case "off":
      return Characteristic.TargetHeatingCoolingState.OFF;
    case "heat":
      return Characteristic.TargetHeatingCoolingState.HEAT;
    case "cool":
      return Characteristic.TargetHeatingCoolingState.COOL;
    case "heat-cool":
      return Characteristic.TargetHeatingCoolingState.AUTO;
    case "eco":
      return Characteristic.TargetHeatingCoolingState.AUTO;
    default:
      return Characteristic.TargetHeatingCoolingState.OFF;
  }
};

NestThermostatAccessory.prototype.setTargetHeatingCoolingState = function(value, callback) {
  var state = null;
  switch (value) {
    case Characteristic.TargetHeatingCoolingState.OFF:
      state = "heat";
      break;
    case Characteristic.TargetHeatingCoolingState.HEAT:
      if (this.device.can_heat === true) {
        state = "heat";
        break;
      } else {
        return;
      }
    case Characteristic.TargetHeatingCoolingState.COOL:
      if (this.device.can_cool === true) {
        state = "cool";
        break;
      } else {
        return;
      }
    case Characteristic.TargetHeatingCoolingState.AUTO:
      if (this.device.can_heat === true && this.device.can_cool === true) {
        state = "heat-cool";
        break;
      } else {
        return;
      }
    default:
      state = "off";
      break;
  }
  this.log("Setting target heating cooling state to " + state);
  return this.updateDevicePropertyAsync("hvac_mode", state, "target heating cooling")
    .asCallback(callback);
};

NestThermostatAccessory.prototype.formatTargetHeatingCoolingState = function(value) {
  switch (value) {
    case Characteristic.TargetHeatingCoolingState.OFF:
      return "Off";
    case Characteristic.TargetHeatingCoolingState.HEAT:
      return "Heat";
    case Characteristic.TargetHeatingCoolingState.COOL:
      return "Cool";
    case Characteristic.TargetHeatingCoolingState.AUTO:
      return "Auto";
  }
};

NestThermostatAccessory.prototype.getCurrentTemperature = function() {
  return this.device.ambient_temperature_c;
};

NestThermostatAccessory.prototype.getTargetTemperature = function() {
  switch (this.device.hvac_mode) {
    case "heat-cool":
      return 10;
    case "eco":
      return 10;
    default:
      return this.device.target_temperature_c;
  }
};

NestThermostatAccessory.prototype.setTargetTemperature = function(temperature, callback) {
  this.log("Trying to set temperature " + temperature);
  this.setTargetTemperatureDebounced(temperature, function() {
    this.log("Temperature set to " + temperature);
  }.bind(this));
  return Promise.resolve().asCallback(callback);
};

NestThermostatAccessory.prototype.formatTemperature = function(temperature) {
  return temperature + " °C and " + celsiusToFahrenheit(temperature) + " °F";
};

NestThermostatAccessory.prototype.getTemperatureDisplayUnits = function() {
  switch (this.device.temperature_scale) {
    case "C":
      return Characteristic.TemperatureDisplayUnits.CELSIUS;
    case "F":
      return Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
    default:
      return Characteristic.TemperatureDisplayUnits.CELSIUS;
  }
};

NestThermostatAccessory.prototype.setTemperatureDisplayUnits = function(value, callback) {
  var units = null;
  switch (value) {
    case Characteristic.TemperatureDisplayUnits.CELSIUS:
      units = "C";
      break;
    case Characteristic.TemperatureDisplayUnits.FAHRENHEIT:
      units = "F";
      break;
    default:
      units = "C";
      break;
  }
  this.log("Setting temperature display units to °" + units);
  return this.updateDevicePropertyAsync("temperature_scale", units, "temperature display units")
    .asCallback(callback);
};

NestThermostatAccessory.prototype.getCurrentRelativeHumidity = function() {
  return this.device.humidity;
};

NestThermostatAccessory.prototype.getCoolingThresholdTemperature = function() {
  switch (this.device.hvac_mode) {
    case "heat-cool":
      return this.device.target_temperature_high_c;
    case "eco":
      return this.device.eco_temperature_high_c;
    default:
      return 10;
  }
};

NestThermostatAccessory.prototype.setCoolingThresholdTemperature = function(temperature, callback) {
  this.log("Trying to set cooling threshold temperature " + temperature);
  this.setCoolingThresholdTemperatureDebounced(temperature, function() {
    this.log("Cooling threshold temperature set to " + temperature);
  }.bind(this));
  return Promise.resolve().asCallback(callback);
};

NestThermostatAccessory.prototype.getHeatingThresholdTemperature = function() {
  switch (this.device.hvac_mode) {
    case "heat-cool":
      return this.device.target_temperature_low_c;
    case "eco":
      return this.device.eco_temperature_low_c;
    default:
      return 0;
  }
};

NestThermostatAccessory.prototype.setHeatingThresholdTemperature = function(temperature, callback) {
  this.log("Trying to set heating threshold temperature " + temperature);
  this.setHeatingThresholdTemperatureDebounced(targetTemperature, function() {
    this.log("Heating threshold temperature set to " + temperature);
  }.bind(this));
  return Promise.resolve().asCallback(callback);
};

NestThermostatAccessory.prototype.setTargetTemperatureDebounced = debounce(function (temperature, callback) {
  switch (this.device.hvac_mode) {
    case "heat-cool":
      return;
    case "eco":
      return;
    default:
      return Promise.resolve()
        .then(this.updateDevicePropertyAsync.bind(this, "target_temperature_c", temperature, "target temperature"))
        .asCallback(callback);
  }
}, 5000);

NestThermostatAccessory.prototype.setCoolingThresholdTemperatureDebounced = debounce(function (temperature, callback) {
  switch (this.device.hvac_mode) {
    case "heat-cool":
      return Promise.resolve()
        .then(this.updateDevicePropertyAsync.bind(this, "target_temperature_high_c", temperature, "cooling threshold temperature"))
        .asCallback(callback);
    default:
      return;
  }
}, 5000);

NestThermostatAccessory.prototype.setHeatingThresholdTemperatureDebounced = debounce(function (temperature, callback) {
  switch (this.device.hvac_mode) {
    case "heat-cool":
      return Promise.resolve()
        .then(this.updateDevicePropertyAsync.bind(this, "target_temperature_low_c", temperature, "heating threshold temperature"))
        .asCallback(callback);
    default:
      return;
  }
}, 5000);
