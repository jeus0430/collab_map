const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");


const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 50,
  },
  email: {
    type: String,
    unique: true,
    minlength: 7,
    maxlength: 50,
  },
  password: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 1024, 
  }, 
  color: {
    type: String
  }

});

userSchema.methods.generateAuthToken = function(clientName ) {
  const token = jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
      clientName: clientName
    },
    'mapcollaboration' 
  );
  return token;
};


const User = mongoose.model("User", userSchema);

module.exports = {  User , userSchema };
