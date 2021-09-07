import React, { Component } from "react"

class SideBar extends Component {
  renderIcon(k) {
    let path = process.env.PUBLIC_URL
    switch (k.type) {
      case "marker":
        path += "/collab/marker-tool.svg"
        break
      case "pencil":
        path += "/collab/pen-tool.svg"
        break
      case "area":
        path += "/collab/area-tool.svg"
        break
      case "path":
        path += "/collab/path-tool.svg"
        break
    }
    console.log(path)
    return <img src={path} />
  }

  render() {
    const { instances } = this.props

    return (
      <div style={{ overflow: "auto" }}>
        {instances.map((k) => {
          return (
            <div key={k._id} className="mt-3 ms-2">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">{this.renderIcon(k)}</div>
                <div className="flex-grow-1 ms-2">
                  <p>
                    {k.type} by {k.by}
                  </p>
                  <p>Near {k.vicinity}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }
}

export default SideBar
