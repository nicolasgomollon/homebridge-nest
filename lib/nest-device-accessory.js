'use strict';

const inherits = require('util').inherits;

/* eslint-disable no-unused-vars */
var Accessory;
var Service;
var Characteristic;
var uuid;
/* eslint-enable no-unused-vars */

module.exports = function (exportedTypes) {
  if (exportedTypes && !Accessory) {
    Accessory = exportedTypes.Accessory;
    Service = exportedTypes.Service;
    Characteristic = exportedTypes.Characteristic;
    uuid = exportedTypes.uuid;

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
