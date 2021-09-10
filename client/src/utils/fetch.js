import axios from "axios"

import { SERVER_URL } from "../config"

const options = (data) => {
  return {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("jwtToken"),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    method: "post",
    body: JSON.stringify(data),
  }
}

function setJwt(jwt) {
  axios.defaults.headers.common["x-auth-token"] = jwt
}

function getJwt() {
  return localStorage.getItem("originalToken")
}

setJwt(getJwt())

export const userSignupRequest = (userSignUpDetails) => {
  return axios
    .post(SERVER_URL + "/client/signup", userSignUpDetails)
    .then((res) => {
      return res
    })
}
export const userLoginRequest = (userLoginDetails) => {
  return axios
    .post(SERVER_URL + "/client/login", userLoginDetails)
    .then((res) => {
      localStorage.setItem("originalToken", res.headers["x-auth-token"])
      return res
    })
}

/*

export const getAllobjects = () => {
    return dispatch => {
        fetch(SERVER_URL+'/objects')
        .then(res => res.json())
        .then(res => {
            localStorage.setItem('BasicMERNStackAppAllobjects', JSON.stringify(res.objects));
            dispatch({ type: "got_all_objects", objects: res.objects })
        })
    };
};

export const getMyobjects = () => {
    return dispatch => {
        fetch(SERVER_URL+'/objects/myobjects', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwtToken'),
                'Content-Type': 'application/json'
            },
            method: 'GET'
        })
        .then(res => res.json())
        .then(res => {
            localStorage.setItem('coordobjects', JSON.stringify(res.objects));
            dispatch({ type: "got_my_objects", myobjects: res.objects })
        })
    };
};

export const getobject = (objectId) => {
    return dispatch => {
        fetch(SERVER_URL+'/objects/' + objectId)
        .then(res => res.json())
        .then(res => {
            dispatch({ type: "got_single_object", object: res.object })
        })
    };
};

export const submitNewobject = (objectData) => {
    return dispatch => {
        return fetch(SERVER_URL+'/objects/add', options(objectData))
        .then(res => res.json())
    }
};

export const saveobject = (objectId, objectData) => {
    return dispatch => {
        return fetch(SERVER_URL+'/objects/edit/' + objectId, options(objectData))
        .then(res => res.json())
    }
}

export const deleteobject = (objectId) => {
    return dispatch => {
        return fetch(SERVER_URL+'/objects/delete/' + objectId, {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwtToken'),
                'Content-Type': 'application/json'
            },
            method: 'delete'
        })
        .then(res => res.json())
    };
}

*/
