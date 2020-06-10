const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const GigDataOutreachSchema = new Schema({
  gigId: {
    type: Number
  },
  type: {
    type: String
  },
  submitted_on: {
    type: String
  },
  submitted_month: {
    type: Number
  },
  submitted_year: {
    type: Number
  },
  submitted_quarter: {
    type: Number
  },
  submitted_week: {
    type: Number
  },
  qa_submitted_on: {
    type: String
  },
  qa_submitted_month: {
    type: Number
  },
  qa_submitted_year: {
    type: Number
  },
  qa_submitted_quarter: {
    type: Number
  },
  qa_submitted_week: {
    type: Number
  },
  owner_id: {
    type: Number
  },
  oc_name: {
    type: String
  },
  qa_owner_id: {
    type: Number
  },
  qaer_name: {
    type: String
  },
  oc_guide_admin: {
    type: Boolean
  },
  qa_guide_admin: {
    type: Boolean
  },
  college_contacts_count: {
    type: Number
  },
  company_contacts_count: {
      type: Number
  },
  best_page_count: {
      type: Number
  },
  product_id: {
      type: String
  }
});

const GigDataOutreach = mongoose.model("GigDataOutreach", GigDataOutreachSchema);

module.exports = GigDataOutreach;
