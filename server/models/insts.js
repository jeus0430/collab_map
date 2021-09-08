const mongoose = require("mongoose")
const Client = require("./client.js")

const instSchema = new mongoose.Schema({
  instID: String,
  info: String,
  type: String,
  vicinity: String,
  center: String,
  name: String,
  desc: String,
  by: String,
  created: { type: Date, default: Date.now },
  tags: [{ type: String }],
})

const InstModel = mongoose.model("Inst", instSchema)
module.exports = { InstModel, instSchema }
