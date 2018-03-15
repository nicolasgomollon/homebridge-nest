'use strict';

const inherits = require('util').inherits;
const NestDeviceAccessory = require('./nest-device-accessory')();

/* eslint-disable no-unused-vars */
var Accessory;
var Service;
var Characteristic;
var uuid;
/* eslint-enable no-unused-vars */

function NestProtectAccessory(connection, log, device, structure) {
  NestDeviceAccessory.call(this, connection, log, device, structure);

  var smokeSensorService = this.addService(Service.SmokeSensor)
    .setCharacteristic(Characteristic.Name, this.device.name + ' Smoke');

  this.bindCharacteristic(
    smokeSensorService,
    Characteristic.SmokeDetected,
    'Smoke',
    this.getSmokeDetected,
    null,
    this.formatSmokeDetected
  );

  this.bindCharacteristic(
    smokeSensorService,
    Characteristic.StatusActive,
    'Online status (smoke sensor)',
    this.getStatusActive,
    null,
    this.formatStatusActive
  );

  this.bindCharacteristic(
    smokeSensorService,
    Characteristic.StatusLowBattery,
    'Battery status (smoke sensor)',
    this.getStatusLowBattery,
    null,
    this.formatStatusLowBattery
  );

  var coSensorService = this.addService(Service.CarbonMonoxideSensor)
    .setCharacteristic(Characteristic.Name, this.device.name + ' Carbon Monoxide');

  this.bindCharacteristic(
    coSensorService,
    Characteristic.CarbonMonoxideDetected,
    'Carbon monoxide',
    this.getCarbonMonoxideDetected,
    null,
    this.formatCarbonMonoxideDetected
  );

  this.bindCharacteristic(
    coSensorService,
    Characteristic.StatusLowBattery,
    'Battery status (carbon monoxide sensor)',
    this.getStatusLowBattery,
    null,
    this.formatStatusLowBattery
  );

  this.bindCharacteristic(
    coSensorService,
    Characteristic.StatusActive,
    'Online status (carbon monoxide sensor)',
    this.getStatusActive,
    null,
    this.formatStatusActive
  );

  this.updateData();
}

NestProtectAccessory.prototype.formatCarbonMonoxideDetected = function (value) {
  switch (value) {
    case Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL:
      return 'normal';
    case Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL:
      return 'abnormal';
    default:
      return 'unknown (' + value + ')';
  }
};

NestProtectAccessory.prototype.formatSmokeDetected = function (value) {
  switch (value) {
    case Characteristic.SmokeDetected.SMOKE_NOT_DETECTED:
      return 'not detected';
    case Characteristic.SmokeDetected.SMOKE_DETECTED:
      return 'detected';
    default:
      return 'unknown (' + value + ')';
  }
};

NestProtectAccessory.prototype.formatStatusActive = function (value) {
  switch (value) {
    case true:
      return 'online';
    case false:
      return 'offline';
    default:
      return 'unknown (' + value + ')';
  }
};

NestProtectAccessory.prototype.formatStatusLowBattery = function (value) {
  switch (value) {
    case Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL:
      return 'normal';
    case Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW:
      return 'low';
    default:
      return 'unknown (' + value + ')';
  }
};

NestProtectAccessory.prototype.getCarbonMonoxideDetected = function () {
  switch (this.device.co_alarm_state) {
    case 'ok':
      return Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL;
    default:
      return Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
  }
};

NestProtectAccessory.prototype.getSmokeDetected = function () {
  switch (this.device.smoke_alarm_state) {
    case 'ok':
      return Characteristic.SmokeDetected.SMOKE_NOT_DETECTED;
    default:
      return Characteristic.SmokeDetected.SMOKE_DETECTED;
  }
};

NestProtectAccessory.prototype.getStatusActive = function () {
  return this.device.is_online;
};

NestProtectAccessory.prototype.getStatusLowBattery = function () {
  switch (this.device.battery_health) {
    case 'ok':
      return Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    default:
      return Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
  }
};

module.exports = function (exportedTypes) {
  if (exportedTypes && !Accessory) {
    Accessory = exportedTypes.Accessory;
    Service = exportedTypes.Service;
    Characteristic = exportedTypes.Characteristic;
    uuid = exportedTypes.uuid;

    var accessory = NestProtectAccessory.prototype;
    inherits(NestProtectAccessory, NestDeviceAccessory);
    NestProtectAccessory.prototype.parent = NestDeviceAccessory.prototype;
    for (var item in accessory) {
      if (NestProtectAccessory.prototype.hasOwnProperty.call(accessory, item)) {
        NestProtectAccessory.prototype[item] = accessory[item];
      }
    }

    NestProtectAccessory.deviceType = 'protect';
    NestProtectAccessory.deviceGroup = 'smoke_co_alarms';
    NestProtectAccessory.prototype.deviceType = NestProtectAccessory.deviceType;
    NestProtectAccessory.prototype.deviceGroup = NestProtectAccessory.deviceGroup;
  }
  return NestProtectAccessory;
};
