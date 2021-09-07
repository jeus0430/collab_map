import React, { Component } from 'react';

class SideBar extends Component {

    

    render() { 

        const { instances } = this.props ; 
         
        return <div>
            {
               instances.map((k) => {
                return (
                    <div className="mt-2" style={{fontSize: '0.5rem'}}>
                        <div>
                            {k.type} by {k.by} near {k.vicinity}
                            <hr/>
                        </div>
                    </div>
                    )
               })
            }
        </div>;
    }
}
 
export default SideBar;