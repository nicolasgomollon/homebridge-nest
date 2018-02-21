var inherits = require('util').inherits;
var Promise = require('bluebird');
var Accessory, Service, Characteristic, uuid;

'use strict';

function toTitleCase(str) {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

module.exports = function (exportedTypes) {
  if (exportedTypes && !Accessory) {
    Accessory = exportedTypes.Accessory;
    Service = exportedTypes.Service;
    Characteristic = exportedTypes.Characteristic;
    uuid = exportedTypes.uuid;

    var acc = NestDeviceAccessory.prototype;
    inherits(NestDeviceAccessory, Accessory);
    NestDeviceAccessory.prototype.parent = Accessory.prototype;
    for (var mn in acc) {
      NestDeviceAccessory.prototype[mn] = acc[mn];
    }
  }
  return NestDeviceAccessory;
};

function NestDeviceAccessory(connection, log, device, structure) {

  this.connection = connection;
  this.name = device.name_long || device.name;
  this.deviceId = device.device_id;
  this.log = log;
  this.device = device;
  this.structure = structure;
  this.structureID = structure.structure_id;

  var id = uuid.generate('nest' + '.' + this.deviceType + '.' + this.deviceId);
  Accessory.call(this, this.name, id);
  this.uuid_base = id;

  var accessoryInformationService = this.getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.FirmwareRevision, this.device.software_version.substring(0,5))
    .setCharacteristic(Characteristic.Manufacturer, "Nest")
    .setCharacteristic(Characteristic.Model, `${toTitleCase(this.deviceType)}`)
    .setCharacteristic(Characteristic.Name, this.name)
    .setCharacteristic(Characteristic.SerialNumber, this.device.name);

  this.boundCharacteristics = [];

  this.updateData();
}

NestDeviceAccessory.prototype.getServices = function () {
  return this.services;
};

NestDeviceAccessory.prototype.bindCharacteristic = function (service, characteristic, desc, getFunc, setFunc, format) {
  var actual = service.getCharacteristic(characteristic)
    .on('get', function (callback) {
      var val = getFunc.bind(this)();
      if (callback) callback(null, val);
    }.bind(this))
    .on('change', function (change) {
      var disp = change.newValue;
      if (format && disp !== null) {
        disp = format(disp);
      }
      this.log.debug(desc + " for " + this.name + " is: " + disp);
    }.bind(this));
  if (setFunc) {
    actual.on('set', setFunc.bind(this));
  }
  this.boundCharacteristics.push([service, characteristic]);
};

NestDeviceAccessory.prototype.updateData = function (device, structure) {
  if (device) {
    this.device = device;
  }
  if (structure) {
    this.structure = structure;
  }
  this.boundCharacteristics.map(function (c) {
    c[0].getCharacteristic(c[1]).getValue();
  });
};

NestDeviceAccessory.prototype.getDevicePropertyPath = function (property) {
  return 'devices/' + this.deviceGroup + '/' + this.deviceId + '/' + property;
};

NestDeviceAccessory.prototype.updateDevicePropertyAsync = function (property, value, propertyDescription, valueDescription) {
  propertyDescription = propertyDescription || property;
  valueDescription = valueDescription || value;
  this.log.debug("Setting " + propertyDescription + " for " + this.name + " to: " + valueDescription);
  return this.connection.update(this.getDevicePropertyPath(property), value)
    .return(value);
};

NestDeviceAccessory.prototype.getStructurePropertyPath = function (property) {
  return 'structures/' + this.structureID + '/' + property;
};
