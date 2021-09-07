const express = require('express'); 
const client = require('../routes/client')
const collaborate = require('../routes/collaborate')
const cors = require('cors'); 


module.exports = function(app) {
    app.use(cors());
    app.use(express.json());
    // app.use(cors({origin: true}))
    app.use('/client', client)
    app.use('/collaborate', collaborate)
}