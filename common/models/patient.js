'use strict';

module.exports = async (Patient) => {
  Patient.withConnectedSensor = async (cb) => {
    let patients = await Patient.find();
    let selectedPatients = [];
    for (const pat of patients) {
      let addPatient = false;
      let lSensors = await pat.linkedSensors.find();
      lSensors.forEach(ls => {
        if (ls.isConnected == true) {
          addPatient = true;
        }
      });

      if (addPatient == true) {
        selectedPatients.push(pat);
      }
    };
    cb(null, selectedPatients);
  };

  Patient.orderByLastEntry = async (cb) => {
    let patients = await Patient.find();
    let sortedPatients = patients.filter(pat => pat.lastMeasurementEntry != null);

    sortedPatients.sort(function(a, b) {
      let dateA = new Date(a.lastMeasurementEntry)
      let dateB = new Date(b.lastMeasurementEntry);
      if (dateA < dateB) return 1;
      else if (dateA > dateB) return -1;
      return 0;
    });
    cb(null, sortedPatients)
  };

  Patient.linkSensor = function (patid, sensorid, date, altPatId, cb) {
    let promPatient = Patient.app.models.Patient.findOne({"where":{"patId":patid}});
    let promSenosr = Patient.app.models.SensorInstance.findOne({"where":{"sensorIdentifier":sensorid}})
    Promise.all([promPatient, promSenosr]).then((result) => {
      if (result[0] == null) {
        cb({"error":"Patient not found"})
      } else if (result[1] == null) {
        cb({"error":"Sensor not found"})
      }
      let patient = result[0];
      let sensor = result[1];
      let save = true;

      if (sensor.linkedPatId == patient.patId) {
        cb({"error":"Sensor already linked to this patient"});
        save = false;
      } else if (sensor.linkedPatId != null) {
        cb({"error":"Sensor already linked to another patient"})
        save = false;
      }

      let lSensor = new Patient.app.models.LinkedSensor();
      lSensor.sensorIdentifier = sensor.sensorIdentifier;
      lSensor.altPatIdentifier = altPatId;
      if (date == null) {
        lSensor.from = new Date()
      } else {
        lSensor.from = date;
      }
      lSensor.readings = sensor.readings;
      lSensor.isConnected = true;
      sensor.linkedPatId = patient.patId;

      if(save) {
        return Promise.all([patient.linkedSensors.create(lSensor), sensor.save()]);
      }

    }).then((result) =>{
      cb(null, {"Success":"Sensor linked to patient"})
    }).catch(err => cb(err))
  };

  Patient.unlinkSensor = function(patid, sensorid, date, cb){
    let promLinkedSensor = Patient.app.models.LinkedSensor.findOne({"where":{"and": [{"patId":patid}, {"sensorIdentifier":sensorid}, {"isConnected":true}]}});
    let promSenosr = Patient.app.models.SensorInstance.findOne({"where":{"sensorIdentifier":sensorid}})
    Promise.all([promLinkedSensor, promSenosr]).then((result) => {
      let save = true;
      if (result[1] == null) {
        cb({"error":"No sensor found with this identifier"})
        save = false;
      } else if (result[0] == null) {
        cb({"error":"Sensor is not connected to this patient"})
        save = false;
      }
      let linkedSensor = result[0];
      let sensor = result[1];

      sensor.linkedPatId = null;
      linkedSensor.isConnected = false;
      if (date == null){
        linkedSensor.to = new Date();
      } else {
        linkedSensor.to = date;
      }

      if (save) {
        return Promise.all([linkedSensor.save(), sensor.save()]);
      }

    }).then((result) =>{
      cb(null, {"Success":"Sensor unlinked from patient"});
    }).catch(err => cb(err))
  }

  Patient.getMeasurements = async (id, from, to, code, cb) => {
    if (to == null) {
      to = new Date();
      to.setDate(to.getDate() + 1);
    }
    let patient;
    try {
      patient = await Patient.findOne({"where":{"patId":id}})
    } catch (error) {
      console.log(error);
    }
    if(patient==null) {
      cb({"error":"Patient not found"});
    };
    let allLSensors;
    try {
      allLSensors = await patient.linkedSensors.find();
    } catch (error) {
      console.log(error);
    }
    let lSensors = [];
    allLSensors.forEach(ls => {
      if (ls.isConnected == true && ls.from.setHours(0, 0, 0, 0) <= from.setHours(0,0,0,0)) {
        lSensors.push(ls);
      } else if(isInDateInterval(ls.from, from, to) || isInDateInterval(ls.to, from, to)) {
        lSensors.push(ls);
      }
    });
    let allMeasurements = [];

    for(const ls of lSensors) {
      let measurements;
      try {
        measurements = await ls.measuredData.find();
      } catch (error) {
        console.log(error);
      }
      let result = measurements.filter(data => isInTimeInterval(data.timestamp, from, to));
      allMeasurements = allMeasurements.concat(result);
    };

    if (code) {
      allMeasurements = allMeasurements.filter(data => filterReadings(data.reading, code));
    };

    let measurementsSorted = allMeasurements.sort(function(a, b) {
      let dateA = new Date(a.timestamp)
      let dateB = new Date(b.timestamp);
      if (dateA > dateB) return 1;
      else if (dateA < dateB) return -1;
      return 0;
    });

    cb(null, measurementsSorted)
  }

  Patient.measurements = function(id, measurements, sensorIdentifier, cb) {
    let promLinkedSensor = Patient.app.models.LinkedSensor.findOne({"where":{"and": [{"patId":id}, {"sensorIdentifier":sensorIdentifier}, {"isConnected":true}]}});
    let promPatient = Patient.findOne({"where":{"patId":id}});
    Promise.all([promLinkedSensor, promPatient]).then(results => {
      let save = true;
      let lSensor = results[0];
      let patient = results[1];
      if (!lSensor) {
        cb({"error":"Sensor is not linked with this patient"});
        save = false;
      }

      let lastEntryDate = new Date("1900-01-01");
      if (patient.lastMeasurementEntry) {
        lastEntryDate = new Date(patient.lastMeasurementEntry.toISOString())
      };

      measurements.forEach(measurement => {
        measurement.timestamp = new Date(measurement.timestamp);

        if (measurement.timestamp > lastEntryDate) {
          patient.lastMeasurementEntry = measurement.timestamp;
        };
      });

      let dataToSave = [];
      measurements.forEach(measurement => {
        dataToSave.push(lSensor.measuredData.create(measurement));
      });
      dataToSave.push(patient.save())
      console.log(measurements[0]);
      if (save) {
        return Promise.all(dataToSave);
      }

    }).then(results => cb(null, {"Success":"Measurement saved"})).catch(err => cb(err))
  }

};

let isInDateInterval = function(date, from, to) {
  date = new Date(date);
  from = new Date(from);
  to = new Date(to);
  date.setHours(0,0,0,0);
  from.setHours(0,0,0,0);
  to.setHours(0,0,0,0);
  let isInInterval = false;
  if(from <= date && date <= to) {
    isInInterval = true;
  }
  return isInInterval;
}

let isInTimeInterval = function(date, from, to) {
  date = new Date(date);
  from = new Date(from);
  to = new Date(to);
  let isInInterval = false;
  if(from <= date && date <= to) {
    isInInterval = true;
  }
  return isInInterval;
}

let filterReadings = function(reading, code) {
  return reading.measurementCode[0].code == code;
};
