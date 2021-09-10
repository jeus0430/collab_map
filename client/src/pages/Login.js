import React, { Component } from "react"
import { Redirect, Link } from "react-router-dom"
import InputField from "../components/InputField"
import { userLoginRequest } from "../utils/fetch"

const FIELDS = [
  { name: "username", type: "text", label: "Username" },
  { name: "password", type: "password", label: "Password" },
]
class Login extends Component {
  state = {
    userCredentials: {},
    errors: {},
  }

  componentDidMount() {
    if (localStorage.getItem("_token")) {
      this.props.history.push("/home")
    }
  }

  handleValidation = (field, value) => {
    let error = {}
    if (value === "") {
      error[field] = "This field is required"
    } else {
      error[field] = ""
    }
    return error
  }

  handleInputChange = (e) => {
    const field = e.target.name
    const value = e.target.value

    const errors = {
      ...this.state.errors,
      ...this.handleValidation(field, value),
    }
    if (errors.invalidCredentials) {
      delete errors.invalidCredentials
    }

    this.setState((prevState) => {
      return {
        ...prevState,
        userCredentials: {
          ...prevState.userCredentials,
          [field]: value,
        },
        errors: { ...errors },
      }
    })
  }

  handleLogin = (e) => {
    e.preventDefault()
    let errors = { ...this.state.errors }
    const userCredentialsValid =
      Object.keys(errors).filter((field) => errors[field] !== "").length === 0
        ? true
        : false
    if (!userCredentialsValid) {
      return
    } else {
      userLoginRequest(this.state.userCredentials).then((res) => {
        console.log("login result", res)
        if (res.data.result == "fail") {
          var error = {
            username: "Not correct",
          }
          this.setState((prevState) => {
            return {
              ...prevState,
              userCredentials: { ...prevState.userCredentials },
              errors: { ...prevState.errors, ...error },
            }
          })
        } else {
          if (res.data.token) localStorage.setItem("_token", res.data.token)
          this.props.history.push("/home/clientOne")
        }
      })
    }
  }

  render() {
    const inputFields = FIELDS.map((field) => (
      <InputField
        key={field.name}
        type={field.type}
        name={field.name}
        label={field.label}
        errors={this.state.errors}
        onChange={this.handleInputChange}
      />
    ))
    return (
      <div className="container">
        <br />
        <div className="pan">
          <div
            style={{ fontSize: 20, textAlign: "center", fontWeight: "bold" }}
          >
            Login
          </div>
          {this.state.errors.invalidCredentials && (
            <p className="text-danger">
              {this.state.errors.invalidCredentials}
            </p>
          )}
          <form onSubmit={this.handleLogin}>
            {inputFields}
            <div className="btn-part">
              <button className="btn btn-primary login-btn">Login</button>
            </div>
          </form>
          <div style={{ fontSize: 12, color: "grey", textAlign: "center" }}>
            Do you have't got account?
            <Link
              to={{
                pathname: "/signup",
                // state: {
                //   hello: 'world'
                // }
                // state: this.state,
              }}
              style={{ paddingLeft: "10px" }}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    )
  }
}

export default Login
