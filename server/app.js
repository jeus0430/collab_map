const express = require("express")
const jwt = require("jsonwebtoken")
const cors = require("cors")
const port = 5000
const app = express()
app.use(
  cors({
    origin: "*",
  })
)
const server = require("http").createServer(app)

require("./startup/db")
require("./startup/routes")(app)

server.listen(port, () => console.log(`Example app listening on port ${port}!`))

const io = require("socket.io")(server, { cors: { origin: "*" } })
const { socketManager } = require("./routes/collaborate")

io.of("/collaborate")
  .use((socket, next) => {
    const token = socket.handshake.auth.token

    if (token) {
      try {
        // const decoded = await jwt.verify(token, config.get('jwtPrivateKey'));
        const decoded = jwt.verify(token, "mapcollaboration")
        socket.user = decoded // pass this data to req body
        next()
        return
      } catch (ex) {
        console.log("connection refused - invalid token +--->", socket.id)
        next(new Error("refused client"))
        return
      }
    } else {
      console.log("connection refused - no token present +--->", socket.id)
      next(new Error("refused client"))
      return
    }
  })
  .on("connection", socketManager(io))
