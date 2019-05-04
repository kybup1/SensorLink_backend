'use strict';

module.exports = function(Sensorinstance) {

  Sensorinstance.beforeRemote("create", function (sensor, u, next){
    sensor.req.body.sensorIdentifier=sensor.req.body.sensorType + "?" + sensor.req.body.sensorId;
    console.log(sensor.req.body)
    next()
  });

};
