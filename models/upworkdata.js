const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const UpworkDataSchema = new Schema({
  date: {
    type: String
  },
  year: {
    type: Number
  },
  quarter: {
    type: Number
  },
  month: {
    type: Number
  },
  team: {
    type: String
  },
  name: {
    type: String
  },
  username: {
    type: String
  },
  agency: {
    type: String,
    allowNull: true
  },
  contract: {
    type: String
  },
  activity: {
    type: String,
    allowNull: true
  },
  activitydescription: {
    type: String,
    allowNull: true
  },
  type: {
    type: String
  },
  totalhours: {
    type: Number
  },
  manualhours: {
    type: Number
  },
  totalcharges: {
    type: Number
  },
  manualcharges: {
    type: Number
  },
  userId: {
    type: Number
  }
});

const UpworkData = mongoose.model("UpworkData", UpworkDataSchema);

module.exports = UpworkData;
