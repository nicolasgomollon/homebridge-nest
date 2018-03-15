'use strict';

const inherits = require('util').inherits;
const NestDeviceAccessory = require('./nest-device-accessory')();

/* eslint-disable no-unused-vars */
var Accessory;
var Service;
var Characteristic;
var uuid;
/* eslint-enable no-unused-vars */

function NestCamAccessory(connection, log, device, structure) {
  NestDeviceAccessory.call(this, connection, log, device, structure);

  var motionSensorService = this.addService(Service.MotionSensor)
    .setCharacteristic(Characteristic.Name, this.device.name + ' Camera');

  this.bindCharacteristic(
    motionSensorService,
    Characteristic.MotionDetected,
    'Motion',
    this.getMotionDetected,
    null,
    this.formatMotionDetected
  );

  this.bindCharacteristic(
    motionSensorService,
    Characteristic.StatusActive,
    'Online status (motion sensor)',
    this.getStatusActive,
    null,
    this.formatStatusActive
  );

  this.updateData();
}

NestCamAccessory.prototype.formatMotionDetected = function (value) {
  if (value) {
    return 'detected';
  }
  return 'not detected';
};

NestCamAccessory.prototype.formatStatusActive = function (value) {
  switch (value) {
    case true:
      return 'online';
    case false:
      return 'offline';
    default:
      return 'unknown (' + value + ')';
  }
};

NestCamAccessory.prototype.getMotionDetected = function () {
  return (
    this.device.last_event &&
    this.device.last_event.has_motion &&
    !this.device.last_event.end_time
  );
};

NestCamAccessory.prototype.getStatusActive = function () {
  return this.device.is_online;
};

module.exports = function (exportedTypes) {
  if (exportedTypes && !Service) {
    Accessory = exportedTypes.Accessory;
    Service = exportedTypes.Service;
    Characteristic = exportedTypes.Characteristic;
    uuid = exportedTypes.uuid;

    var accessory = NestCamAccessory.prototype;
    inherits(NestCamAccessory, NestDeviceAccessory);
    NestCamAccessory.prototype.parent = NestDeviceAccessory.prototype;
    for (var item in accessory) {
      if (NestCamAccessory.prototype.hasOwnProperty.call(accessory, item)) {
        NestCamAccessory.prototype[item] = accessory[item];
      }
    }

    NestCamAccessory.deviceType = 'cam';
    NestCamAccessory.deviceGroup = 'cameras';
    NestCamAccessory.prototype.deviceType = NestCamAccessory.deviceType;
    NestCamAccessory.prototype.deviceGroup = NestCamAccessory.deviceGroup;
  }
  return NestCamAccessory;
};
