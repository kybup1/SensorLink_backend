'use strict';

module.exports = function(app, cb) {
  /*
   * The `app` object provides access to a variety of LoopBack resources such as
   * models (e.g. `app.models.YourModelName`) or data sources (e.g.
   * `app.datasources.YourDataSource`). See
   * https://loopback.io/doc/en/lb3/Working-with-LoopBack-objects.html
   * for more info.
   */
  Promise.all([app.models.Patient.destroyAll(), app.models.SensorInstance.destroyAll()]).then((res) => {
    let readingDerG = new app.models.Reading({
      "sensorType":"DerGerät",
      "measurement":"Schwitzt",
      "Unit":"Nie?"
    });
    let readingDerG2 = new app.models.Reading({
      "sensorType":"DerGerät",
      "measurement":"Müde",
      "Unit":"Nie?"
    });
    let derGeraet = app.models.SensorInstance.create({
      "sensorIdentifier":"DerGerätMessgerät-1",
      "sensorType":"DerGerätMessgerät",
      "sensorId":"1",
      "readings":[
        readingDerG,
        readingDerG2
      ]
    });

    let misterTest = app.models.Patient.create({
      "patId":"12",
      "firstname":"Julio",
      "lastname":"Testo",
      "birthdate":new Date("1958-04-17T08:08")
    }).then(misterTest => {
      let misterTestLinkedGeraet = new app.models.LinkedSensor({
        "altPatIdentifier": "1234",
        "sensor": derGeraet.sensorIdentifier,
        "from": "2019-04-15T08:00Z",
        "isConnected": true,
        "dataAccess": {},
      })
      misterTest.linkedSensors.push(misterTestLinkedGeraet)
      return misterTest
    }).then(misterTest =>{
      misterTest.save()
      app.models.SensorInstance.findById("DerGerätMessgerät-1").then(sensor => {
        sensor.linkedPatId=misterTest.patId;
        sensor.save()
      })
    })

  }).catch(err => {console.log(err)})

  process.nextTick(cb); // Remove if you pass `cb` to an async function yourself
};
