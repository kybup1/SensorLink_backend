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

        if(addPatient == true){
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

        if(addPatient == true){
          selectedPatients.push(pat);
        }

      });
      cb(null, selectedPatients);
    });
  };

};
