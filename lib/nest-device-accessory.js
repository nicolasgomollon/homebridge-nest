'use strict';

const inherits = require('util').inherits;

/* eslint-disable no-unused-vars */
let Accessory, Service, Characteristic, uuid;
let Away, EcoMode, FanTimerActive, FanTimerDuration, HasLeaf, ManualTestActive, SunlightCorrectionEnabled, SunlightCorrectionActive, UsingEmergencyHeat;
/* eslint-enable no-unused-vars */

module.exports = function (exportedTypes) {
  if (exportedTypes && !Accessory) {
    Accessory = exportedTypes.Accessory;
    Service = exportedTypes.Service;
    Characteristic = exportedTypes.Characteristic;
    uuid = exportedTypes.uuid;
    Away = exportedTypes.Away;
    EcoMode = exportedTypes.EcoMode;
    FanTimerActive = exportedTypes.FanTimerActive;
    FanTimerDuration = exportedTypes.FanTimerDuration;
    HasLeaf = exportedTypes.HasLeaf;
    ManualTestActive = exportedTypes.ManualTestActive;
    SunlightCorrectionEnabled = exportedTypes.SunlightCorrectionEnabled;
    SunlightCorrectionActive = exportedTypes.SunlightCorrectionActive;
    UsingEmergencyHeat = exportedTypes.UsingEmergencyHeat;

    var accessory = NestDeviceAccessory.prototype;
    inherits(NestDeviceAccessory, Accessory);
    NestDeviceAccessory.prototype.parent = Accessory.prototype;
    for (var item in accessory) {
      if (NestDeviceAccessory.prototype.hasOwnProperty.call(accessory, item)) {
        NestDeviceAccessory.prototype[item] = accessory[item];
      }
    }
  }
  return NestDeviceAccessory;
};

function NestDeviceAccessory(connection, log, device, structure, platform) {
  this.connection = connection;
  this.name = device.name + ' Nest ' + this.model;
  this.deviceID = device.device_id;
  this.log = log;
  this.device = device;
  this.structure = structure;
  this.structureID = structure.structure_id;
  this.platform = platform;

  var id = uuid.generate('nest.' + this.deviceType + '.' + this.deviceID);
  Accessory.call(this, this.name, id);
  this.uuid_base = id;

  /* eslint-disable no-unused-vars */
  var accessoryInformationService = this.getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.FirmwareRevision, this.device.software_version.substring(0, 5))
    .setCharacteristic(Characteristic.Manufacturer, 'Nest')
    .setCharacteristic(Characteristic.Model, this.platform.getModel(this.device, this.model))
    .setCharacteristic(Characteristic.Name, this.name)
    .setCharacteristic(Characteristic.SerialNumber, this.platform.getSerialNumber(this.device));
  /* eslint-enable no-unused-vars */

  this.boundCharacteristics = [];

  this.updateData();
}

NestDeviceAccessory.prototype.bindCharacteristic = function (service, characteristic, description, get, set, format) {
  var actual = service.getCharacteristic(characteristic)
    .on('get', function (callback) {
      var value = get.bind(this)();
      if (callback) callback(null, value);
    }.bind(this))
    .on('change', function (change) {
      var display = change.newValue;
      if (format && display !== null) {
        display = format(display);
      }
      this.log.debug(description + ' for ' + this.name + ' is: ' + display);
    }.bind(this));
  if (set) {
    actual.on('set', set.bind(this));
  }
  this.boundCharacteristics.push([service, characteristic]);
};

NestDeviceAccessory.prototype.getDevicePropertyPath = function (property) {
  return 'devices/' + this.deviceGroup + '/' + this.deviceID + '/' + property;
};

NestDeviceAccessory.prototype.getServices = function () {
  return this.services;
};

NestDeviceAccessory.prototype.getStructurePropertyPath = function (property) {
  return 'structures/' + this.structureID + '/' + property;
};

NestDeviceAccessory.prototype.updateData = function (device, structure) {
  if (device) {
    this.device = device;
  }
  if (structure) {
    this.structure = structure;
  }
  this.boundCharacteristics.map(function (characteristic) {
    characteristic[0].getCharacteristic(characteristic[1]).getValue();
  });
};

NestDeviceAccessory.prototype.updateDevicePropertyAsync = function (property, value, propertyDescription, valueDescription) {
  propertyDescription = propertyDescription || property;
  valueDescription = valueDescription || value;
  this.log.debug('Setting ' + propertyDescription + ' for ' + this.name + ' to: ' + valueDescription);
  return this.connection.update(this.getDevicePropertyPath(property), value)
    .return(value);
};

NestDeviceAccessory.prototype.addAwayCharacteristic = function(service) {
  service.addCharacteristic(Away);
  this.bindCharacteristic(service, Away, "Away", this.isAway, this.setAway);
};

NestDeviceAccessory.prototype.isAway = function () {
  switch (this.structure.away) {
  case "home":
    return false;
  case "away":
    return true;
  case "auto-away":
    return true;
  default:
    return false;
  }
};

NestDeviceAccessory.prototype.setAway = function (away, callback) {
  const val = away ? 'away' : 'home';
  this.log.info("Setting Away for " + this.name + " to: " + val);
  const promise = this.connection.update(this.getStructurePropertyPath("away"), val);
  return promise
    .return(away)
    .asCallback(callback);
};

NestDeviceAccessory.prototype.addEcoModeCharacteristic = function(service) {
  service.addCharacteristic(EcoMode);
  this.bindCharacteristic(service, EcoMode, "Eco Mode", this.isEcoMode, this.setEcoMode);
};

NestDeviceAccessory.prototype.isEcoMode = function () {
  return (this.device.hvac_mode === "eco");
};

NestDeviceAccessory.prototype.setEcoMode = function (eco, callback) {
  const val = eco ? 'eco' : this.device.previous_hvac_mode;
  this.log.info("Setting Eco Mode for " + this.name + " to: " + val);
  return this.updateDevicePropertyAsync("hvac_mode", val, "target heating cooling")
    .asCallback(callback);
};

NestDeviceAccessory.prototype.addFanTimerActiveCharacteristic = function(service) {
  service.addCharacteristic(FanTimerActive);
  this.bindCharacteristic(service, FanTimerActive, "Fan Timer Active", this.isFanTimerActive, this.setFanTimerActive);
};

NestDeviceAccessory.prototype.isFanTimerActive = function () {
  return this.device.fan_timer_active;
};

NestDeviceAccessory.prototype.setFanTimerActive = function (fan, callback) {
  const val = fan;
  this.log.info("Setting Fan Timer Active for " + this.name + " to: " + val);
  if (this.device.hvac_mode !== "off" && this.device.hvac_state === "off") {
    return this.updateDevicePropertyAsync("fan_timer_active", val, "fan timer active")
      .asCallback(callback);
  }
};

NestDeviceAccessory.prototype.addFanTimerDurationCharacteristic = function(service) {
  service.addCharacteristic(FanTimerDuration);
  this.bindCharacteristic(service, FanTimerDuration, "Fan Timer Duration", this.isFanTimerDuration, this.setFanTimerDuration);
};

NestDeviceAccessory.prototype.isFanTimerDuration = function () {
  return this.device.fan_timer_duration;
};

NestDeviceAccessory.prototype.setFanTimerDuration = function (timer, callback) {
  const val = timer;
  this.log.info("Setting Fan Timer Duration for " + this.name + " to: " + val);
  return this.updateDevicePropertyAsync("fan_timer_duration", val, "fan timer duration")
    .asCallback(callback);
};

NestDeviceAccessory.prototype.addHasLeafCharacteristic = function(service) {
  service.addCharacteristic(HasLeaf);
  this.bindCharacteristic(service, HasLeaf, "Has Leaf", this.isHasLeaf);
};

NestDeviceAccessory.prototype.isHasLeaf = function () {
  return this.device.has_leaf;
};

NestDeviceAccessory.prototype.addManualTestActiveCharacteristic = function(service) {
  service.addCharacteristic(ManualTestActive);
  this.bindCharacteristic(service, ManualTestActive, "Manual Test Active", this.isManualTestActive);
};

NestDeviceAccessory.prototype.isManualTestActive = function () {
  return this.device.is_manual_test_active;
};

NestDeviceAccessory.prototype.addSunlightCorrectionEnabledCharacteristic = function(service) {
  service.addCharacteristic(SunlightCorrectionEnabled);
  this.bindCharacteristic(service, SunlightCorrectionEnabled, "Sunlight Correction Enabled", this.isSunlightCorrectionEnabled);
};

NestDeviceAccessory.prototype.isSunlightCorrectionEnabled = function () {
  return this.device.sunlight_correction_enabled;
};

NestDeviceAccessory.prototype.addSunlightCorrectionActiveCharacteristic = function(service) {
  service.addCharacteristic(SunlightCorrectionActive);
  this.bindCharacteristic(service, SunlightCorrectionActive, "Sunlight Correction Active", this.isSunlightCorrectionActive);
};

NestDeviceAccessory.prototype.isSunlightCorrectionActive = function () {
  return this.device.sunlight_correction_active;
};

NestDeviceAccessory.prototype.addUsingEmergencyHeatCharacteristic = function(service) {
  service.addCharacteristic(UsingEmergencyHeat);
  this.bindCharacteristic(service, UsingEmergencyHeat, "Using Emergency Heat", this.isUsingEmergencyHeat);
};

NestDeviceAccessory.prototype.isUsingEmergencyHeat = function () {
  return this.device.is_using_emergency_heat;
};
