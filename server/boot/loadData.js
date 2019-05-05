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
    console.log(new Date())
    let readingPulse = new app.models.Reading({
      "sensorType":"Everion",
      "measurementString":"Puls",
      "measurementCode":[{
        "code":"8867-4",
        "system":'loinc',
        "display":"Heartrate"
      }],
      "Unit":"/min"
    });
    let readingSaturation = new app.models.Reading({
      "sensorType":"everion",
      "measurementString":"Sauerstoffsättigung",
      "measurementCode":[{
        "code":"20564-1",
        "system":'loinc',
        "display":"Oxygen saturation"
      }],
      "Unit":"%"
    });
    let sensor = app.models.SensorInstance.create({
      "sensorIdentifier":"everion-1",
      "sensorType":"everion",
      "sensorId":"1",
      "manufacturer":"Biovotion",
      "readings":[
        readingPulse,
        readingSaturation
      ]
    });

    app.models.Patient.create({
      "patId":"12",
      "firstname":"Julio",
      "lastname":"Testo",
      "birthdate":new Date("1958-04-17T08:08")
    }).then(misterTest => {
      let misterTestLinkedGeraet = new app.models.LinkedSensor({
        "altPatIdentifier": "1234",
        "sensor": "everion-1",
        "from": subtractFromNow(1, 3, 0, 0),
        "isConnected": true,
        "dataAccess": {},
      })
      misterTestLinkedGeraet.savedData = misterTestLinkedGeraet.savedData.concat([
        {"sensor":"everion-1","timestamp":subtractFromNow(1, 1, 30, 50),"value":"80","reading":readingPulse},
        {"sensor":"everion-1","timestamp":subtractFromNow(1, 1, 30, 5),"value":"85","reading":readingPulse},
        {"sensor":"everion-1","timestamp":subtractFromNow(1, 1, 28, 20),"value":"90","reading":readingPulse},
        {"sensor":"everion-1","timestamp":subtractFromNow(1, 1, 27, 30),"value":"91","reading":readingPulse},
        {"sensor":"everion-1","timestamp":subtractFromNow(1, 1, 36, 40),"value":"90","reading":readingPulse},
        {"sensor":"everion-1","timestamp":subtractFromNow(1, 1, 26, 0),"value":"86","reading":readingPulse}
      ])
      misterTest.linkedSensors.push(misterTestLinkedGeraet)
      misterTest.lastMeasurementEntry = subtractFromNow(1, 1, 26, 0);
      return misterTest
    }).then(misterTest =>{
      misterTest.save()
      app.models.SensorInstance.findById("everion-1").then(sensor => {
        sensor.linkedPatId=misterTest.patId;
        sensor.save()
      })
    })


    app.models.Patient.create({
      "patId":"10",
      "firstname":"Hans",
      "lastname":"Muster",
      "birthdate":new Date("1966-03-20")
    }).then(testPat2 => {
      let TestPat2LinkedSensor = new app.models.LinkedSensor({
        "altPatIdentifier": "1234",
        "sensor": "everion-1",
        "from": subtractFromNow(10, 3, 0, 0),
        "to":subtractFromNow(7, 0, 0, 0),
        "isConnected": false,
        "dataAccess": {},
      })
      TestPat2LinkedSensor.savedData = TestPat2LinkedSensor.savedData.concat([
        {"sensor":"everion-1","timestamp":subtractFromNow(10, 1, 30, 50),"value":"80","reading":readingPulse},
        {"sensor":"everion-1","timestamp":subtractFromNow(10, 1, 30, 5),"value":"85","reading":readingPulse},
        {"sensor":"everion-1","timestamp":subtractFromNow(10, 1, 28, 20),"value":"90","reading":readingPulse},
        {"sensor":"everion-1","timestamp":subtractFromNow(10, 1, 27, 30),"value":"91","reading":readingPulse},
        {"sensor":"everion-1","timestamp":subtractFromNow(10, 1, 36, 40),"value":"90","reading":readingPulse},
        {"sensor":"everion-1","timestamp":subtractFromNow(10, 1, 26, 0),"value":"86","reading":readingPulse},
        {"sensor":"everion-1","timestamp":subtractFromNow(10, 1, 30, 50),"value":"96","reading":readingSaturation},
        {"sensor":"everion-1","timestamp":subtractFromNow(10, 1, 30, 5),"value":"98","reading":readingSaturation},
        {"sensor":"everion-1","timestamp":subtractFromNow(10, 1, 28, 20),"value":"97","reading":readingSaturation},
        {"sensor":"everion-1","timestamp":subtractFromNow(10, 1, 27, 30),"value":"98","reading":readingSaturation},
        {"sensor":"everion-1","timestamp":subtractFromNow(10, 1, 36, 40),"value":"95","reading":readingSaturation},
        {"sensor":"everion-1","timestamp":subtractFromNow(10, 1, 26, 0),"value":"98","reading":readingSaturation}
      ])
      testPat2.linkedSensors.push(TestPat2LinkedSensor);
      testPat2.lastMeasurementEntry = subtractFromNow(10, 1, 26, 0);
      return testPat2
    }).then(testPat2 =>{
      testPat2.save()
    })

  }).catch(err => {console.log(err)})

  process.nextTick(cb); // Remove if you pass `cb` to an async function yourself
};

let subtractFromNow = function(days, hours, minutes, seconds) {
  let date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(date.getHours() - hours);
  date.setMinutes(date.getMinutes() - minutes);
  date.setSeconds(date.getSeconds() -seconds);
  return date;
}
