const mongoose = require("mongoose");
const { userSchema } = require("./user");
const { instSchema } = require('./insts')

const clientSchema = new mongoose.Schema({
  clientName: {
    type: String,
  },
  users: [userSchema],
  inst: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inst'
    }
  ]
});


const Client = mongoose.model("Client", clientSchema);
module.exports = Client ; 











