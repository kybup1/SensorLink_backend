'use strict';

module.exports = function(Sensorinstance) {
  Sensorinstance.beforeRemote("create", function(sensor, u, next) {
    sensor.req.body.sensorIdentifier = sensor.req.body.sensorType + "?" + sensor.req.body.sensorId;
    if(sensor.req.body.readings) {
      for (let i = 0; i < sensor.req.body.readings.length; i++) {
        sensor.req.body.readings[i].sensorType = sensor.req.body.sensorType;
      }
    }
    next();
  });

  Sensorinstance.getReadings = function (cb) {
    cb(null, readings);
  }
};

const readings = [
  {
    "measurementString": "Puls",
    "measurementCode": [
      {
        "system": "loinc",
        "code": "8867-3",
        "display": "Heartrate"
      },
      {
        "system": "SNOMED CT",
        "code": "364075005",
        "display": "heart rate"
      }
    ],
    "Unit": "/min"
  },
  {
    "measurementString": "Sauerstoffsättigung",
    "measurementCode": [
      {
        "system": "loinc",
        "code": "2708-6",
        "display": "Oxygen saturation"
      },
      {
        "system": "SNOMED CT",
        "code": "442476006",
        "display": "Arterial oxygen saturation"
      }
    ],
    "Unit": "%"
  },
  {
    "measurementString": "Atemfrequenz",
    "measurementCode": [
      {
        "system": "loinc",
        "code": "9279-1",
        "display": "Respiratory rate"
      }
    ],
    "Unit": "/min"
  },
  {
    "measurementString": "Herzfrequenzvariabilität",
    "measurementCode": [
      {
        "system": "loinc",
        "code": "80404-7",
        "display": "R-R interval.standard deviation (Heart rate variability)"
      }
    ],
    "Unit": "ms"
  }
]
