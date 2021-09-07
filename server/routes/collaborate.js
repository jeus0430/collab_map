const ClientModel = require("../models/client"); 
const { InstModel } = require("../models/insts"); 
const axios = require('axios'); 
const jwt = require('jsonwebtoken'); 
const mongoose = require("mongoose");
const _ = require('lodash')


let connectedUsers = []


module.exports = (io) => async (client) => {

  const userId = new mongoose.Types.ObjectId( client.user._id ) ;
  const clientId = new mongoose.Types.ObjectId( client.user._id ) ;
  const username = client.user.username ; 
  const room = client.handshake.query.client ; 
  console.log('+++++++ room initialized for', client.user.username)
  const correctRoom = await isValidRoom(userId, room) ; 
  console.log('++++++ is correct room', correctRoom)
  console.log('+++++++ room joined by ++', client.user.username)

  client.join(room)  

  io.of('/collaborate').in(room).fetchSockets().then(sockets => {
    // connectedUsers = {};
    for (const socket of sockets) {

        const userInfo = {
          username : socket.user.username, 
          connected: socket.connected , 
          room : socket.user.clientName
        }

        const infoExists = _.filter(connectedUsers, (u) => { return u.username === userInfo.username && u.connected === true });
          if (connectedUsers.length >= 1 && infoExists.length >= 1 ){
            return ; 
          } else {
            connectedUsers.push(userInfo) 
            return ; 
            // client.broadcast.emit('other-logged-in', connectedUsers);
          }  
    }
});

client.on('one-joined-room', () => {
  client.to(room).emit('other-joined-room', connectedUsers); 
})

if (!correctRoom) client.emit('logout')
  else {
        ClientModel
          .findOne({ "users._id" : userId  }, { inst : 1  })
          .populate({
            path : 'inst',
            model : 'Inst'
            })
            .then(insts => {
        
        const return_val = {
                'insts'     : insts.inst,
                'users'   : connectedUsers,
                'myInfo'     : 'my_info'
            }      
            // console.log(io.of('/collaborate').sockets)
            client.to(room).emit('one-joined-room', connectedUsers); 
            client.emit('load_data', return_val);

      });  
  }

  client.on("one-created-marker", async (lat, lng, name, desc, instID) => {

    const vicinity = await reverseGeocode(lat, lng)

    let clientObject = await ClientModel.findOne({ "users._id" : userId  }, {clientName:1, inst:1, users:1 })
    const markerInstance = await InstModel.create({
      instID: instID,
      info: JSON.stringify([lat, lng]),
      name: name,
      desc: desc,
      type: "marker",
      vicinity : vicinity,  
      by: username
    })

    clientObject.inst.push(markerInstance)
    clientObject.save()

    client.to(room).emit(
      "other-created-marker",
      JSON.stringify([lat, lng]),
      instID,
      name,
      desc,
      vicinity
    )
  })


  client.on("one-created-pencil", async (latlngs, name, desc, instID) => {

    const point = JSON.parse(latlngs)[0]
    const label = await reverseGeocode(point.lat, point.lng)

    let clientObject = await ClientModel.findOne({ "users._id" : userId  }, {clientName:1, inst:1, users:1 })

    const drawInstance = await InstModel.create({
      instID: instID,
      info: latlngs,
      type: "pencil",
      name: name,
      desc: desc,
      vicinity : label,  
      by: username
    });
    clientObject.inst.push(drawInstance)
    clientObject.save()

    client.to(room).emit(
      "other-created-pencil",
      latlngs,
      name,
      desc,
      instID
    )
  })

  /*
  client.on("one-created-path", (latlngs, name, desc, instID) => {
    InstModel.deleteMany({ instID: instID }, (err) => {
      if (err) return console.log(err)
      var inst = new InstModel({
        instID: instID,
        info: latlngs,
        type: "path",
        name: name,
        desc: desc,
      })
      inst.save(function (err) {
        if (err) return console.error(err)
        client.broadcast.emit("other-created-path", latlngs, name, desc, instID)
      })
    })
  })
  */

  client.on("one-created-area", async (latlngs, name, desc, instID) => {

    // console.log('latlngs', JSON.parse(latlngs)[0])
    const point = JSON.parse(latlngs)[0]
    const label = await reverseGeocode(point.lat, point.lng)

    let clientObject = await ClientModel.findOne({ "users._id" : userId  }, {clientName:1, inst:1, users:1 })
    const areaInstance = await InstModel.create({
        instID: instID,
        info: latlngs,
        type: "area",
        name: name,
        vicinity: label, 
        by: username,
        desc: desc,
    });
    clientObject.inst.push(areaInstance)
    clientObject.save()
    client.to(room).emit("other-created-area", latlngs, name, desc, instID)
    // client.broadcast.emit("other-created-area", latlngs, name, desc, instID)
  })

  client.on("one-erased-instance", async (instID) => {

    const resp = await InstModel.findOneAndDelete({'instID' : instID})
    const pullInstance = resp._id ; 

    await ClientModel.updateOne({ 'inst': pullInstance }, { $pull: { 'inst': pullInstance }}) ; 
    client.to(room).emit("other-erased-instance", instID)

  })
  
  client.on("one-moved-mouse", (lat, lng, nonce) => {
    //client.broadcast.emit("other-moved-mouse", lat, lng, nonce)
    client.to(room).emit("other-moved-mouse", lat, lng, nonce)
  })
  

}

reverseGeocode = async (lat,long) => {

  try {
      const resp = await axios.get(`http://api.positionstack.com/v1/reverse?access_key=8f697c298327c5dd7b2d8642933ffa09&query=${lat},${long}&fields=results.label,results.map_url&limit=1&output=json`)
      console.log(resp.data.data[0].label)
      // return resp.data
      return resp.data.data[0].label
    
  } catch (ex) {
     return 'undefined location'
  }


}

isValidRoom = async(userId, room) => {
  const dt = await ClientModel.findOne(
    { "users._id": userId},
    {
      "_id":0, 
      "clientName": 1 
    }
  )
  if (dt.clientName === room) return true
  else return false
}

// reverseGeocode()
// console.log('reverse geocode', reverseGeocode())
