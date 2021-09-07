import React, { Component } from 'react';
import axios from "axios" ; 



class Start extends Component {
    
    state = { 
        resp : null
    }

    handleClick = async() => {
        const resp = await axios.get('http://localhost:5000/client/create/session')
        this.setState({ resp: resp.data })
    }
    
    render() { 
        return ( 
            <div className="mt-5 ml-3">
                <button  onClick= { this.handleClick } className="ml-5 btn-primary primary">  create </button>   
                
                {
                    this.state.resp && 
                    <div className= "mt-5">
                        { JSON.stringify(this.state.resp)}
                    </div> 
                }

            </div>

         );
    }
}
 
export default Start;