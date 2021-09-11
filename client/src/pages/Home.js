import React, { useRef, useEffect, useState } from "react"
import L from "leaflet"
import SideBar from "../components/SideBar"
import "mapbox-gl/dist/mapbox-gl.css"
import { VenueLocationIcon } from "../components/VenueLocationIcon"
import { io } from "socket.io-client"
import { v4 as uuidv4 } from "uuid"
import { useHistory } from "react-router"
import Geocoder from "./Geocoder"
import { PUBLIC_URL, SERVER_URL } from "../config"
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder"
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css"
import mapboxgl from "mapbox-gl"

const Home = (props) => {
  const currentLocation = [52.52, 13.405]
  const map = useRef(null)
  const penciling = useRef(false)
  const erasing = useRef(false)
  const markering = useRef(false)
  const pathing = useRef(false)
  const areaing = useRef(false)
  const followCursor = useRef(null)
  const mousedown = useRef(false)
  const objects = useRef([])
  const currentInst = useRef(null)
  const toolbarEnabled = useRef(true)
  const socket = useRef(null)
  const users = useRef({})
  const primaryColor = useRef("#007bff")
  const successColor = useRef("#28a745")
  const dangerColor = useRef("#dc3545")
  const warningColor = useRef("#ffc107")
  const infoColor = useRef("#17a2b8")
  const [instances, setInstances] = useState([])
  const history = useHistory()

  const waitForOpenConnection = () => {
    return new Promise((resolve) => {
      const intervalTime = 200 //ms

      const interval = setInterval(async () => {
        if (socket.current.connected) {
          clearInterval(interval)
          if (!map.current) {
            initMap()
            initToolbar()
            initEvents()
          }
          resolve()
        }
      }, intervalTime)
    })
  }

  useEffect(() => {
    ;(async () => {
      if (!localStorage.getItem("_token")) {
        history.push("/login")
        return
      }
      if (!socket.current) {
        socket.current = io(`${SERVER_URL}/collaborate`, {
          query: {
            client: props.room,
            _token: localStorage.getItem("_token"),
          },
          transports: ["websocket", "polling", "flashsocket"],
          auth: {
            token: localStorage.getItem("originalToken"),
          },
        }).on("connect", () => {
          console.log(" socket id +---->", socket.current.id)
          socket.current.emit("one-joined-room", props.user.username)
        })

        await waitForOpenConnection()

        socket.current.on("logout", () => {
          console.log("logout recieved")
          socket.current.disconnect()
          history.push("/login")
        })

        socket.current.on("load_data", (data) => {
          setInstances(data.insts)
          importInsts(data.insts)
        })

        socket.current.onAny((event, ...args) => {
          console.log(`got ${event}`)
        })

        socket.current.on("other-created-marker", (inst) => {
          const { info, instID, name, desc, center, vicinity } = inst
          var arr = JSON.parse(info)
          importMarker(arr, instID, name, desc, vicinity)
          setInstances((prev) => [...prev, inst])
        })
        // latlngs, name, desc, instID, center
        socket.current.on("other-created-pencil", (inst) => {
          const { info, name, desc, instID, center } = inst
          var points = JSON.parse(info)
          importPencil(points, name, desc, instID)
          setInstances((prev) => [...prev, inst])
        })
        socket.current.on("other-created-path", (inst) => {
          const { info, name, desc, instID, center } = inst
          var points = JSON.parse(info)
          importPath(points, name, desc, instID)
          setInstances((prev) => [...prev, inst])
        })
        socket.current.on("other-created-area", (inst) => {
          const { info, name, desc, instID } = inst
          var points = JSON.parse(info)
          importPath(points, name, desc, instID)
          setInstances((prev) => [...prev, inst])
        })
        socket.current.on("other-erased-instance", (instID) => {
          var inst = objects.current.filter(function (result) {
            return result.id === instID
          })[0]
          if (inst) {
            if (inst.type) return inst.line.remove()
            else inst.marker.remove()
          }
        })

        socket.current.on("other-moved-mouse", (lat, lng, nonce) => {
          renderCursor(lat, lng, nonce)
        })

        map.current.addEventListener("mousemove", (event) => {
          const lat = Math.round(event.latlng.lat * 100000) / 100000
          const lng = Math.round(event.latlng.lng * 100000) / 100000
          socket.current.emit("one-moved-mouse", lat, lng, props.user.username)
        })

        socket.current.on("my-created-inst", (inst) => {
          setInstances((prev) => [...prev, inst])
        })
      }
    })()
  })

  const initMap = () => {
    let thisMap = L.map("mapDiv", {
      renderer: L.canvas({ tolerance: 10 }),
    }).setView(currentLocation, 13)

    L.tileLayer(
      "https://api.mapbox.com/styles/v1/mj-epsilon/ckn1s6a7n2eyi17prjy5els6g/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoibWotZXBzaWxvbiIsImEiOiJja24wcWV5eTcwcTY5MnZwazA0cTRxMTlwIn0.powZMmJIS2FoR4JY1DFSGg",
      {
        maxZoom: 20,
        zoomControl: false,
        minZoom: 3,
        noWrap: true,
      }
    ).addTo(thisMap)

    let thisfollowCursor = L.marker([0, 0], {
      pane: "overlayPane",
      interactive: false,
      opacity: 0,
    })
      .bindTooltip("", {
        permanent: false,
        offset: [5, 25],
        sticky: true,
        className: "hints",
        direction: "right",
      })
      .closeTooltip()
      .addTo(thisMap)
    const geocoder = new MapboxGeocoder({
      accessToken:
        "pk.eyJ1IjoibWotZXBzaWxvbiIsImEiOiJja24wcWV5eTcwcTY5MnZwazA0cTRxMTlwIn0.powZMmJIS2FoR4JY1DFSGg",
      mapboxgl: mapboxgl,
      marker: false,
    })
    document.getElementById("mapDiv").appendChild(geocoder.onAdd(thisMap))
    geocoder.on("result", (e) => {
      thisMap.panTo({ lng: e.result.center[0], lat: e.result.center[1] })
    })
    // thisMap.addControl(geocoder)
    map.current = thisMap
    followCursor.current = thisfollowCursor
  }

  const initToolbar = () => {
    createAreaControl().addTo(map.current)
    createPathControl().addTo(map.current)
    createMarkerControl().addTo(map.current)
    createEraserControl().addTo(map.current)
    createPenControl().addTo(map.current)
    createCursorControl().addTo(map.current)
    // var geocoder = new ReactMapboxGl({
    //   accessToken: mapboxgl.accessToken,
    //   mapboxgl: mapboxgl,
    //   marker: false,
    // })
    // geocoder.addTo(map.current)
    // map.current.addControl(Geocoder)
    // map.current.on("geosearch/showlocation", (e) => {
    //   map.current.panTo([e.location.x, e.location.y])
    // })
    // createAvatarControl(props.user.username).addTo(map.current)
  }

  const initEvents = () => {
    map.current.addEventListener("mousedown", (event) => {
      mousedown.current = true

      const lat = Math.round(event.latlng.lat * 100000) / 100000
      const lng = Math.round(event.latlng.lng * 100000) / 100000
      if (penciling.current) {
        var line = L.polyline([[lat, lng]], { color: primaryColor.current })
        line.addTo(map.current)

        currentInst.current = {
          line: line,
          type: "pencil",
        }
      } else if (markering.current) {
        var marker = L.marker([lat, lng], {
          icon: VenueLocationIcon,
          direction: "top",
          interactive: true,
          pane: "overlayPane",
        })
        marker.addTo(map.current)
        currentInst.current = {
          marker: marker,
          type: "marker",
        }

        bindSaveForm(marker)
      }
    })

    map.current.addEventListener("mouseup", (event) => {
      mousedown.current = false
      const lat = Math.round(event.latlng.lat * 100000) / 100000
      const lng = Math.round(event.latlng.lng * 100000) / 100000
      if (penciling.current) {
        bindSaveForm(currentInst.current.line)
      } else if (pathing.current) {
        if (currentInst.current) {
          currentInst.current.line.addLatLng([lat, lng])
        } else {
          var line = L.polyline([[lat, lng]], { color: successColor.current })
          line.addTo(map.current)
          currentInst.current = {
            line: line,
            type: "path",
          }
        }
      } else if (areaing.current) {
        if (currentInst.current) {
          currentInst.current.line.addLatLng([lat, lng])
        } else {
          var line = L.polyline([[lat, lng]], { color: warningColor.current })
          line.addTo(map.current)
          currentInst.current = {
            line: line,
            type: "area",
          }
        }
      }
    })

    map.current.addEventListener("dblclick", () => {
      if (pathing.current && currentInst.current) {
        // if (currentInst.current.line.getLatLngs().length < 2) {
        //   cancelForm()
        //   return
        // }
        bindSaveForm(currentInst.current.line)
        // this.socket.emit(
        //   "one-created-path",
        //   JSON.stringify(path),
        //   currentInst.current.id,
        //   localStorage.getItem("_token")
        // )
      } else if (areaing.current && currentInst.current) {
        // if (currentInst.current.line.getLatLngs().length < 3) {
        //   cancelForm()
        //   return
        // }
        var line = currentInst.current.line
        line.addLatLng(line._latlngs[0])

        bindSaveForm(currentInst.current.line)
      }
    })

    map.current.addEventListener("mousemove", (event) => {
      const lat = Math.round(event.latlng.lat * 100000) / 100000
      const lng = Math.round(event.latlng.lng * 100000) / 100000
      if (mousedown.current && penciling.current) {
        currentInst.current.line.addLatLng([lat, lng])
      } else if (
        pathing.current &&
        currentInst.current &&
        currentInst.current.line.getLatLngs().length > 2
      ) {
        followCursor.current.setLatLng([lat, lng])
        followCursor.current.setTooltipContent("Double Click to finish here !")
        followCursor.current.openTooltip()
      } else if (
        areaing.current &&
        currentInst.current &&
        currentInst.current.line.getLatLngs().length > 2
      ) {
        followCursor.current.setLatLng([lat, lng])
        followCursor.current.openTooltip()
        followCursor.current.setTooltipContent(
          "Double Click to finish on first point !"
        )
      }
    })
  }

  const resetTool = () => {
    penciling.current = false
    erasing.current = false
    markering.current = false
    pathing.current = false
    areaing.current = false
    followCursor.current.setLatLng([0, 0])

    const cursor_tool = L.DomUtil.get("cursor-tool")
    const pen_tool = L.DomUtil.get("pen-tool")
    const eraser_tool = L.DomUtil.get("eraser-tool")
    const marker_tool = L.DomUtil.get("marker-tool")
    const path_tool = L.DomUtil.get("path-tool")
    const area_tool = L.DomUtil.get("area-tool")
    L.DomUtil.removeClass(cursor_tool, "tool-active")
    L.DomUtil.removeClass(pen_tool, "tool-active")
    L.DomUtil.removeClass(eraser_tool, "tool-active")
    L.DomUtil.removeClass(marker_tool, "tool-active")
    L.DomUtil.removeClass(path_tool, "tool-active")
    L.DomUtil.removeClass(area_tool, "tool-active")
  }

  const createCursorControl = () => {
    const cursorController = L.Control.extend({
      options: {
        position: "bottomleft",
      },

      onAdd: function () {
        const btn = L.DomUtil.create("div", "tool")
        btn.title = "Cursor"
        btn.setAttribute("id", "cursor-tool")
        btn.innerHTML = `<img src="` + PUBLIC_URL + `/collab/cursor-tool.svg">`
        btn.classList.add("tool-active")

        btn.onmouseover = function () {
          if (toolbarEnabled.current) this.style.transform = "scale(1.3)"
        }

        btn.onmouseout = function () {
          this.style.transform = "scale(1)"
        }

        btn.onclick = function () {
          if (toolbarEnabled.current) cursorTool()
        }
        return btn
      },
    })

    return new cursorController()
  }

  const cursorTool = () => {
    resetTool()
    const cursor_tool = L.DomUtil.get("cursor-tool")
    L.DomUtil.addClass(cursor_tool, "tool-active")
    setMapDragging(true)
  }

  const createPenControl = () => {
    const penControler = L.Control.extend({
      options: {
        position: "bottomleft",
      },

      onAdd: function () {
        const btn = L.DomUtil.create("div", "tool")
        btn.title = "Pen Tool"
        btn.setAttribute("id", "pen-tool")
        btn.innerHTML = `<img src="` + PUBLIC_URL + `/collab/pen-tool.svg">`

        btn.onmouseover = function () {
          if (toolbarEnabled.current) this.style.transform = "scale(1.3)"
        }

        btn.onmouseout = function () {
          this.style.transform = "scale(1)"
        }

        btn.onclick = function () {
          if (toolbarEnabled.current) {
            resetTool()
            setMapDragging(false)
            penciling.current = true
            btn.classList.add("tool-active")
          }
        }
        return btn
      },
    })
    return new penControler()
  }

  const createEraserControl = () => {
    const eraserControler = L.Control.extend({
      options: {
        position: "bottomleft",
      },

      onAdd: function () {
        const btn = L.DomUtil.create("div", "tool")
        btn.title = "Eraser Tool"
        btn.setAttribute("id", "eraser-tool")
        btn.innerHTML = `<img src="` + PUBLIC_URL + `/collab/eraser-tool.svg">`

        btn.onmouseover = function () {
          if (toolbarEnabled.current) this.style.transform = "scale(1.3)"
        }

        btn.onmouseout = function () {
          this.style.transform = "scale(1)"
        }

        btn.onclick = function () {
          if (toolbarEnabled.current) {
            resetTool()
            setMapDragging(false)
            erasing.current = true
            btn.classList.add("tool-active")
          }
        }
        return btn
      },
    })
    return new eraserControler()
  }

  const createMarkerControl = () => {
    const markerControler = L.Control.extend({
      options: {
        position: "bottomleft",
      },

      onAdd: function () {
        const btn = L.DomUtil.create("div", "tool")
        btn.title = "Marker Tool"
        btn.setAttribute("id", "marker-tool")
        btn.innerHTML = `<img src="` + PUBLIC_URL + `/collab/marker-tool.svg">`

        btn.onmouseover = function () {
          if (toolbarEnabled.current) this.style.transform = "scale(1.3)"
        }

        btn.onmouseout = function () {
          this.style.transform = "scale(1)"
        }

        btn.onclick = function () {
          if (toolbarEnabled.current) {
            resetTool()
            setMapDragging(false)
            markering.current = true
            btn.classList.add("tool-active")
          }
        }
        return btn
      },
    })
    return new markerControler()
  }

  const createPathControl = () => {
    const pathControler = L.Control.extend({
      options: {
        position: "bottomleft",
      },

      onAdd: function () {
        const btn = L.DomUtil.create("div", "tool")
        btn.title = "Path Tool"
        btn.setAttribute("id", "path-tool")
        btn.innerHTML = `<img src="` + PUBLIC_URL + `/collab/path-tool.svg">`

        btn.onmouseover = function () {
          if (toolbarEnabled.current) this.style.transform = "scale(1.3)"
        }

        btn.onmouseout = function () {
          this.style.transform = "scale(1)"
        }

        btn.onclick = function () {
          if (toolbarEnabled.current) {
            setMapDragging(false)

            btn.classList.add("tool-active")
            pathTool()
          }
        }
        return btn
      },
    })
    return new pathControler()
  }

  const createAvatarControl = (hisNonce) => {
    console.log("++ hisNonce in avatar", hisNonce)

    const cursorControler = L.Control.extend({
      options: {
        position: "topright",
        // position: "topright",
      },

      onAdd: function () {
        const btn = L.DomUtil.create("div", "avatar")
        const caretPath = PUBLIC_URL + "/collab/caret.svg"
        btn.title = hisNonce
        btn.innerHTML = `<span>${hisNonce
          .charAt(0)
          .toUpperCase()}<span><img style="width: 8px;margin-left: 2px" src="${caretPath}" />`
        // btn.title = "Hi"
        // btn.innerHTML = "<span>Hi</span>"

        btn.onclick = function () {
          trackUser(hisNonce)
        }
        return btn
      },
    })
    return new cursorControler()
  }

  const trackUser = (hisNonce) => {
    if (users.current[hisNonce]) {
      const cursorLatLng = users.current[hisNonce].cursor.getLatLng()
      map.current.panTo(cursorLatLng)
    }
  }
  const trackInst = (center) => {
    console.log("++++++++++++", center)
    map.current.panTo(center)
  }
  const pathTool = () => {
    const path_tool = L.DomUtil.get("path-tool")
    resetTool()
    setMapDragging(true)
    pathing.current = true
    L.DomUtil.addClass(path_tool, "tool-active")
    map.current.doubleClickZoom.disable()
  }

  const setMapDragging = (flag) => {
    if (flag) {
      map.current.doubleClickZoom.enable()
      map.current.dragging.enable()
    } else {
      map.current.doubleClickZoom.disable()
      map.current.dragging.disable()
    }
  }

  const createAreaControl = () => {
    const areaControler = L.Control.extend({
      onAdd: function () {
        const btn = L.DomUtil.create("div", "tool")
        btn.title = "Area Tool"
        btn.setAttribute("id", "area-tool")
        btn.innerHTML = `<img src="` + PUBLIC_URL + `/collab/area-tool.svg">`

        btn.onmouseover = function () {
          if (toolbarEnabled.current) this.style.transform = "scale(1.3)"
        }

        btn.onmouseout = function () {
          this.style.transform = "scale(1)"
        }

        btn.onclick = function () {
          if (toolbarEnabled.current) areaTool()
        }
        return btn
      },
    })
    return new areaControler({ position: "bottomleft" })
  }

  const areaTool = () => {
    const area_tool = L.DomUtil.get("area-tool")
    resetTool()
    setMapDragging(true)
    areaing.current = true
    L.DomUtil.addClass(area_tool, "tool-active")
    map.current.doubleClickZoom.disable()
  }

  const bindSaveForm = (inst) => {
    if (currentInst.current.type == "marker") {
      resetTool()
      setMapDragging(true)
      toolbarEnabled.current = false

      inst.bindTooltip(
        '<label for="shape-name">Name</label><input id="shape-name" placeholder="title" name="shape-name" /><label for="shape-desc">Description</label><textarea placeholder="description" id="shape-desc" name="description"></textarea><br><div id="buttons"><button class="cancel-button" id="cancel-button">Cancel</button><button class="save-button" id="save-button">Save</button></div><div class="arrow-down"></div>',
        {
          permanent: true,
          direction: "auto",
          interactive: false,
          sticky: true,
          bubblingMouseEvents: false,
          className: "create-shape-flow create-form",
          offset: L.point({ x: 0, y: -135 }),
        }
      )
      inst.openTooltip()

      L.DomUtil.get("cancel-button").addEventListener("click", function () {
        cancelForm()
      })
      L.DomUtil.get("save-button").addEventListener("click", function () {
        saveForm()
      })
    } else {
      saveForm()
      resetTool()
    }
  }

  const cancelForm = () => {
    if (currentInst.current.type == "marker")
      currentInst.current.marker.remove()
    else if (
      currentInst.current.type == "pencil" ||
      currentInst.current.type == "area" ||
      currentInst.current.type == "path"
    )
      currentInst.current.line.remove()

    currentInst.current = null
    toolbarEnabled.current = true
    setMapDragging(true)
    cursorTool()
  }

  const saveForm = () => {
    var inst = currentInst.current
    toolbarEnabled.current = true
    const name = document.getElementById("shape-name")
      ? document.getElementById("shape-name").value
      : ""
    const desc = document.getElementById("shape-desc")
      ? document.getElementById("shape-desc").value
      : ""

    if (inst.type == "marker") {
      if (!(name && desc)) {
        alert("Please fill name and description.")
        return
      }
    }

    if (inst.type == "area") {
      // inst.line.unbindTooltip()
      // inst.line.bindTooltip(
      //   "<h1>" +
      //     name +
      //     "</h1><h2>" +
      //     desc +
      //     '</h2><div class="arrow-down"></div>',
      //   {
      //     permanent: false,
      //     direction: "top",
      //     interactive: false,
      //     bubblingMouseEvents: false,
      //     className: "create-shape-flow",
      //     offset: L.point({ x: 0, y: -35 }),
      //   }
      // )
      saveArea(name, desc)
    } else if (inst.type == "path") {
      // inst.line.unbindTooltip()
      // inst.line.bindTooltip(
      //   "<h1>" +
      //     name +
      //     "</h1><h2>" +
      //     desc +
      //     '</h2><div class="arrow-down"></div>',
      //   {
      //     permanent: false,
      //     direction: "top",
      //     interactive: false,
      //     bubblingMouseEvents: false,
      //     className: "create-shape-flow",
      //     offset: L.point({ x: 0, y: -35 }),
      //   }
      // )
      savePath(name, desc)
    } else if (inst.type == "marker") {
      inst.marker.unbindTooltip()
      inst.marker.bindTooltip(
        "<h1>" +
          name +
          "</h1><h2>" +
          desc +
          '</h2><div class="shape-data"><h3><img src="' +
          PUBLIC_URL +
          '/collab/marker-small-icon.svg">' +
          inst.marker.getLatLng().lat.toFixed(5) +
          ", " +
          inst.marker.getLatLng().lng.toFixed(5) +
          '</h3></div><div class="arrow-down"></div>',
        {
          permanent: false,
          direction: "top",
          interactive: false,
          bubblingMouseEvents: false,
          className: "create-shape-flow",
          offset: L.point({ x: 0, y: -35 }),
        }
      )

      saveMarker(name, desc)
    } else if (inst.type == "pencil") {
      // inst.line.unbindTooltip()
      // inst.line.bindTooltip(
      //   "<h1>" +
      //     name +
      //     "</h1><h2>" +
      //     desc +
      //     '</h2><div class="arrow-down"></div>',
      //   {
      //     permanent: false,
      //     direction: "top",
      //     interactive: false,
      //     bubblingMouseEvents: false,
      //     className: "create-shape-flow",
      //     offset: L.point({ x: 0, y: -35 }),
      //   }
      // )
      savePencil(name, desc)
    }
    currentInst.current = null
    // Automatically open the new popup with data about the shape
    if (inst.type == "marker") {
      window.setTimeout(function () {
        inst.marker.openTooltip()
      }, 200)
    }
    //  else if (inst.type == "pencil") {
    //   window.setTimeout(function () {
    //     inst.line.openTooltip()
    //   }, 200)
    // } else if (inst.type == "area") {
    //   window.setTimeout(function () {
    //     inst.line.openTooltip()
    //   }, 200)
    // }
    toolbarEnabled.current = true
    setMapDragging(true)
    cursorTool()

    return inst
  }

  const saveMarker = (name, desc) => {
    var inst = currentInst.current

    //https://positionstack.com/quickstart

    const nextID = getNextId()
    objects.current.push({
      id: nextID,
      marker: inst.marker,
      name: name,
      desc: desc,
    })
    socket.current.emit(
      "one-created-marker",
      inst.marker._latlng.lat,
      inst.marker._latlng.lng,
      name,
      desc,
      nextID
    )
  }

  const savePencil = (name, desc) => {
    const nextID = getNextId()
    var inst = currentInst.current
    bindErasingAction(inst.line, nextID)
    objects.current.push({
      id: nextID,
      line: inst.line,
      name: name,
      desc: desc,
    })
    var centerPoint = inst.line.getBounds().getCenter()
    socket.current.emit(
      "one-created-pencil",
      JSON.stringify(inst.line.getLatLngs()),
      name,
      desc,
      nextID,
      JSON.stringify(centerPoint)
    )
  }

  const savePath = (name, desc) => {
    var inst = currentInst.current
    var nextID = getNextId()
    bindErasingAction(inst.line, nextID)

    objects.current.push({
      id: nextID,
      line: inst.line,
      name: name,
      desc: desc,
    })
    var centerPoint = inst.line.getBounds().getCenter()
    socket.current.emit(
      "one-created-path",
      JSON.stringify(inst.line.getLatLngs()),
      name,
      desc,
      nextID,
      JSON.stringify(centerPoint)
    )
  }

  const saveArea = (name, desc) => {
    var inst = currentInst.current
    var nextID = getNextId()
    bindErasingAction(inst.line, nextID)

    objects.current.push({
      id: nextID,
      line: inst.line,
      name: name,
      desc: desc,
    })
    var centerPoint = inst.line.getBounds().getCenter()
    socket.current.emit(
      "one-created-area",
      JSON.stringify(inst.line.getLatLngs()),
      name,
      desc,
      nextID,
      JSON.stringify(centerPoint)
    )
  }

  const importMarker = (info, instID, name, desc, vicinity) => {
    console.log("import marker called+->", instID)

    var marker = L.marker([info[0], info[1]], {
      icon: VenueLocationIcon,
      direction: "top",
      interactive: true,
      pane: "overlayPane",
    })
    marker.on("click", function (e) {
      if (!erasing.current) {
        marker.openTooltip()
      } else {
        marker.remove()
        console.log("triggered")
        socket.current.emit("one-erased-instance", instID)
      }
    })
    marker.bindTooltip(
      "<h1>" +
        name +
        "</h1><h2>" +
        desc +
        '</h2><div style="width: 250px;" class="shape-data"><h3><img src"=' +
        PUBLIC_URL +
        '/collab/marker-small-icon.svg"><span style="width: 220px;overflow-wrap: anywhere;">' +
        vicinity +
        '</span></h3></div><div class="arrow-down"></div>',
      {
        permanent: false,
        direction: "top",
        interactive: false,
        bubblingMouseEvents: false,
        className: "create-shape-flow",
        offset: L.point({ x: 0, y: -35 }),
      }
    )
    marker.addTo(map.current)
    objects.current.push({
      id: instID,
      marker: marker,
      name: info[2],
      desc: info[3],
      // type: 'marker'
    })
  }

  const importPencil = (points, name, desc, instID, center) => {
    var line = L.polyline(points, { color: primaryColor.current })
    // line.bindTooltip(
    //   "<h1>" +
    //     name +
    //     "</h1><h2>" +
    //     desc +
    //     '</h2><div class="arrow-down"></div>',
    //   {
    //     permanent: false,
    //     direction: "top",
    //     interactive: false,
    //     bubblingMouseEvents: false,
    //     className: "create-shape-flow",
    //     offset: L.point({ x: 0, y: -35 }),
    //   }
    // )
    line.addTo(map.current)
    objects.current.push({
      id: instID,
      line: line,
      name: name,
      desc: desc,
      type: "pencil",
    })
    bindErasingAction(line, instID)
  }

  const importPath = (points, name, desc, instID) => {
    var line = L.polyline(points, { color: infoColor.current })
    // line.bindTooltip(
    //   "<h1>" +
    //     name +
    //     "</h1><h2>" +
    //     desc +
    //     '</h2><div class="arrow-down"></div>',
    //   {
    //     permanent: false,
    //     direction: "top",
    //     interactive: false,
    //     bubblingMouseEvents: false,
    //     className: "create-shape-flow",
    //     offset: L.point({ x: 0, y: -35 }),
    //   }
    // )
    line.addTo(map.current)
    objects.current.push({
      id: instID,
      line: line,
      name: name,
      desc: desc,
      type: "path",
    })
    bindErasingAction(line, instID)
  }

  const importArea = (points, name, desc, instID) => {
    var line = L.polyline(points, { color: dangerColor.current })
    // line.bindTooltip(
    //   "<h1>" +
    //     name +
    //     "</h1><h2>" +
    //     desc +
    //     '</h2><div class="arrow-down"></div>',
    //   {
    //     permanent: false,
    //     direction: "top",
    //     interactive: false,
    //     bubblingMouseEvents: false,
    //     className: "create-shape-flow",
    //     offset: L.point({ x: 0, y: -35 }),
    //   }
    // )
    line.addTo(map.current)
    objects.current.push({
      id: instID,
      line: line,
      name: name,
      desc: desc,
      type: "area",
    })
    bindErasingAction(line, instID)
  }

  const getNextId = () => {
    return uuidv4()
  }

  const importInsts = (insts) => {
    console.log(insts)
    for (let i = 0; i < insts.length; i++) {
      const inst = insts[i]
      if (inst.type == "pencil") {
        importPencil(
          JSON.parse(inst.info),
          inst.name,
          inst.desc,
          inst.instID,
          inst.center
        )
      } else if (inst.type == "path") {
        importPath(JSON.parse(inst.info), inst.name, inst.desc, inst.instID)
      } else if (inst.type == "area") {
        importArea(JSON.parse(inst.info), inst.name, inst.desc, inst.instID)
      }
      if (inst.type == "marker") {
        var arr = JSON.parse(inst.info)
        importMarker(arr, inst.instID, inst.name, inst.desc, inst.vicinity)
      }
    }
  }

  const bindErasingAction = (inst, instID) => {
    inst.on("mouseover", function () {
      if (erasing.current) {
        inst.setStyle({ opacity: 0.3 })
      }
    })
    inst.on("mouseout", function () {
      inst.setStyle({ opacity: 1 })
    })
    inst.on("click", function () {
      if (!erasing.current) {
        inst.openTooltip()
      } else {
        inst.remove()
        socket.current.emit("one-erased-instance", instID)
      }
    })
  }

  const renderCursor = (lat, lng, hisNonce) => {
    if (users.current[hisNonce]) {
      users.current[hisNonce].cursor.setLatLng([lat, lng])
    } else {
      var cursor_icon = L.divIcon({
        html: '<svg width="18" height="18" style="z-index:9999!important" viewBox="0 0 18 18" fill="none" style="background:none;" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.51169 15.8783L1.08855 3.64956C0.511984 2.05552 2.05554 0.511969 3.64957 1.08853L15.8783 5.51168C17.5843 6.12877 17.6534 8.51606 15.9858 9.23072L11.2573 11.2573L9.23074 15.9858C8.51607 17.6534 6.12878 17.5843 5.51169 15.8783Z" fill="#ccaaaa" /></svg>',
        iconSize: [22, 22], // size of the icon
        iconAnchor: [0, 0], // point of the icon which will correspond to marker's location
        shadowAnchor: [4, 62], // the same for the shadow
        popupAnchor: [-3, -76], // point from which the popup should open relative to the iconAnchor
        className: "cursoricon",
      })

      var cursor_instance = L.marker([lat, lng], {
        icon: cursor_icon,
        pane: "markerPane",
      })

      cursor_instance.bindTooltip(hisNonce, {
        permanent: true,
        offset: [14, 32],
        className: "cursor-label",
        direction: "right",
      })
      cursor_instance.addTo(map.current)
      users.current[hisNonce] = { nonce: hisNonce, cursor: cursor_instance }

      const avatar_control = createAvatarControl(hisNonce)
      avatar_control.addTo(map.current)

      // var avatar = snapshot.imgsrc;
      // $("#right-nav").prepend('<div id="profile" style="background:'+snapshot.color+'!important" class="avatars" data-id="'+key+'"><img src="'+avatar+'"></div>');
      // Show user avatar on the top right. If they don't have a picture, just put the initial
      /*
          var avatar = snapshot.imgsrc;
          if (avatar == null) {
             avatar = snapshot.name.charAt(0).toUpperCase();
             $("#right-nav").prepend('<div id="profile" style="background:'+snapshot.color+'!important" class="avatars" data-id="'+key+'">'+avatar+'</div>');
           } else {
             $("#right-nav").prepend('<div id="profile" style="background:'+snapshot.color+'!important" class="avatars" data-id="'+key+'"><img src="'+avatar+'"></div>');
           }
           */
    }
  }

  const nearBy = (info) => {}

  return (
    <>
      {/* <div fluid="true" className="map-container"></div>  */}
      <div style={{ margin: 0, width: "100%" }}>
        {/* <div style={{ position: "absolute", zIndex: 12345, width: "100%" }}>
          <NavBar user = { getCurrentUser().username }/>
        </div> */}
        <div id="sidebar">
          {instances.length > 1 && (
            <SideBar trackFunc={trackInst} instances={instances} />
          )}
        </div>
        <div id="mapDiv"></div>
      </div>
    </>
  )
}

export default Home
