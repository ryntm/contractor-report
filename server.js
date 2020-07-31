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

var input = fs.createReadStream("./db/csv/admin-gig-data.csv");
var input2 = fs.createReadStream("./db/csv/upwork-data.csv");
var input3 = fs.createReadStream("./db/csv/outreach-gig-data.csv")
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
var parser3 = csv.parse({
  // what to parse by
  delimiter: ",",
  // object literals instead of arrays
  columns: true
});

//setting arrays for gig and upwork csv parser results.
var results = [];
var upworkResults = [];
var outreachResults = [];

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost/contractordb", { useNewUrlParser: true });

//console when the mongodb is connected
const connection = mongoose.connection;


connection.once('open', () => {
  console.log('MongoDB connection successful.')
  // here to 
  connection.db.listCollections().toArray((err, names) => {
    if (err) {
      console.log(`Error encountered: ${err}`);
    } else {
        db.GigData.deleteMany({}, (err, res) => {
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
        setTimeout(
          db.UpworkData.deleteMany({}, (err, res) => {
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
          , 120
          ) 
        setTimeOut(
          db.GigDataOutreach.deleteMany({}, (err, res) => {
            if (err) {
              console.log(err) 
            } else {
              console.log(`gigdatas-outreach collection was dropped.`)
              //outreach gig data
              input3
              .pipe(parser3)
              .on('data', (data3) => {outreachResults.push(data3);})
              .on('end', () => {
                db.GigDataOutreach.create(outreachResults)
                .then(res => {
                  console.log(`${outreachResults.length} documents added to gigdatas-outreach collection`)
                })
                .catch(({ message }) => {
                  console.log(message);
                });
              });
            }
          })
          , 120
          )
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

// home is current month's degree collection information
app.get('/', (req, res) => {
  let d = new Date();
  let month = d.getMonth() + 1;
  let year = d.getFullYear();
  console.log(month, year)
  db.GigData.aggregate([
    { "$match": { submitted_year: year, submitted_month: month, type: "Gig::DegreeCollection" }},
    { $lookup: {
      from: "upworkdatas",
      let: { gig_user_id: "$owner_id"},
      pipeline: [
        { "$match": 
        { 
          $and: [
              { year: parseInt(year), month: parseInt(month), activity: "MegaDegreeCollection" }
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
    res.render('degreecollection', { data: data, date: {year: year, month: month }, type: { type: "degreecollection"}});
  });
});

// app.get('/:year', (req, res) => {
//   db.GigData.aggregate([
//     { "$match": { submitted_year: parseInt(req.params.year) }},
//     { $group: { _id: "$type", distinctCount: { $sum: 1 }} },
//     { $sort: {"distinctCount": -1 } }
//   ]
//     , (err, data) => {
//     if (err) {
//       console.log(err);
//     } else 
//     res.render('index', { data: data });
//   });
// });

// degree by year render
// app.get('/year/:year/degreecollection', (req, res) => {
//   db.GigData.aggregate([
//     { "$match": { submitted_year: parseInt(req.params.year), type: "Gig::DegreeCollection" }},
//     { $group: { _id: "$oc_name", distinctCount: { $sum: 1 }} },
//     { $sort: {"distinctCount": -1 } }
//   ]
//     , (err, data) => {
//     if (err) {
//       console.log(err);
//     } else 
//     res.render('degreecollection', { data: data });
//   });
// });

// // degree by year api
// app.get('/api/year/:year/degreecollection', (req, res) => {
//   db.GigData.aggregate([
//     { "$match": { submitted_year: parseInt(req.params.year), type: "Gig::DegreeCollection" }},
//     { $lookup: {
//       from: "upworkdatas",
//       let: { gig_user_id: "$owner_id"},
//       pipeline: [
//         { "$match": 
//         { 
//           $and: [
//               { year: parseInt(req.params.year), activity: "MegaDegreeCollection" }
//               ,
//               { $expr: { $eq: ["$userId", "$$gig_user_id" ] } }
//             ]
//           }
//       }
//       ],
//       as: "upworkData"
//     }},
//     { $group: { _id: "$oc_name", totalcharges: { $first: { $sum:"$upworkData.totalcharges"}}, distinctCount: { $sum: 1 } } }
//   ]
//     , (err, data) => {
//     if (err) {
//       console.log(err);
//     } else 
//     res.json(data);
//   });
// });

//degree by month render
app.get('/year/:year/month/:month/degreecollection', (req, res) => {
  db.GigData.aggregate([
    { "$match": { submitted_year: parseInt(req.params.year), submitted_month: parseInt(req.params.month), type: "Gig::DegreeCollection" }}
    ,
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
    } else {
      console.log(data)
      db.GigData.aggregate([
        { "$match": { qa_submitted_year: parseInt(req.params.year), qa_submitted_month: parseInt(req.params.month), type: "Gig::DegreeCollection" }},
        { $lookup: {
          from: "upworkdatas",
          let: { gig_user_id: "$qa_owner_id"},
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
        { $group: { _id: "$qa_owner_id", 
        name: { $first: "$qaer_name"},
        totalhours: { $first: { $sum: "$upworkData.totalhours"}}, 
        totalcharges: { $first: { $sum: "$upworkData.totalcharges"}}, 
        degree_gig_count: { $sum: "$degree_gig_count"},
        distinctCount: { $sum: 1 } } 
        },
        { $sort: {"distinctCount": -1 } }
    
      ]
        , (err, qa_data) => {
        if (err) {
          console.log(err);
        } else {
          
        }
        console.log(qa_data)
        res.render('degreecollection', { data: data, qa_data: qa_data, date: {year: req.params.year, month: req.params.month}, type: { type: "degreecollection"}});
      });
    }
  });
});

// degree by month api
app.get('/api/year/:year/month/:month/degreecollection', (req, res) => {
  // degree by month - submitted data
  db.GigData.aggregate([
    { "$match": { submitted_year: parseInt(req.params.year), submitted_month: parseInt(req.params.month), type: "Gig::DegreeCollection" }}
    ,
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
    } else {
      // degree by month - qa_submitted data
      db.GigData.aggregate([
        { "$match": { qa_submitted_year: parseInt(req.params.year), qa_submitted_month: parseInt(req.params.month), type: "Gig::DegreeCollection" }},
        { $lookup: {
          from: "upworkdatas",
          let: { gig_user_id: "$qa_owner_id"},
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
        { $group: { _id: "$qa_owner_id", 
        name: { $first: "$qaer_name"},
        totalhours: { $first: { $sum: "$upworkData.totalhours"}}, 
        totalcharges: { $first: { $sum: "$upworkData.totalcharges"}}, 
        degree_gig_count: { $sum: "$degree_gig_count"},
        distinctCount: { $sum: 1 } } 
        },
        { $sort: {"distinctCount": -1 } }
    
      ]
        , (err, qa_data) => {
        if (err) {
          console.log(err);
        } 
        console.log(qa_data)
        let dataArray = [data, qa_data]
        res.json(dataArray);
      });
    }
    // console.log(data)
    // res.render('degreecollection', { data: data, date: {year: req.params.year, month: req.params.month}, type: { type: "degreecollection"}});
  });
});

// degree by quarter render
app.get('/year/:year/quarter/:quarter/degreecollection', (req, res) => {
  // degree by quarter - submitted data
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
    } else {
      db.GigData.aggregate([
        { "$match": { qa_submitted_year: parseInt(req.params.year), qa_submitted_quarter: parseInt(req.params.quarter), type: "Gig::DegreeCollection" }},
        { $lookup: {
          from: "upworkdatas",
          let: { gig_user_id: "$qa_owner_id"},
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
        { $group: { _id: "$qa_owner_id", 
        name: { $first: "$qaer_name"},
        totalhours: { $first: { $sum: "$upworkData.totalhours"}}, 
        totalcharges: { $first: { $sum: "$upworkData.totalcharges"}}, 
        degree_gig_count: { $sum: "$degree_gig_count"},
        distinctCount: { $sum: 1 } } 
        },
        { $sort: {"distinctCount": -1 } }
    
      ]
        , (err, qa_data) => {
        if (err) {
          console.log(err);
        } else {
      // degree by quarter - qa_submitted data over all. 
      db.GigData.aggregate([
        { "$match": { $or: [
          { $and: [
            { qa_submitted_year: { $gt: 0 } }, 
            { qa_submitted_year: { $lte: parseInt(req.params.year)-1 } }, 
            {type: "Gig::DegreeCollection" }
          ]}
          ,
          { $and: [
            { qa_submitted_year: parseInt(req.params.year) }, 
            { qa_submitted_quarter: { $lte: parseInt(req.params.quarter) }}, 
            {type: "Gig::DegreeCollection" }
          ]}
        ]}
      }
      ,
      { $group: {
        _id: 0,
        totalQAGigsCurrentYear: { $sum: 1 },
        totalQADegreesCurrentYear: { $sum: "$degree_gig_count"}
      }}
    ], (err, qa_data_total_current_year) => {
          if (err) {
            console.log(err);
          } else {
          // degree by quarter - submitted data
          db.GigData.aggregate([
            { "$match": { $or: [
              { $and: [
                { submitted_year: { $gt: 0 } }, 
                { submitted_year: { $lte: parseInt(req.params.year)-1 } }, 
                {type: "Gig::DegreeCollection" }
              ]}
              ,
              { $and: [
                { submitted_year: parseInt(req.params.year) }, 
                { submitted_quarter: { $lte: parseInt(req.params.quarter) }}, 
                {type: "Gig::DegreeCollection" }
              ]}
            ]}
        }
        ,
        { $group: {
          _id: 0,
          totalGigsCurrentYear: { $sum: 1 },
          totalDegreesCurrentYear: { $sum: "$degree_gig_count"}
        }}
       ]
            , (err, data_total_current_year) => {
              if (err) {
                console.log(err);
              } else {
                // degree by quarter - qa submitted data from the previous year
                db.GigData.aggregate([
                  { "$match": { $or: [
                    { $and: [
                      { qa_submitted_year: { $gt: 0 } }, 
                      { qa_submitted_year: { $lte: parseInt(req.params.year)-2 } }, 
                      {type: "Gig::DegreeCollection" }
                    ]}
                    ,
                    { $and: [
                      { qa_submitted_year: parseInt(req.params.year-1) }, 
                      { qa_submitted_quarter: { $lte: parseInt(req.params.quarter) }}, 
                      {type: "Gig::DegreeCollection" }
                    ]}
                ]}}
                ,
                { $group: {
                  _id: 0,
                  totalGigsPreviousYear: { $sum: 1 },
                  totalDegreesPreviousYear: { $sum: "$degree_gig_count"}
                }}
              ], 
                (err, qa_data_total_previous_year) => {
                  if (err) {
                    console.log(err);
                  } else {
                    // degree by quarter - submitted data from the previous year
                    db.GigData.aggregate([
                      { "$match": { $or: [
                        { $and: [
                          { submitted_year: { $gt: 0 } }, 
                          { submitted_year: { $lte: parseInt(req.params.year)-2 } }, 
                          {type: "Gig::DegreeCollection" }
                        ]}
                        ,
                        { $and: [
                          { submitted_year: parseInt(req.params.year-1) }, 
                          { submitted_quarter: { $lte: parseInt(req.params.quarter) }}, 
                          {type: "Gig::DegreeCollection" }
                        ]}
                    ]}}
                    ,
                    { $group: {
                      _id: 0,
                      totalGigsPreviousYear: { $sum: 1 },
                      totalDegreesPreviousYear: { $sum: "$degree_gig_count"}
                    }}
                  ], 
                    (err, data_total_previous_year) => {
                      if (err) {
                        console.log(err);
                      } else {
                        // upwork data for this year
                        db.UpworkData.aggregate([
                          { "$match": { $or: [
                            { $and: [
                              { year: { $gt: 0 } }, 
                              { year: { $lte: parseInt(req.params.year)-1 } }, 
                              { activity: "MegaDegreeCollection" }
                            ]}
                            ,
                            { $and: [
                              { year: parseInt(req.params.year) }, 
                              { quarter: { $lte: parseInt(req.params.quarter) }}, 
                              { activity: "MegaDegreeCollection" }
                            ]}
                        ]}}
                        ,
                        { $group: {
                          _id: 0,
                          totalCharges: { $sum: "$totalcharges"}
                        }}
                      ],
                        (err, upwork_data_current_year) => {
                          if (err) {
                            console.log(err);
                          } else {
                          db.UpworkData.aggregate([
                            { "$match": { $or: [
                              { $and: [
                                { year: { $gt: 0 } }, 
                                { year: { $lte: parseInt(req.params.year)-2 } }, 
                                { activity: "MegaDegreeCollection" }
                              ]}
                              ,
                              { $and: [
                                { year: parseInt(req.params.year)-1 }, 
                                { quarter: { $lte: parseInt(req.params.quarter) }}, 
                                { activity: "MegaDegreeCollection" }
                              ]}
                          ]}}
                          ,
                          { $group: {
                            _id: 0,
                            totalCharges: { $sum: "$totalcharges"}
                          }}
                        ],
                          (err, upwork_data_last_year) => {
                            if (err) {
                              console.log(err);
                            } else {
                              res.render('degreecollection', { 
                                data: data, 
                                qa_data: qa_data, 
                                data_total: data_total_current_year[0], 
                                qa_data_total: qa_data_total_current_year[0], 
                                data_total_previous_year: data_total_previous_year[0], 
                                qa_data_total_previous_year: qa_data_total_previous_year[0], 
                                upwork_data_current_year: upwork_data_current_year[0], 
                                upwork_data_last_year: upwork_data_last_year[0], 
                                type: { type: "degreecollection"}, 
                                date: {year: req.params.year, quarter: req.params.quarter}});
                          }
                          }
                          )
                      }
                      }
                      )
                  }
                  }
                  )
              }
              }
              )
          }
          }
          )
      }
      }
      )
  }
  }
  )

}
}
)

}
);


// degree by quarter api
app.get('/api/year/:year/quarter/:quarter/degreecollection', (req, res) => {
  // degree by quarter - submitted data
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
    } else {
      db.GigData.aggregate([
        { "$match": { qa_submitted_year: parseInt(req.params.year), qa_submitted_quarter: parseInt(req.params.quarter), type: "Gig::DegreeCollection" }},
        { $lookup: {
          from: "upworkdatas",
          let: { gig_user_id: "$qa_owner_id"},
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
        { $group: { _id: "$qa_owner_id", 
        name: { $first: "$qaer_name"},
        totalhours: { $first: { $sum: "$upworkData.totalhours"}}, 
        totalcharges: { $first: { $sum: "$upworkData.totalcharges"}}, 
        degree_gig_count: { $sum: "$degree_gig_count"},
        distinctCount: { $sum: 1 } } 
        },
        { $sort: {"distinctCount": -1 } }
    
      ]
        , (err, qa_data) => {
        if (err) {
          console.log(err);
        } else {
      // degree by quarter - qa_submitted data over all. 
      db.GigData.aggregate([
        { "$match": { $or: [
          { $and: [
            { qa_submitted_year: { $gt: 0 } }, 
            { qa_submitted_year: { $lte: parseInt(req.params.year)-1 } }, 
            {type: "Gig::DegreeCollection" }
          ]}
          ,
          { $and: [
            { qa_submitted_year: parseInt(req.params.year) }, 
            { qa_submitted_quarter: { $lte: parseInt(req.params.quarter) }}, 
            {type: "Gig::DegreeCollection" }
          ]}
        ]}
      }
      ,
      { $group: {
        _id: 0,
        totalQAGigsCurrentYear: { $sum: 1 },
        totalQADegreesCurrentYear: { $sum: "$degree_gig_count"}
      }}
    ], (err, qa_data_total_current_year) => {
          if (err) {
            console.log(err);
          } else {
          // degree by quarter - submitted data
          db.GigData.aggregate([
            { "$match": { $or: [
              { $and: [
                { submitted_year: { $gt: 0 } }, 
                { submitted_year: { $lte: parseInt(req.params.year)-1 } }, 
                {type: "Gig::DegreeCollection" }
              ]}
              ,
              { $and: [
                { submitted_year: parseInt(req.params.year) }, 
                { submitted_quarter: { $lte: parseInt(req.params.quarter) }}, 
                {type: "Gig::DegreeCollection" }
              ]}
            ]}
        }
        ,
        { $group: {
          _id: 0,
          totalGigsCurrentYear: { $sum: 1 },
          totalDegreesCurrentYear: { $sum: "$degree_gig_count"}
        }}
       ]
            , (err, data_total_current_year) => {
              if (err) {
                console.log(err);
              } else {
                // degree by quarter - qa submitted data from the previous year
                db.GigData.aggregate([
                  { "$match": { $or: [
                    { $and: [
                      { qa_submitted_year: { $gt: 0 } }, 
                      { qa_submitted_year: { $lte: parseInt(req.params.year)-2 } }, 
                      { type: "Gig::DegreeCollection" }
                    ]}
                    ,
                    { $and: [
                      { qa_submitted_year: parseInt(req.params.year-1) }, 
                      { qa_submitted_quarter: { $lte: parseInt(req.params.quarter) }}, 
                      { type: "Gig::DegreeCollection" }
                    ]}
                ]}}
                ,
                { $group: {
                  _id: 0,
                  totalGigsPreviousYear: { $sum: 1 },
                  totalDegreesPreviousYear: { $sum: "$degree_gig_count"}
                }}
              ], 
                (err, qa_data_total_previous_year) => {
                  if (err) {
                    console.log(err);
                  } else {
                    // degree by quarter - submitted data from the previous year
                    db.GigData.aggregate([
                      { "$match": { $or: [
                        { $and: [
                          { submitted_year: { $gt: 0 } }, 
                          { submitted_year: { $lte: parseInt(req.params.year)-2 } }, 
                          { type: "Gig::DegreeCollection" }
                        ]}
                        ,
                        { $and: [
                          { submitted_year: parseInt(req.params.year-1) }, 
                          { submitted_quarter: { $lte: parseInt(req.params.quarter) }}, 
                          { type: "Gig::DegreeCollection" }
                        ]}
                    ]}}
                    ,
                    { $group: {
                      _id: 0,
                      totalGigsPreviousYear: { $sum: 1 },
                      totalDegreesPreviousYear: { $sum: "$degree_gig_count"}
                    }}
                  ], 
                    (err, data_total_previous_year) => {
                      if (err) {
                        console.log(err);
                      } else {
                        // upwork data for this year
                        db.UpworkData.aggregate([
                          { "$match": { $or: [
                            { $and: [
                              { year: { $gt: 0 } }, 
                              { year: { $lte: parseInt(req.params.year)-1 } }, 
                              { activity: "MegaDegreeCollection" }
                            ]}
                            ,
                            { $and: [
                              { year: parseInt(req.params.year) }, 
                              { quarter: { $lte: parseInt(req.params.quarter) }}, 
                              { activity: "MegaDegreeCollection" }
                            ]}
                        ]}}
                        ,
                        { $group: {
                          _id: 0,
                          totalCharges: { $sum: "$totalcharges"}
                        }}
                      ],
                        (err, upwork_data_current_year) => {
                          if (err) {
                            console.log(err);
                          } else {
                          db.UpworkData.aggregate([
                            { "$match": { $or: [
                              { $and: [
                                { year: { $gt: 0 } }, 
                                { year: { $lte: parseInt(req.params.year)-2 } }, 
                                { activity: "MegaDegreeCollection" }
                              ]}
                              ,
                              { $and: [
                                { year: parseInt(req.params.year)-1 }, 
                                { quarter: { $lte: parseInt(req.params.quarter) }}, 
                                { activity: "MegaDegreeCollection" }
                              ]}
                          ]}}
                          ,
                          { $group: {
                            _id: 0,
                            totalCharges: { $sum: "$totalcharges"}
                          }}
                        ],
                          (err, upwork_data_last_year) => {
                            if (err) {
                              console.log(err);
                            } else {
                              res.json({ 
                                data: data, 
                                qa_data: qa_data, 
                                data_total: data_total_current_year[0], 
                                qa_data_total: qa_data_total_current_year[0], 
                                data_total_previous_year: data_total_previous_year[0], 
                                qa_data_total_previous_year: qa_data_total_previous_year[0], 
                                upwork_data_current_year: upwork_data_current_year[0], 
                                upwork_data_last_year: upwork_data_last_year[0], 
                                type: { type: { type: "degreecollection"}}, 
                                date: {year: req.params.year, quarter: req.params.quarter}});
                          }
                          }
                          )
                      }
                      }
                      )
                  }
                  }
                  )
              }
              }
              )
          }
          }
          )
      }
      }
      )
  }
  }
  )

}
}
)

}
);

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
    } else {
      db.GigData.aggregate([
      { "$match": { submitted_year: parseInt(req.params.year), qa_submitted_month: parseInt(req.params.month), type: "Gig::CollegeTuitionCollection", qa_submitted_month: { $ne: 0} }},
      { $lookup: {
        from: "upworkdatas",
        let: { gig_user_id: "$qa_owner_id"},
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
      { $group: { _id: "$qa_owner_id", 
      name: { $first: "$qaer_name"},
      totalhours: { $first: { $sum: "$upworkData.totalhours"}}, 
      totalcharges: { $first: { $sum: "$upworkData.totalcharges"}}, 
      tuition_degree_count: { $sum: "$tuition_degree_count"},
      distinctCount: { $sum: 1 } } 
      },
      { $sort: {"distinctCount": -1 } }
  
    ]
      , (err, qa_data) => {
      if (err) {
        console.log(err);
      } else {
        
      }
      console.log(qa_data)
      res.render('tuitioncollection', { data: data, qa_data: qa_data, date: {year: req.params.year, month: req.params.month}, type: { type: "tuitioncollection"}});
    });
  }
    // console.log(data)
    // res.render('tuitioncollection', { data: data, date: {year: req.params.year, month: req.params.month}, type: { type: "tuitioncollection"}});
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
      } else {
        db.GigData.aggregate([
          { "$match": { submitted_year: parseInt(req.params.year), qa_submitted_month: parseInt(req.params.month), type: "Gig::CollegeTuitionCollection", qa_submitted_month: { $ne: 0} }},
          { $lookup: {
            from: "upworkdatas",
            let: { gig_user_id: "$qa_owner_id"},
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
          { $group: { _id: "$qa_owner_id", 
          name: { $first: "$qaer_name"},
          totalhours: { $first: { $sum: "$upworkData.totalhours"}}, 
          totalcharges: { $first: { $sum: "$upworkData.totalcharges"}}, 
          tuition_degree_count: { $sum: "$tuition_degree_count"},
          distinctCount: { $sum: 1 } } 
          },
          { $sort: {"distinctCount": -1 } }
      
        ]
          , (err, qa_data) => {
          if (err) {
            console.log(err);
          } 
          console.log(qa_data)
          let dataArray = [data, qa_data]
          res.json(dataArray);
        });
      }
      // console.log(data)
      // res.render('degreecollection', { data: data, date: {year: req.params.year, month: req.params.month}, type: { type: "degreecollection"}});
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



// app.get('/gigtypes', (req, res) => {
//   db.GigData.aggregate(
//     [
//       // { "$match": { "type": { "$ne": null }} },

//     { $group: { _id: "$type", distinctCount: { $sum: 1 }} },
//     { $sort: {"distinctCount": -1 } }
//   ]
//     , (err, data) => {
//     if (err) {
//       console.log(err);
//     } else 
//     res.render('index', { data: data })
//   })
// })

// app.get('/gigtypes/:year', (req, res) => {
//   let year = req.params.year;
//   db.GigData.aggregate(
//     [
//     { $match: { "submitted_year": parseInt(year)} },

//     { $group: { _id: "$type", distinctCount: { $sum: 1 }}} ,
//     { $sort: {"distinctCount": -1 } }
//   ]
//     , (err, data) => {
//     if (err) {
//       console.log(err);
//     } else 
//     res.render('gigtypesyear', { data: data })
//   })
// })


app.listen(PORT, function() {
    console.log(
      "==> Listening on port %s. Visit http://localhost:%s/",
      PORT,
      PORT
    );
});
