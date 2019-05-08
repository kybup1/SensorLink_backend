'use strict';

module.exports = function(Patient) {
  Patient.withConnectedSensor = function(cb) {
    Patient.find().then((patients) => {
      let selectedPatients = [];
      patients.forEach(pat => {
        let addPatient = false;
        pat.linkedSensors.forEach(ls => {
          if (ls.isConnected == true) {
            addPatient = true;
          }
        });

        if (addPatient == true) {
          selectedPatients.push(pat);
        }
      });
      cb(null, selectedPatients);
    });
  };

  Patient.withConnectedSensorAt = function(from, to, cb) {
    Patient.find().then((patients) => {
      let selectedPatients = [];
      patients.forEach(pat => {
        let addPatient = false;
        pat.linkedSensors.forEach(ls => {
          if (ls.isConnected == true && ls.from.setHours(0, 0, 0, 0) <= from) {
            addPatient = true;
          } else if (ls.to && ls.from.setHours(0, 0, 0, 0) >= from.setHours(0, 0, 0, 0) && ls.to.setHours(0, 0, 0, 0) <= to.setHours(0, 0, 0, 0)) {
            addPatient = true;
          }
        });

        if (addPatient == true) {
          selectedPatients.push(pat);
        }
      });
      cb(null, selectedPatients);
    });
  };

  Patient.orderByLastEntry = function(cb) {
    Patient.find().then((patients) => {
      let sortedPatients = patients.filter(pat => pat.lastMeasurementEntry != null);

      sortedPatients.sort(function(a, b) {
        let dateA = new Date(a.lastMeasurementEntry)
        let dateB = new Date(b.lastMeasurementEntry);
        if (dateA < dateB) return 1;
        else if (dateA > dateB) return -1;
        return 0;
      });
      cb(null, sortedPatients)
    })
  };

  Patient.linkSensor = function (patid, sensorid, date, altPatId, cb) {
    let promPatient = Patient.findOne({"where":{"patId":patid}});
    let promSenosr = Patient.app.models.SensorInstance.findOne({"where":{"sensorIdentifier":sensorid}})
    Promise.all([promPatient, promSenosr]).then((result) => {
      if (result[0] == null) {
        cb({"error":"Patient not found"})
      } else if (result[1] == null) {
        cb({"error":"Sensor not found"})
      }
      let patient = result[0];
      let sensor = result[1];

      if (sensor.linkedPatId == patient.patId) {
        cb({"error":"Sensor already linked to this patient"});
      } else if (sensor.linkedPatId != null) {
        cb({"error":"Sensor already linked to another patient"})
      }

      let lSensor = new Patient.app.models.LinkedSensor();
      lSensor.sensor = sensor.sensorIdentifier;
      lSensor.altPatIdentifier = altPatId;
      if (date == null) {
        lSensor.from = new Date()
      } else {
        lSensor.from = date;
      }
      lSensor.readings = sensor.readings;
      lSensor.isConnected = true;
      patient.linkedSensors.push(lSensor);
      sensor.linkedPatId = patient.patId;

      return Promise.all([patient.save(), sensor.save()]);

    }).then((result) =>{
      cb(null, {"Success":"Sensor linked to patient"})
    }).catch(error => cb(err))
  };

  Patient.unlinkSensor = function(patid, sensorid, date, cb){
    let promPatient = Patient.findOne({"where":{"patId":patid}});
    let promSenosr = Patient.app.models.SensorInstance.findOne({"where":{"sensorIdentifier":sensorid}})
    Promise.all([promPatient, promSenosr]).then((result) => {
      if (result[0] == null) {
        cb({"error":"Patient not found"})
      } else if (result[1] == null) {
        cb({"error":"Sensor not found"})
      }
      let patient = result[0];
      let sensor = result[1];

      if (sensor.linkedPatId == null) {
        cb({"error":"Sensor has no linked patient"});
      } else if (sensor.linkedPatId != patient.patId) {
        cb({"error":"Sensor is linked to another patient"})
      }

      for (let i = 0; i < patient.linkedSensors.length; i++) {
        let lSensor = patient.linkedSensors[i];
        if(lSensor.sensor==sensorid && lSensor.isConnected==true) {
          lSensor.isConnected=false;
          if (date == null) {
            lSensor.to = new Date();
          } else {
            lSensor.to = date;
          }
          sensor.linkedPatId=null;
          break;
        }
      }
      return Promise.all([patient.save(), sensor.save()]);

    }).then((result) =>{
      cb(null, {"Success":"Sensor unlinked from patient"});
    }).catch(err => cb(err))
  }

  Patient.getMeasurements = function(id, from, to, readings, cb) {
    if(to == null) {
      to = new Date();
      to.setDate(to.getDate() + 1);
    };
    Patient.findOne({"where":{"patId":id}}).then((patient) => {
      if(patient==null){
        cb({"error":"Patient not found"});
      };
      let lSensors = [];
      patient.linkedSensors.forEach(ls => {
        if (ls.isConnected == true && ls.from.setHours(0, 0, 0, 0) <= from.setHours(0,0,0,0)) {
          lSensors.push(ls);
        } else if(isInDateInterval(ls.from, from, to) || isInDateInterval(ls.to, from, to)) {
          lSensors.push(ls);
        }
      });
      let measurements = [];

      lSensors.forEach(ls => {
        let result = ls.savedData.filter(data => isInTimeInterval(data.timestamp, from, to));
        measurements = measurements.concat(result);
      });

      if (readings) {
        measurements = measurements.filter(data => filterReadings(data.reading, readings));
      };

      let measurementsSorted = measurements.sort(function(a, b) {
        let dateA = new Date(a.timestamp)
        let dateB = new Date(b.timestamp);
        if (dateA > dateB) return 1;
        else if (dateA < dateB) return -1;
        return 0;
      });

      cb(null, measurementsSorted)

    }).catch(err => cb(err))
  }

  Patient.measurements = function(id, values, sensorIdentifier, reading , cb) {
    Patient.findOne({"where":{"patId":id}}).then(patient => {
      if(!patient){

      }
      let lSensor = patient.linkedSensors.find(function(ls) {
        return ls.sensor == sensorIdentifier;
      })
      if(lSensor == null) {
        cb({"error":"Sensor is not linked with this patient"});
      } else if (!reading.sensorType || !reading.measurementCode || !reading.measurementCode[0].code){
        cb({"error":"Reading object is invalid"});
      }

      let faultyObjs = [];
      let measurements = [];

      values.forEach(valueObj => {
        valueObj.timestamp = new Date(valueObj.timestamp);
        if (!valueObj.value || !valueObj.timestamp){
          faultyObjs.push({"Error:":"Value Object is not complete with timestamp, value","Object":valueObj})
        } else if (lSensor.from < valueObj.timestamp){
          faultyObjs.push({"Error:":"Sensor is not connected to patient at the given timestamp"})
        } else if (lSensor.savedData.some((e) => e.timestamp.toISOString() == valueObj.timestamp.toISOString())) {
          console.log(lSensor.savedData.some((e) => e.timestamp.toISOString() == valueObj.timestamp.toISOString()))
          faultyObjs.push({"Error:":"Value with this timestamp already exists","Object":valueObj})
        }

        let measurement =  new Patient.app.models.MeasuredData();
        measurement.timestamp=valueObj.timestamp;
        measurement.sensor=sensorIdentifier;
        measurement.value=valueObj.value;
        measurement.reading=reading;

        measurements.push(measurement);
      })

      if(faultyObjs.length!=0){
        cb({"error":"Some provided value objects were faulty","faulty Objects:":faultyObjs})
      } else {
        lSensor.savedData = lSensor.savedData.concat(measurements);
        //console.log(patient.linkedSensors)
        return patient.save();
      }

    }).then(patient => cb(null, {"Success":"Measurement saved"})).catch(err => cb(err))
  }

};

let isInDateInterval = function(date, from, to) {
  date.setHours(0,0,0,0);
  from.setHours(0,0,0,0);
  to.setHours(0,0,0,0);
  let isInInterval = false;
  if(date >= from && date <= to) {
    isInInterval = true;
  }
  return isInInterval;
}

let isInTimeInterval = function(date, from, to) {
  let isInInterval = false;
  if(date >= from && date <= to) {
    isInInterval = true;
  }
  return isInInterval;
}

let filterReadings = function(reading, readings) {
  let isIncluded = false;
  readings.forEach(r1 => {
    r1.measurementCode.forEach(r1Coding => {
      if(r1Coding.code == reading.measurementCode[0].code) {
        isIncluded = true;
      }
    });
  });
  return isIncluded;
};
