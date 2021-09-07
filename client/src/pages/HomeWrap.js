import React, { Component } from 'react';
import Home from "./Home"; 
import jwtDecode from "jwt-decode";
// import bcrypt from "bcrypt"; 

class CollaborateWrap extends Component {

    state = {
        user: null , 
        allUers: null, 
    }


    async componentDidMount() {

        const jwt = localStorage.getItem('originalToken');
        const details = await jwtDecode(jwt);
        this.setState({ user : details }) ;
        
        
        console.log('details' , this.props.match.params )
        console.log('details' , this.state.user )


    }

    render() { 


        // add validation if user.clientName is not equal to clientName then redirect 
        return <div>

           {
               this.state.user && 
               <Home room={this.props.match.params.client } user={this.state.user} />

           } 
        </div>;
    }
}
 
export default CollaborateWrap;