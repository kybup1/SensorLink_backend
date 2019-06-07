'use strict';

module.exports = async (Patient) => {
  // Remote method that returns all patients that have connected sensors at the moment
  Patient.withConnectedSensor = async (cb) => {
    let patients;
    // Gets all patients from the database
    try {
      patients = await Patient.find();
    } catch (error) {
      cb(error)
    }
    let selectedPatients = [];
    // Checks if a patient has a LinkedSensor object which has the attribute connected set to true
    // If this is the case the patient is added to the selectedPatients array which is than returned in the response
    for (const pat of patients) {
      let addPatient = false;
      let lSensors;
      // Reads all LinkedSensor objects of a patient
      try {
        lSensors = await pat.linkedSensors.find();
      } catch (error) {
        cb(error);
      }
      // Checks for each LinkedSensor object of a paitent if the attribute isConnected is set to true
      lSensors.forEach(ls => {
        if (ls.isConnected == true) {
          addPatient = true;
        }
      });
      // If this variable is set to true the patient is added to the selectedPatients array which is returned in the response
      if (addPatient == true) {
        selectedPatients.push(pat);
      }
    };
    // Callback method which generates the response with an array of patient objects which are in the selectedPatients array
    cb(null, selectedPatients);
  };
  //Remote method which returns all patient in the ordered by the last measurement
  Patient.orderByLastEntry = async (cb) => {
    let patients = await Patient.find();
    // Filters all patients out that have no lastMeasurementEntry attribute set
    let sortedPatients = patients.filter(pat => pat.lastMeasurementEntry != null);
    // Sortes all patients in the sortedPatients array by the lastMeasurementEntryDate
    sortedPatients.sort(function(a, b) {
      let dateA = new Date(a.lastMeasurementEntry)
      let dateB = new Date(b.lastMeasurementEntry);
      if (dateA < dateB) return 1;
      else if (dateA > dateB) return -1;
      return 0;
    });
    cb(null, sortedPatients)
  };
  // Remote method which is used to link a patient with a sensor
  // Therefore a LinkedSensor object is created for the patient and the patient id is set in the SensorInstacne object
  Patient.linkSensor = function (patid, sensorid, date, altPatId, cb) {
    // Searches a patient and a sensor object in the database by patid, sensoridentifier
    let promPatient = Patient.app.models.Patient.findOne({"where":{"patId":patid}});
    let promSenosr = Patient.app.models.SensorInstance.findOne({"where":{"sensorIdentifier":sensorid}})
    Promise.all([promPatient, promSenosr]).then((result) => {
     // Returns error responses if the patient or the sensor is not found
      if (result[0] == null) {
        cb({"error":"Patient not found"})
      } else if (result[1] == null) {
        cb({"error":"Sensor not found"})
      }
      let patient = result[0];
      let sensor = result[1];
      // if an error accurs the save variable is set to false to prevent persisting the data into the database
      let save = true;
      // Checks if the sensor is allready linked to this or another patient by the linkedPatId attribute
      if (sensor.linkedPatId == patient.patId) {
        cb({"error":"Sensor already linked to this patient"});
        save = false;
      } else if (sensor.linkedPatId != null) {
        cb({"error":"Sensor already linked to another patient"})
        save = false;
      }
      // Creating a new LinkedSensor object and adding the values that were given in the request
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
      // if save is true the created LinkedSensor object is connected to the patient and saved into the database
      if(save) {
        return Promise.all([patient.linkedSensors.create(lSensor), sensor.save()]);
      }
    }).then((result) =>{
      cb(null, {"Success":"Sensor linked to patient"})
    }).catch(err => cb(err))
  };
  // Remote method which is used to unlink a sensor from a patient
  // Therefore the corresponding LinkedSensor object is modified and the linkedPatId attribute of the corresponding sensor is set to null
  Patient.unlinkSensor = function(patid, sensorid, date, cb){
    // Searches a LinkedSensor and a SensorInstance object in the database by patid, sensoridentifier
    let promLinkedSensor = Patient.app.models.LinkedSensor.findOne({"where":{"and": [{"patId":patid}, {"sensorIdentifier":sensorid}, {"isConnected":true}]}});
    let promSenosr = Patient.app.models.SensorInstance.findOne({"where":{"sensorIdentifier":sensorid}})
    Promise.all([promLinkedSensor, promSenosr]).then((result) => {
      // if an error accurs the save variable is set to false to prevent persisting the data into the database
      let save = true;
      // Returns a error response if the LinkedSensor or the SensorInstance object are not found in the database
      if (result[1] == null) {
        cb({"error":"No sensor found with this identifier"})
        save = false;
      } else if (result[0] == null) {
        cb({"error":"Sensor is not connected to this patient"})
        save = false;
      }
      let linkedSensor = result[0];
      let sensor = result[1];
      // Changes corresponding attributes in LinkedSensor and SensorInstance object
      sensor.linkedPatId = null;
      linkedSensor.isConnected = false;
      if (date == null){
        linkedSensor.to = new Date();
      } else {
        linkedSensor.to = date;
      }
      // if save is true the the modified LinkedSensor and SensorInstance object are saved into the database
      if (save) {
        return Promise.all([linkedSensor.save(), sensor.save()]);
      }

    }).then((result) =>{
      cb(null, {"Success":"Sensor unlinked from patient"});
    }).catch(err => cb(err))
  }
  // Remote Method which returns all measurements from a patient in a given time span
  // Optionally the measurements can be filtered by a loinc code
  Patient.getMeasurements = async (id, from, to, code, cb) => {
    // if no enddate is provided the date of tommorow will be set as enddate
    if (to == null) {
      to = new Date();
      to.setDate(to.getDate() + 1);
    }
    // patient is searched in the database by patId
    let patient;
    try {
      patient = await Patient.findOne({"where":{"patId":id}})
    } catch (error) {
      console.log(error);
    }
    if(patient==null) {
      cb({"error":"Patient not found"});
    };
    // Gets all LinkedSensor objects of a patient
    let allLSensors;
    try {
      allLSensors = await patient.linkedSensors.find();
    } catch (error) {
      console.log(error);
    }
    // Filters the LinkedSensor objects of a patient by the given timespan
    let lSensors = [];
    allLSensors.forEach(ls => {
      if (ls.isConnected == true && ls.from.setHours(0, 0, 0, 0) <= from.setHours(0,0,0,0)) {
        lSensors.push(ls);
      } else if(isInDateInterval(ls.from, from, to) || isInDateInterval(ls.to, from, to)) {
        lSensors.push(ls);
      }
    });
    let allMeasurements = [];
    // Gets all measurements of all filtered LinkedSensor objects and filters them according to the given time span
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
    // If a code is provided the measurements are filtered according to this code
    // Therefore only measurements with this code are returned in the response
    if (code) {
      allMeasurements = allMeasurements.filter(data => filterReadings(data.reading, code));
    };
    // Sortes the measurements of the allMeasurements array according to the timestamp
    let measurementsSorted = allMeasurements.sort(function(a, b) {
      let dateA = new Date(a.timestamp)
      let dateB = new Date(b.timestamp);
      if (dateA > dateB) return 1;
      else if (dateA < dateB) return -1;
      return 0;
    });
    // Returns the filtered and sorted measurements in the response
    cb(null, measurementsSorted)
  }
  // This method is used to save measurements into the database
  // Therefore a corresponding LinkedSensor object is searched in the database and the measurements are linked to it
  Patient.measurements = function(id, measurements, sensorIdentifier, cb) {
    // Searching for LinkedSensor and Patient objects in the database with the given ids
    let promLinkedSensor = Patient.app.models.LinkedSensor.findOne({"where":{"and": [{"patId":id}, {"sensorIdentifier":sensorIdentifier}, {"isConnected":true}]}});
    let promPatient = Patient.findOne({"where":{"patId":id}});
    Promise.all([promLinkedSensor, promPatient]).then(results => {
      // if an error accurs the save variable is set to false to prevent persisting the data into the database
      let save = true;
      let lSensor = results[0];
      let patient = results[1];
      // Checks if a LinkedSensor object was found in the database
      if (!lSensor) {
        cb({"error":"Sensor is not linked with this patient"});
        save = false;
      }
      // Creates a varialbe for the lastMeasurmentEntry and sets it to the Last LastMeasurementEntry of the patient if it is allready set
      let lastEntryDate = new Date("1900-01-01");
      if (patient.lastMeasurementEntry) {
        lastEntryDate = new Date(patient.lastMeasurementEntry.toISOString())
      };
      // Checks all measurements and sets the LastMeasuredEnty of the patient if the timestamp of the measurement is higher
      measurements.forEach(measurement => {
        measurement.timestamp = new Date(measurement.timestamp);

        if (measurement.timestamp > lastEntryDate) {
          patient.lastMeasurementEntry = measurement.timestamp;
        };
      });
      // Adds a promise for each measurement to save it to the database
      // Also adds a promise to the same array to update the patient in the database
      let dataToSave = [];
      measurements.forEach(measurement => {
        dataToSave.push(lSensor.measuredData.create(measurement));
      });
      dataToSave.push(patient.save())
      console.log(measurements[0]);
      // if save is true all promises in the array dataToSave are executed and therefore all the data is saved
      if (save) {
        return Promise.all(dataToSave);
      }

    }).then(results => cb(null, {"Success":"Measurement saved"})).catch(err => cb(err))
  }
  // Remote method which returns all events of a patient in a given time span
  // All events are filtered by a giben timespan
  // Also the events are sorted according to their starttime
  Patient.getEventsAt = function(id, from, to, cb) {
    // All Event objects of a Patient are searched in the database
    Patient.app.models.Event.find({"where":{"patientId":id}}).then((events) => {
      // Filters the array with all events by the given timestamp
      let eventsFiltered = events.filter(event => isInTimeInterval(event.from, from, to));
      // The remaining evets are sorted by the startdate
      let eventsSorted = eventsFiltered.sort(function(a, b) {
        let dateA = new Date(a.from)
        let dateB = new Date(b.from);
        if (dateA > dateB) return 1;
        else if (dateA < dateB) return -1;
        return 0;
      });
      // Returns all filtered and sorted events in the response
      cb(null, eventsSorted);
    })
  }
};

// Checks if a date is in a given timespan
// This method ignores the given time in the interval and only checks the day
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
// This method  checks if a date is in a given time span
// If the date is in the time span true is returned
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
// This method is used to check if a code is included in a reading
// a reading and a code can be provided and a boolean is returned
let filterReadings = function(reading, code) {
  return reading.measurementCode[0].code == code;
};
