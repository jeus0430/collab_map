const mongoose = require("mongoose"); 

const uri =
  'mongodb+srv://divya12:Puneet12@cluster0.fbxaa.mongodb.net/test';

module.exports = mongoose.connect(uri,{
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
 .then(()=> console.log(` ++ connected to mongo ++`))
 .catch((err)=> console.error(`Could not connect to mongo`, err))