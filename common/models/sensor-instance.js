'use strict';

module.exports = function(Sensorinstance) {
  // This method is executed befor the POST request for creating a sensor is proccessed.
  // It creates the sensoridentifier by combining the sensortype and the sensorid with a questionmark as delimiter between them
  // If readings are provided with the sensor the method adds the sensortype into those reading objects.
  Sensorinstance.beforeRemote('create', function(sensor, u, next) {
   // Creates the sensoridentifier by combining sensortype with sensorid with a questionmark between both
    sensor.req.body.sensorIdentifier = sensor.req.body.sensorType + '?' + sensor.req.body.sensorId;
    // Creates the linkedPatId attribute and sets it to null since no patient is connected when the sensor is created
    sensor.req.body.linkedPatId = null;
    // Checks if a sensor has reading objects and adds the attribute sensortype into those reading objects
    if (sensor.req.body.readings) {
      for (let i = 0; i < sensor.req.body.readings.length; i++) {
        sensor.req.body.readings[i].sensorType = sensor.req.body.sensorType;
      }
    }
    next();
  });
  // Remote method which returns some possible readings which are hardcoded below.
  // In a productive environment those readings should be provided by a ontologyserver
  Sensorinstance.getReadings = function(cb) {
    cb(null, readings);
  };
};
// Hardcoded reading objects
// Only for this prototypical implementation. Should be provided by an ontologyserver in a productive environment.
const readings = [
  {
    'measurementString': 'Puls',
    'measurementCode': [
      {
        'system': 'loinc',
        'code': '8867-3',
        'display': 'Heartrate'
      },
      {
        'system': 'SNOMED CT',
        'code': '364075005',
        'display': 'heart rate'
      }
    ],
    'Unit': '/min'
  },
  {
    'measurementString': 'Sauerstoffsättigung',
    'measurementCode': [
      {
        'system': 'loinc',
        'code': '2708-6',
        'display': 'Oxygen saturation'
      },
      {
        'system': 'SNOMED CT',
        'code': '442476006',
        'display': 'Arterial oxygen saturation'
      }
    ],
    'Unit': '%'
  },
  {
    'measurementString': 'Atemfrequenz',
    'measurementCode': [
      {
        'system': 'loinc',
        'code': '9279-1',
        'display': 'Respiratory rate'
      }
    ],
    'Unit': '/min'
  },
  {
    'measurementString': 'Herzfrequenzvariabilität',
    'measurementCode': [
      {
        'system': 'loinc',
        'code': '80404-7',
        'display': 'R-R interval.standard deviation (Heart rate variability)'
      }
    ],
    'Unit': 'ms'
  }
];
