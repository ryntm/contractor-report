// Requiring necessary npm packages
var express = require("express");
var session = require("express-session");
const logger = require("morgan");
const mongoose = require("mongoose");
var fs = require("fs");
var csv = require("csv");


// Setting up port and requiring models for syncing
var PORT = process.env.PORT || 8080;
var db = require("./models")
// var Gigs = require("./models/gigdata");
// var Upwork = require("./models/upworkdata");

var input = fs.createReadStream("./db/csv/admin-gig-data.csv");
var input2 = fs.createReadStream("./db/csv/upwork-data.csv");
var parser = csv.parse({
  // what to parse by
  delimiter: ",",
  // object literals instead of arrays
  columns: true
});
var parser2 = csv.parse({
  // what to parse by
  delimiter: ",",
  // object literals instead of arrays
  columns: true
});

//setting arrays for gig and upwork csv parser results.
var results = [];
var upworkResults = [];

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost/contractordb", { useNewUrlParser: true });

//console when the mongodb is connected
const connection = mongoose.connection;


connection.once('open', () => {
  console.log('MongoDB connection successful.')
  //here to 
  connection.db.listCollections().toArray((err, names) => {
    if (err) {
      console.log(`Error encountered: ${err}`);
    } else {
        db.GigData.remove((err, res) => {
          if (err) {
            console.log(err) 
          } else {
            console.log(`gigdatas collection was dropped.`)
            // gig data
          input
          .pipe(parser)
          .on('data', (data) => {results.push(data)})
          .on('end', () => {
              db.GigData.create(results)
              .then(res => {
                console.log(`${results.length} documents added to gigdatas collection`)
              })
              .catch(({ message }) => {
                console.log(message);
              });
            });
          }
        })
        db.UpworkData.remove((err, res) => {
          if (err) {
            console.log(err) 
          } else {
            console.log(`upworkdatas collection was dropped.`)
            //upwork data
            input2
            .pipe(parser2)
            .on('data', (data2) => {upworkResults.push(data2);})
            .on('end', () => {
                db.UpworkData.create(upworkResults)
                .then(res => {
                  console.log(`${upworkResults.length} documents added to upworkdatas collection`)
                })
                .catch(({ message }) => {
                  console.log(message);
                });
              });
          }
        })
    }
  })
  // here to not import
})

//importing data from csvs





// Creating express app
var app = express();
app.use(logger("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname + "/public"));

var exphbs = require("express-handlebars");

// boilerplate for getting handlebares to work
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

app.get('/api', (req, res) => {
  db.GigData.find({}).limit(100)
    .then(data => {
      res.json(data)
    })
    .catch(err => {
      res.json(err)
    })
})

app.get('/:year', (req, res) => {
  db.GigData.aggregate([
    { "$match": { submitted_year: parseInt(req.params.year) }},
    { $group: { _id: "$type", distinctCount: { $sum: 1 }} },
    { $sort: {"distinctCount": -1 } }
  ]
    , (err, data) => {
    if (err) {
      console.log(err);
    } else 
    res.render('index', { data: data });
  });
});

// degree by year render
app.get('/year/:year/degreecollection', (req, res) => {
  db.GigData.aggregate([
    { "$match": { submitted_year: parseInt(req.params.year), type: "Gig::DegreeCollection" }},
    { $group: { _id: "$oc_name", distinctCount: { $sum: 1 }} },
    { $sort: {"distinctCount": -1 } }
  ]
    , (err, data) => {
    if (err) {
      console.log(err);
    } else 
    res.render('degreecollection', { data: data });
  });
});

// degree by year api
app.get('/api//year/:year/degreecollection', (req, res) => {
  db.GigData.aggregate([
    { "$match": { submitted_year: parseInt(req.params.year), type: "Gig::DegreeCollection" }},
    { $lookup: {
      from: "upworkdatas",
      let: { gig_user_id: "$owner_id"},
      pipeline: [
        { "$match": 
        { 
          $and: [
              { year: parseInt(req.params.year), activity: "MegaDegreeCollection" }
              ,
              { $expr: { $eq: ["$userId", "$$gig_user_id" ] } }
            ]
          }
      }
      ],
      as: "upworkData"
    }},
    { $group: { _id: "$oc_name", totalcharges: { $first: { $sum:"$upworkData.totalcharges"}}, distinctCount: { $sum: 1 } } }
  ]
    , (err, data) => {
    if (err) {
      console.log(err);
    } else 
    res.json(data);
  });
});

//degree by month render
app.get('/year/:year/month/:month/degreecollection', (req, res) => {
  db.GigData.aggregate([
    { "$match": { submitted_year: parseInt(req.params.year), submitted_month: parseInt(req.params.month), type: "Gig::DegreeCollection" }},
    { $lookup: {
      from: "upworkdatas",
      let: { gig_user_id: "$owner_id"},
      pipeline: [
        { "$match": 
        { 
          $and: [
              { year: parseInt(req.params.year), month: parseInt(req.params.month), activity: "MegaDegreeCollection" }
              ,
              { $expr: { $eq: ["$userId", "$$gig_user_id" ] } }
            ]
          }
      }
      ],
      as: "upworkData"
    }},
    { $group: { _id: "$owner_id", 
    name: { $first: "$oc_name"},
    totalhours: { $first: { $sum: "$upworkData.totalhours"}}, 
    totalcharges: { $first: { $sum: "$upworkData.totalcharges"}}, 
    degree_gig_count: { $sum: "$degree_gig_count"},
    distinctCount: { $sum: 1 } } 
    },
    { $sort: {"distinctCount": -1 } }

  ]
    , (err, data) => {
    if (err) {
      console.log(err);
    } else 
    console.log(data)
    res.render('degreecollection', { data: data, date: {year: req.params.year, month: req.params.month}, type: { type: "degreecollection"}});
  });
});

// degree by month api
app.get('/api/year/:year/month/:month/degreecollection', (req, res) => {
  db.GigData.aggregate([
    { "$match": { submitted_year: parseInt(req.params.year), submitted_month: parseInt(req.params.month), type: "Gig::DegreeCollection" }},
    { $lookup: {
      from: "upworkdatas",
      let: { gig_user_id: "$owner_id"},
      pipeline: [
        { "$match": 
        { 
          $and: [
              { year: parseInt(req.params.year), month: parseInt(req.params.month), activity: "MegaDegreeCollection" }
              ,
              { $expr: { $eq: ["$userId", "$$gig_user_id" ] } }
            ]
          }
      }
      ],
      as: "upworkData"
    }},
    { $group: { _id: "$owner_id", 
    name: { $first: "$oc_name"},
    totalhours: { $first: { $sum: "$upworkData.totalhours"}}, 
    totalcharges: { $first: { $sum: "$upworkData.totalcharges"}}, 
    degree_gig_count: { $sum: "$degree_gig_count"},
    distinctCount: { $sum: 1 } } 
    },
    { $sort: {"distinctCount": -1 } }

  ]
    , (err, data) => {
    if (err) {
      console.log(err);
    } else 
    res.json(data);
  });
});

// degree by quarter render
app.get('/year/:year/quarter/:quarter/degreecollection', (req, res) => {
  db.GigData.aggregate([
    { "$match": { submitted_year: parseInt(req.params.year), submitted_quarter: parseInt(req.params.quarter), type: "Gig::DegreeCollection" }},
    { $lookup: {
      from: "upworkdatas",
      let: { gig_user_id: "$owner_id"},
      pipeline: [
        { "$match": 
        { 
          $and: [
              { year: parseInt(req.params.year), quarter: parseInt(req.params.quarter), activity: "MegaDegreeCollection" }
              ,
              { $expr: { $eq: ["$userId", "$$gig_user_id" ] } }
            ]
          }
      }
      ],
      as: "upworkData"
    }},
    { $group: { _id: "$owner_id", 
    name: { $first: "$oc_name"},
    totalhours: { $first: { $sum: "$upworkData.totalhours"}}, 
    totalcharges: { $first: { $sum: "$upworkData.totalcharges"}}, 
    degree_gig_count: { $sum: "$degree_gig_count"},
    distinctCount: { $sum: 1 } } 
    },
    { $sort: {"degree_gig_count": -1 } }

  ]
    , (err, data) => {
    if (err) {
      console.log(err);
    } else 
    console.log(data)
    res.render('degreecollection', { data: data, date: {year: req.params.year, quarter: req.params.quarter}, type: { type: "degreecollection"}});
  });
});

// degree by quarter api
app.get('/api/year/:year/quarter/:quarter/degreecollection', (req, res) => {
  db.GigData.aggregate([
    { "$match": { submitted_year: parseInt(req.params.year), submitted_quarter: parseInt(req.params.quarter), type: "Gig::DegreeCollection" }},
    { $lookup: {
      from: "upworkdatas",
      let: { gig_user_id: "$owner_id"},
      pipeline: [
        { "$match": 
        { 
          $and: [
              { year: parseInt(req.params.year), quarter: parseInt(req.params.quarter), activity: "MegaDegreeCollection" }
              ,
              { $expr: { $eq: ["$userId", "$$gig_user_id" ] } }
            ]
          }
      }
      ],
      as: "upworkData"
    }},
    { $group: { _id: "$owner_id", 
    name: { $first: "$oc_name"},
    totalhours: { $first: { $sum: "$upworkData.totalhours"}}, 
    totalcharges: { $first: { $sum: "$upworkData.totalcharges"}}, 
    degree_gig_count: { $sum: "$degree_gig_count"},
    distinctCount: { $sum: 1 } } 
    },
    { $sort: {"distinctCount": -1 } }

  ]
    , (err, data) => {
    if (err) {
      console.log(err);
    } else 
    res.json(data);
  });
});

// tuition by year render
app.get('/year/:year/tuitioncollection', (req, res) => {
  db.GigData.aggregate([
    { "$match": { submitted_year: parseInt(req.params.year), type: "Gig::CollegeTuitionCollection" }},
    { $group: { _id: "$oc_name", distinctCount: { $sum: 1 }} },
    { $sort: {"distinctCount": -1 } }
  ]
    , (err, data) => {
    if (err) {
      console.log(err);
    } else 
    res.render('tuitioncollection', { data: data, date: {year: req.params.year }});
  });
});

//tuition by month render
app.get('/year/:year/month/:month/tuitioncollection', (req, res) => {
  db.GigData.aggregate([
    { "$match": { submitted_year: parseInt(req.params.year), submitted_month: parseInt(req.params.month), type: "Gig::CollegeTuitionCollection" }},
    { $lookup: {
      from: "upworkdatas",
      let: { gig_user_id: "$owner_id"},
      pipeline: [
        { "$match": 
        { 
          $and: [
              { year: parseInt(req.params.year), month: parseInt(req.params.month), activity: "CollegeTuition" }
              ,
              { $expr: { $eq: ["$userId", "$$gig_user_id" ] } }
            ]
          }
      }
      ],
      as: "upworkData"
    }},
    { $group: { _id: "$owner_id", 
    name: { $first: "$oc_name"},
    totalhours: { $first: { $sum: "$upworkData.totalhours"}}, 
    totalcharges: { $first: { $sum: "$upworkData.totalcharges"}}, 
    tuition_degree_count: { $sum: "$tuition_degree_count"},
    distinctCount: { $sum: 1 } } 
    },
    { $sort: {"distinctCount": -1 } }

  ]
    , (err, data) => {
    if (err) {
      console.log(err);
    } else 
    console.log(data)
    res.render('tuitioncollection', { data: data, date: {year: req.params.year, month: req.params.month}, type: { type: "tuitioncollection"}});
  });
});

//tuition by month api
app.get('/api/year/:year/month/:month/tuitioncollection', (req, res) => {
  db.GigData.aggregate([
    { "$match": { submitted_year: parseInt(req.params.year), submitted_month: parseInt(req.params.month), type: "Gig::CollegeTuitionCollection" }},
    { $lookup: {
      from: "upworkdatas",
      let: { gig_user_id: "$owner_id"},
      pipeline: [
        { "$match": 
        { 
          $and: [
              { year: parseInt(req.params.year), month: parseInt(req.params.month), activity: "CollegeTuition" }
              ,
              { $expr: { $eq: ["$userId", "$$gig_user_id" ] } }
            ]
          }
      }
      ],
      as: "upworkData"
    }},
    { $group: { _id: "$owner_id", 
    name: { $first: "$oc_name"},
    totalhours: { $first: { $sum: "$upworkData.totalhours"}}, 
    totalcharges: { $first: { $sum: "$upworkData.totalcharges"}}, 
    tuition_degree_count: { $sum: "$tuition_degree_count"},
    distinctCount: { $sum: 1 } } 
    },
    { $sort: {"distinctCount": -1 } }

  ]
    , (err, data) => {
    if (err) {
      console.log(err);
    } else 
    res.json(data);
  });
});

// tuition by quarter render
app.get('/year/:year/quarter/:quarter/tuitioncollection', (req, res) => {
  db.GigData.aggregate([
    { "$match": { submitted_year: parseInt(req.params.year), submitted_quarter: parseInt(req.params.quarter), type: "Gig::CollegeTuitionCollection" }},
    { $lookup: {
      from: "upworkdatas",
      let: { gig_user_id: "$owner_id"},
      pipeline: [
        { "$match": 
        { 
          $and: [
              { year: parseInt(req.params.year), quarter: parseInt(req.params.quarter), activity: "CollegeTuition" }
              ,
              { $expr: { $eq: ["$userId", "$$gig_user_id" ] } }
            ]
          }
      }
      ],
      as: "upworkData"
    }},
    { $group: { _id: "$owner_id", 
    name: { $first: "$oc_name"},
    totalhours: { $first: { $sum: "$upworkData.totalhours"}}, 
    totalcharges: { $first: { $sum: "$upworkData.totalcharges"}}, 
    tuition_degree_count: { $sum: "$tuition_degree_count"},
    distinctCount: { $sum: 1 } } 
    },
    { $sort: {"distinctCount": -1 } }

  ]
    , (err, data) => {
    if (err) {
      console.log(err);
    } else 
    console.log(data)
    res.render('tuitioncollection', { data: data, date: {year: req.params.year, quarter: req.params.quarter}, type: { type: "tuitioncollection"}});
  });
});

// tuition by quarter api
app.get('/api/year/:year/quarter/:quarter/tuitioncollection', (req, res) => {
  db.GigData.aggregate([
    { "$match": { submitted_year: parseInt(req.params.year), submitted_quarter: parseInt(req.params.quarter), type: "Gig::CollegeTuitionCollection" }},
    { $lookup: {
      from: "upworkdatas",
      let: { gig_user_id: "$owner_id"},
      pipeline: [
        { "$match": 
        { 
          $and: [
              { year: parseInt(req.params.year), quarter: parseInt(req.params.quarter), activity: "CollegeTuition" }
              ,
              { $expr: { $eq: ["$userId", "$$gig_user_id" ] } }
            ]
          }
      }
      ],
      as: "upworkData"
    }},
    { $group: { _id: "$owner_id", 
    name: { $first: "$oc_name"},
    totalhours: { $first: { $sum: "$upworkData.totalhours"}}, 
    totalcharges: { $first: { $sum: "$upworkData.totalcharges"}}, 
    tuition_degree_count: { $sum: "$tuition_degree_count"},
    distinctCount: { $sum: 1 } } 
    },
    { $sort: {"distinctCount": -1 } }

  ]
    , (err, data) => {
    if (err) {
      console.log(err);
    } else 
    res.json(data);
  });
});



app.get('/gigtypes', (req, res) => {
  db.GigData.aggregate(
    [
      // { "$match": { "type": { "$ne": null }} },

    { $group: { _id: "$type", distinctCount: { $sum: 1 }} },
    { $sort: {"distinctCount": -1 } }
  ]
    , (err, data) => {
    if (err) {
      console.log(err);
    } else 
    res.render('index', { data: data })
  })
})

app.get('/gigtypes/:year', (req, res) => {
  let year = req.params.year;
  db.GigData.aggregate(
    [
    { $match: { "submitted_year": parseInt(year)} },

    { $group: { _id: "$type", distinctCount: { $sum: 1 }}} ,
    { $sort: {"distinctCount": -1 } }
  ]
    , (err, data) => {
    if (err) {
      console.log(err);
    } else 
    res.render('gigtypesyear', { data: data })
  })
})


app.listen(PORT, function() {
    // check if we need to import csv values and not run if it already exists
    // Import csv data after sequelize tables have been initialized




    // db.Questions.findAll().then(result => {
    //   if (result.length === 0) {
    //     require("./db/import-questions.js");
    //   }
    // });

    console.log(
      "==> Listening on port %s. Visit http://localhost:%s/",
      PORT,
      PORT
    );
  // });
});
