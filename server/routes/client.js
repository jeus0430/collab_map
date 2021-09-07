const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const Client = require('../models/client');
// const Activities = require('../models/activities')
const { Inst, InstModel } = require('../models/insts')
const jwt = require('jsonwebtoken');
const { User } = require("../models/user")

router.post('/signup', async (req, res) => {
    
    const user = new User({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        color : Math.floor(Math.random() * 16777215).toString(16)
      });
    
      /* ===== to create new user with new CLIENT ======== 

    const clientData = {
        clientName: 'clientTwo',
        users: [user],
    };
    const client = new Client(clientData);
    client.save();
    res.send('new user created')
    */
    
    /* ==== add user === */ 

    await Client.findByIdAndUpdate(
        // client._id,
        '612bfe92121c139bdba43e64' , // include client id 
        {
          $push: {
            users: [user],
          },
        },
        { useFindAndModify: false }
    ); 
    
    res.send('new user created')
})

// http://localhost:5000/client/login

router.post('/login', async (req, res) => {

    const clients = await Client.findOne(
        { "users.username": req.body.username },
        { _id: 0, "users.$": 1 , "clientName":1, "subsCode":1 , "subsExpiry" : 1 }
    );
    if (!clients) return res.send({result: 'fail'});

    const user = clients.users[0];
    const originalToken = user.generateAuthToken('clientOne');

    // console.log('clients' , clients)
    const payload = {user: clients.users[0].username, password: clients.users[0].password, _id: clients.users[0]._id , clientName: clients.clientName};
    const secret = 'mapcollaboration';
    const options = { expiresIn: '2y'};
    const token = jwt.sign(payload, secret, options);


    res
    .header("x-auth-token", originalToken)
    .header("access-control-expose-headers", "x-auth-token")
    .send({result: 'success', token: token})
    
    /*
        Client.find(clientData)
            .then(clients => {
                if ( ! clients.length)
                    return res.send({result: 'fail'});
                const payload = {user: clients[0].username, password: clients[0].password, _id: clients[0]._id};
                const options = { expiresIn: '2h'};
                const secret = 'mapcollaboration';
                const token = jwt.sign(payload, secret, options);
                return res.send({result: 'success', token: token});
        });
    
    */
})


// http://localhost:5000/client/create
router.post('/create', async(req,res) => {

    const clientName = req.body.clientName ; 

    const clientData = {
        clientName : clientName
    };
    const client = new Client(clientData);
    await client.save();


    const names = await Client 
      .find()
    
    res.send(names)
})

router.get('/all' , async(req,res) => {
    const instances = await Inst.find({}, { '_id' : 1 })
    console.log('total instances left' , instances.length)
    res.send(instances)
})

router.get('/me', async(req,res) => {
    const decoded = jwt.verify(req.headers['x-auth-token'], 'mapcollaboration'); 
    res.send(decoded)
})



 
router.get('/create/session' , async(req,res) => {

    const userId = new mongoose.Types.ObjectId('612bfe4f8a85328bc0a38ad6')

    const resp = await Client.findOne(
        { "users._id": userId },
        {
          "users._id": 1,
          "users.username": 1,
          "_id":0
        }
    ).lean();

    // console.log(resp.users) 
    const validUserIds = resp.users.map((v) => { return v._id })
    const validUserNames = resp.users.map((v) => { return v.username })

    
    const token = jwt.sign(
        {
          validUserIds : JSON.stringify(validUserIds)
        },
        'mapcollaboration' 
      );

    res.send(token)

})



router.post('/create/instance' , async(req,res) => {

    const clientId = new mongoose.Types.ObjectId('612cf047f0397da8475ce70c') // 612bfe92121c139bdba43e64 
    
    let client = await Client.findById(clientId , {clientName:1, inst:1, users:1 } )
    const newInstance = await Inst.create({
        instID: 10000,
        info: JSON.stringify([0.6726, 51.7872]),
        type: 'marker',
        tags:['#explore']
    });
    client.inst.push(newInstance)
    client.save()
    
    let updatedInstances = await Client.findOne({ _id : clientId  }, { inst : 1  }).populate({
        path : 'inst',
        model : 'Inst'
    })
    res.send(updatedInstances)
})

router.delete('/delete/instance' , async(req,res) => {

    // const resp = await InstModel.findOne({'instID' : '5437ada2-83d8-4cba-9091-a9ffff4d250b'} , { '_id' : 1 })
    const resp = await InstModel.findOneAndDelete({'instID' : '4f81dc44-751f-4cfe-aaa2-9af9524608cb'})
    const pullInstance = resp._id ; 

    await Client.updateOne({ 'inst': pullInstance }, { $pull: { 'inst': pullInstance }}) ; 

    /*
    const instId = new mongoose.Types.ObjectId('612e0d11386c2895af2270ed')
    // const del = await Client.updateOne({ 'inst': instId }, { $pull: { 'inst': { _id: { "$in" : [ instId  ] } }}})
    await Client.updateOne({ 'inst': instId }, { $pull: { 'inst': instId }}) ; 
    const deletedInstance = await Inst.findOneAndDelete({ _id: instId}) ; 
    */ 
    res.json(resp)

})




router.post('/create/activity' , async(req,res) => {
    let client = await Client.findById('61143e7f2a699b804567d5e3')

    const newActivity = await Activities.create({
        desc: 'new' , 
        created: Date.now() , 
        tags:['#explore']
    })

    client.activities.push(newActivity)
    client.save()

    let updatedActivities = await Client.find().populate({
        path : 'activities',
        model : 'Activities'
    })

    res.send(updatedActivities)

})


module.exports = router ;



/*

await client 
    .find()
    .populate('activity')
    .select('triggers body')

*/ 