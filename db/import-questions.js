// var fs = require("fs");
// var csv = require("csv");
// var db = require("../models");

// let countErr = 0;
// var upworkResults = [];

// var input2 = fs.createReadStream("./db/csv/upwork-data.csv");
// var parser = csv.parse({
//   // what to parse by
//   delimiter: ",",
//   // object literals instead of arrays
//   columns: true
// });

// var transform = csv.transform(function(row) {
//   var resultObj = {
//     date: row.Date,
//     year: row.Year,
//     month: row.Month,
//     team: row.Team,
//     name: row.FreelanceName,
//     username: row.Username,
//     agency: row.Agency,
//     contractName: row.Contract,
//     activity: row.Activity,
//     activitydescription: row.ActivityDescription,
//     contractType: row.Type,
//     totalHours: row.TotalHours,
//     manualHours: row.ManualHours,
//     totalCharges: row.TotalCharges,
//     manualCharges: row.ManualCharges,
//     userId: row.userId
//   };
//   db.Questions.create(resultObj)
//     .then(function() {
//       // console.log('Record created')
//     })
//     .catch(function() {
//       countErr++;
//       // console.log('Error encountered: ' + err)
//     });
// });

// input2
// .pipe(parser)
// .on('data', (data) => {upworkResults.push(data)})
// .on('end', () => {
//   console.log(`Upwork array created!`)
// .then(function() {
// });
// });

// module.export = upworkResults;