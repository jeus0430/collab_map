import React from "react"
import { BrowserRouter as Router, Switch, Route } from "react-router-dom"
import Home from "./pages/HomeWrap"
// import Home from "./pages/Home";
import SignUp from "./pages/Register"
import Login from "./pages/Login"
import Start from "./pages/Start"
require("dotenv").config()
function App() {
  return (
    <Router>
      <Switch>
        {/* <Route path="/home" component={Home} /> */}
        <Route path="/home/:client" component={Home} />
        <Route path="/create" component={Start} />
        <Route path="/signup" component={SignUp} />
        <Route path="/" component={Login} />
      </Switch>
    </Router>
  )
}

export default App
