import React from "react";
import L from 'leaflet';
import {Container, Row, Col} from "react-bootstrap";
import SideBar from "./SideBar";
import { VenueLocationIcon } from "./VenueLocationIcon.js";
import { io } from "socket.io-client";
import config from './config';
import axios from "axios";
import ReactDOM from "react-dom";
import ReactDOMServer from "react-dom/server";
import CustomReactForm from "./exampleForm";


class Home extends React.Component {
  constructor(props) {
    super(props)
    /*
    if ( ! localStorage.getItem('_token'))
      this.props.history.push('/')
    else {
      this.socket = io(config.SERVER_URL, {query: {_token: localStorage.getItem('_token')}});
    }
    */ 
    this.state = {
      currentLocation: [51.52, 9.97502],
      cursorcoords: [51.52, -0.09],
      zoom: 8,
      mapdragging: true,
      dragable: null,
      mousedown: false,
      dragging: false,
      drawing: false,
      erasing: false,
      markerson: false,
      linetool: false,
      lineon: false,
      areatool: false,
      areaon: false,
      enteringdata: false,
      dataloaded: false,
      cursors: [],
      myInfo: false, 
      scribbles: []
    };
    this.objects = [];
    this.currentid = 0;
    this.color = "#634FF1";
    this.followcursor = null;
    this.tooltip = null;
    this.map = null;
  }

  //here it was componentWillMount 
  async componentWillMount() {

    const resp = await axios.get('http://localhost:5000/collaborate/scribble') 
    // console.log(resp.data)
    this.setState({ scribbles: resp.data })
    this.drawInstances(this.state.scribbles); 
  }


  getCurrentInst() {
    return this.objects[this.objects.length-1];
  }
  getNewID() {
    if (this.objects.length) {
      var len = this.objects.length;
      return this.objects[len-1]['id']+1;
    } else {
      return 1;
    }
  }
  drawInstances(insts) {

    
    for (var i=0; i<insts.length; i++) {
      var m = insts[i];
      if (m['type'] == 'marker') {
        const arr = JSON.parse(m.info);
        this.createMarkerDirectly(arr[0], arr[1], m.instID);
      } else if (m['type'] == 'draw') {
        const arr = JSON.parse(m.info);
        this.createDraw(arr, m.instID);
      } else if (m['type'] == 'path') {
        const arr = JSON.parse(m.info);
        this.createPath(arr, m.instID);
      } else if (m['type'] == 'area') {
        const arr = JSON.parse(m.info);                        ;
        this.createArea(arr, m.instID);
      }
    }
  }
  bindErasingAction(inst) {
    const that = this;

    inst.line.on("click", function(event){
      console.log("--- before erasing ------");
      if (that.state.erasing) {
        console.log("-- in erasing ------");
        inst.line.remove();
        // send axios to remove 
        that.socket.emit('one-erased-instance', inst.id, localStorage.getItem('_token'));
      }
    });
    inst.line.on("mouseover", function(event){
      console.log("--- mouse over on line ------");
      if (that.state.erasing) {
        inst.line.setStyle({opacity: .3});
      }
    });
    inst.line.on("mouseout", function(event){
      inst.line.setStyle({opacity: 1});
    });
  }
  
  createCursorControl(parent) {
      const cursorControler = L.Control.extend({
          options: {
            position: 'bottomleft',
          },

          onAdd: function () {
            const btn = L.DomUtil.create('div', 'tool');
            btn.title = 'Cursor';
            btn.setAttribute(
              'id', 'cursor-tool'
            )
            btn.innerHTML = `<img src="` + process.env.PUBLIC_URL + `/assets/cursor-tool.svg">`
            btn.classList.add('tool-active');
            btn.onmouseover = function () {
              this.style.transform = 'scale(1.3)';
            };

            btn.onmouseout = function () {
              this.style.transform = 'scale(1)';
            };

            btn.onclick = function () {
              parent.cursorTool();
            };
            return btn;
          }
      });
      return new cursorControler();
  }
  
  createPenControl(parent) {
      const penControler = L.Control.extend({
      options: {
          position: 'bottomleft',
      },

      onAdd: function () {
          const btn = L.DomUtil.create('div', 'tool');
          btn.title = 'Pen Tool';
          // btn.textContent = '💩';
          // btn.setAttribute(
          //   'style',
          //   'background-color: transparent; width: 30px; height: 30px; border: none; display: flex; cursor: pointer; justify-content: center; font-size: 2rem;'
          // );
          btn.setAttribute(
              'id', 'pen-tool'
          )
          btn.innerHTML = `<img src="` + process.env.PUBLIC_URL + `/assets/pen-tool.svg">`

          btn.onmouseover = function () {
              this.style.transform = 'scale(1.3)';
          };

          btn.onmouseout = function () {
              this.style.transform = 'scale(1)';
          };

          btn.onclick = function () {
              parent.resetTool();
              parent.inactiveAllControls();
              parent.setMapDragging(false);
              parent.state.drawing = true;
              btn.classList.add('tool-active');
          };
          return btn;
      }
      });
      return new penControler();
  }
  createEraserControl(parent) {
      const eraserControler = L.Control.extend({
          options: {
            position: 'bottomleft',
          },

          onAdd: function () {
            const btn = L.DomUtil.create('div', 'tool');
            btn.title = 'Eraser Tool';
            btn.setAttribute(
              'id', 'eraser-tool'
            )
            btn.innerHTML = `<img src="` + process.env.PUBLIC_URL + `/assets/eraser-tool.svg">`

            btn.onmouseover = function () {
              this.style.transform = 'scale(1.3)';
            };

            btn.onmouseout = function () {
              this.style.transform = 'scale(1)';
            };

            btn.onclick = function () {
              parent.resetTool();
              parent.inactiveAllControls();
              parent.setMapDragging(false);
              parent.state.erasing = true;
              btn.classList.add('tool-active');
            };
            return btn;
          }
      });
      return new eraserControler();
  }
  createMarkerControl(parent) {
      const markerControler = L.Control.extend({
          options: {
            position: 'bottomleft',
          },

          onAdd: function () {
            const btn = L.DomUtil.create('div', 'tool');
            btn.title = 'Marker Tool';
            btn.setAttribute(
              'id', 'marker-tool'
            )
            btn.innerHTML = `<img src="` + process.env.PUBLIC_URL + `/assets/marker-tool.svg">`

            btn.onmouseover = function () {
              this.style.transform = 'scale(1.3)';
            };

            btn.onmouseout = function () {
              this.style.transform = 'scale(1)';
            };

            btn.onclick = function () {
              parent.resetTool();
              parent.inactiveAllControls();
              parent.setMapDragging(false);
              parent.setState({markerson: true});
              btn.classList.add('tool-active');
            };
            return btn;
          }
      });
      return new markerControler();
  }
  createPath(latlngs) {
    var line = L.polyline(latlngs, {color: this.color});
    // Create a new key for the line object, and set initial data in the database
    
    // Save an object with all the defaults
    this.objects.push({id:this.getNewID(), line:line, type:"path"});
    line.addTo(this.map);
    var inst = this.getCurrentInst();
    this.bindErasingAction(inst)
  }
  createPathControl(parent) {
      const pathControler = L.Control.extend({
          options: {
            position: 'bottomleft',
          },

          onAdd: function () {
            const btn = L.DomUtil.create('div', 'tool');
            btn.title = 'Path Tool';
            btn.setAttribute(
              'id', 'path-tool'
            )
            btn.innerHTML = `<img src="` + process.env.PUBLIC_URL + `/assets/path-tool.svg">`

            btn.onmouseover = function () {
              this.style.transform = 'scale(1.3)';
            };

            btn.onmouseout = function () {
              this.style.transform = 'scale(1)';
            };

            btn.onclick = function () {
              // parent.resetTool();
              // parent.inactiveAllControls();
              // parent.setMapDragging(false);

              // btn.classList.add('tool-active');
              parent.pathTool();
            };
            return btn;
          }
      });
      return new pathControler();
  }
  createAreaControl(parent) {
      const areaControler = L.Control.extend({
          onAdd: function () {
            const btn = L.DomUtil.create('div', 'tool');
            btn.title = 'Area Tool';
            btn.setAttribute(
              'id', 'area-tool'
            )
            btn.innerHTML = `<img src="` + process.env.PUBLIC_URL + `/assets/area-tool.svg">`

            btn.onmouseover = function () {
              this.style.transform = 'scale(1.3)';
            };

            btn.onmouseout = function () {
              this.style.transform = 'scale(1)';
            };

            btn.onclick = function () {
              parent.areaTool();
            };
            return btn;
          }
      });
      return new areaControler({ position: "bottomleft" });
  }
  componentDidMount()
  { 
    if (!this.map)
      this.map = L.map('mapDiv', {
        renderer: L.canvas({ tolerance: 10 })
      }).setView(this.state.currentLocation, 7);

    this.map.setMaxBounds([[84.67351256610522, -174.0234375], [-58.995311187950925, 223.2421875]]);
    // Set the tile layer. Could use Mapbox, OpenStreetMap, etc.
    // https://api.mapbox.com/styles/v1/epsilon2020/ckcgfeqx9123n1il7479gxs9f/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZXBzaWxvbjIwMjAiLCJhIjoiY2toaHMzczBqMGdnczJycDZjOHQ5aTk1eSJ9.zDfHYaadf5CMyenI0kFHbw
    L.tileLayer('https://api.mapbox.com/styles/v1/epsilon2020/ckcgfeqx9123n1il7479gxs9f/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZXBzaWxvbjIwMjAiLCJhIjoiY2toaHMzczBqMGdnczJycDZjOHQ5aTk1eSJ9.zDfHYaadf5CMyenI0kFHbw', {
      maxZoom: 18,
      zoomControl: false,
      minZoom:1,
      noWrap: true
    }).addTo(this.map);

    this.setMap(this.map);
    // const userlocation = L.marker(this.state.currentLocation, {icon:VenueLocationIcon, pane: "overlayPane"});
    // userlocation.addTo(this.map);
    this.followcursor = L.marker([0, 0], {pane: "overlayPane", interactive:false}).addTo(this.map);

    this.followcursor.setOpacity(0);
    this.tooltip = this.followcursor.bindTooltip("", { permanent: true, offset:[5,25], sticky: true, className: "hints", direction:"right"}).addTo(this.map);
    this.followcursor.closeTooltip();
    
    if (this.socket)
    this.socket.on('load_data', (a) => {
      if ( ! this.state.data_loaded) {
        this.drawInstances(a.insts);
        this.setState({data_loaded: true});
        this.setState({clients: a.clients});
        this.setState({myInfo: a.myInfo});
      }
    })  
  }

  componentDidUpdate(prevProps, prevState) {
      if (prevState.mapdragging !== this.state.mapdragging) {
          this.setState({ dragable: this.state.mapdragging });
      }
  }

  resetTool = () => {
      this.state.drawing = false;
      this.state.erasing = false;
      this.state.markerson = false;
      this.state.linetool = false;
      this.state.areatool = false;
      if (this.followcursor)
      this.followcursor.setLatLng([0,0]);
  }

  setMapDragging = (flag) => {
    if(flag)
    {
      this.map.doubleClickZoom.enable();
      this.map.dragging.enable();
    }
    else
    {
      this.map.doubleClickZoom.disable();
      this.map.dragging.disable();
    }
  }

  inactiveAllControls()
  {
      const cursor_tool = L.DomUtil.get('cursor-tool');
      const pen_tool = L.DomUtil.get('pen-tool');
      const eraser_tool = L.DomUtil.get('eraser-tool');
      const marker_tool = L.DomUtil.get('marker-tool');
      const path_tool = L.DomUtil.get('path-tool');
      const area_tool = L.DomUtil.get('area-tool');
      L.DomUtil.removeClass(cursor_tool, 'tool-active');
      L.DomUtil.removeClass(pen_tool, 'tool-active');
      L.DomUtil.removeClass(eraser_tool, 'tool-active');
      L.DomUtil.removeClass(marker_tool, 'tool-active');
      L.DomUtil.removeClass(path_tool, 'tool-active');
      L.DomUtil.removeClass(area_tool, 'tool-active');
  }

  cursorTool()
  {
    const cursor_tool = L.DomUtil.get('cursor-tool');
    this.resetTool();
    this.setMapDragging(true);
    this.inactiveAllControls();
    this.map.doubleClickZoom.enable();
    L.DomUtil.addClass(cursor_tool, 'tool-active');
  }

  pathTool(){
    const path_tool = L.DomUtil.get('path-tool');
    this.resetTool();
    this.setMapDragging(true);
    this.inactiveAllControls();
    this.state.linetool = true;
    L.DomUtil.addClass(path_tool, 'tool-active');
    this.map.doubleClickZoom.disable();
  }

  areaTool(){
    const area_tool = L.DomUtil.get('area-tool');
    this.resetTool();
    this.setMapDragging(true);
    this.inactiveAllControls();
    this.state.areatool = true;
    L.DomUtil.addClass(area_tool, 'tool-active');
    this.map.doubleClickZoom.disable();
  }

  nearBy = (info) => {
      console.log(info);
  }

  setMap = (map) => {
      const cursor_control = this.createCursorControl(this);
      const pen_control = this.createPenControl(this);
      const eraser_control = this.createEraserControl(this);
      const marker_control = this.createMarkerControl(this);
      const path_control = this.createPathControl(this);
      const area_control = this.createAreaControl(this);


      map.addControl(area_control);
      area_control.addTo(map);
      path_control.addTo(map);
      marker_control.addTo(map);
      eraser_control.addTo(map);
      pen_control.addTo(map);
      cursor_control.addTo(map);

      map.addEventListener("mousedown", (event) => {
          this.state.mousedown = true;
          let lat = Math.round(event.latlng.lat * 100000) / 100000;
          let lng = Math.round(event.latlng.lng * 100000) / 100000;
          this.state.cursorcoords = [lat,lng];
          if (this.state.drawing)
          {
            // If the pencil tool is enabled, start drawing
            this.startDrawing(lat,lng);
          }
          this.createMarker(lat,lng);
        });

      map.addEventListener("mouseup", async (event) => {
        this.state.mousedown = false;
        // Get mouse coordinates and save them locally
        let lat = Math.round(event.latlng.lat * 100000) / 100000;
        let lng = Math.round(event.latlng.lng * 100000) / 100000;

        if (this.state.linetool || this.state.areatool)
        {
          this.startPathline(lat,lng, event);
        } else if (this.state.drawing) {
          const that = this;
          var line = this.getCurrentInst().line.getLatLngs();
          this.bindErasingAction(this.getCurrentInst());

          // console.log('line objectn ' , line)
          // console.log('line object length ' , line.length)

          if (line.length > 5 ){
              // console.log('send axios request', JSON.stringify(line))
              const reqs = await axios.post('http://localhost:5000/collaborate/scribble', {
                  info : JSON.stringify(line), 
                  type: 'draw'
              })

              const resp = await reqs.data ; 
              this.setState({ scribbles: resp }) ; 

          } else if (line.length > 2000){
              console.log('line object too big to save')
          } else {
              console.log('line object too small to save')
          }        
           // console.log('response on mouseover', resp)
          // this.socket.emit('one-created-draw', JSON.stringify(line), this.getCurrentInst().id, localStorage.getItem('_token'));
        }
      });

      
      map.addEventListener("click", (event) => {
        let lat = Math.round(event.latlng.lat * 100000) / 100000;
        let lng = Math.round(event.latlng.lng * 100000) / 100000;
        this.state.cursorcoords = [lat,lng];

      });

      map.addEventListener("dblclick", (event) => {
        let lat = Math.round(event.latlng.lat * 100000) / 100000;
        let lng = Math.round(event.latlng.lng * 100000) / 100000;
        this.state.cursorcoords = [lat,lng];
        // console.log("-- double click---");

        //LINE TOOL CREATED 
        if(this.state.linetool && this.state.lineon){
          var that = this;
          this.state.lineon = false;
          this.resetTool();
          this.cursorTool();
          var path = this.getCurrentInst().line.getLatLngs();
          this.bindErasingAction(this.getCurrentInst());

          console.log('----- line tool created ---- + send axios +')
          // this.socket.emit('one-created-path', JSON.stringify(path), this.getCurrentInst().id, localStorage.getItem('_token'));
        }

        // AREA TOOL CREATED 
        if(this.state.areatool && this.state.areaon){
          this.state.areaon = false;
          this.resetTool();
          this.cursorTool();

          let that = this;
          var line = this.getCurrentInst().line;

          this.getCurrentInst().line.addLatLng(line._latlngs[0]);
          var inst = this.getCurrentInst();
          this.bindErasingAction(inst)
          var area = this.getCurrentInst().line.getLatLngs();
          console.log(' ---- Area tool created ---- + send axios +')
          // this.socket.emit('one-created-area', JSON.stringify(area), this.getCurrentInst().id, localStorage.getItem('_token'));
        }


      });
      
      map.addEventListener('mousemove', (event) => {
          let lat = Math.round(event.latlng.lat * 100000) / 100000;
          let lng = Math.round(event.latlng.lng * 100000) / 100000;
          this.state.cursorcoords = [lat,lng];
          if (this.state.myInfo)
            this.socket.emit('one-mouse-move', lat, lng, this.state.myInfo._id)
          if (this.state.mousedown && this.state.drawing)
          {
            // If the pencil tool is enabled, draw to the mouse coordinates
            let that = this;
            this.getCurrentInst().line.addLatLng([lat,lng]);
            // this.setState({});
          }
          if(this.state.lineon)
          {
            // If the line on, draw to the mouse coordinates
            this.setState({});

            // show cursor tooltip
            this.followcursor.setLatLng([lat,lng]);
            this.followcursor.openTooltip();
            this.followcursor.setTooltipContent("Double Click to finish here !");
          }
          if(this.state.areaon)
          {

            // If the pencil tool is enabled, draw to the mouse coordinates

            // show cursor tooltip
            this.followcursor.setLatLng([lat,lng]);
            this.followcursor.openTooltip();
            this.followcursor.setTooltipContent("Double Click to finish on first point !");
          }

      })
      map.addEventListener('movestart', (event) => {
          this.state.dragging = true;
      });
      map.addEventListener('moveend', (event) => {
          this.state.dragging = false ;
      });
      
     
      

      map.addEventListener('drawstart', ({ workingLayer }) => {

          console.log("--- Draw start---");
          // Show hints for drawing lines/areas
          this.followcursor.openTooltip();
          this.followcursor.setTooltipContent("Click to place first vertex");
 
          // Detect when a vertex is added to a line or area
          workingLayer.on('pm:vertexadded', e => {
            if (e.shape == "Polygon") {
              // Update hints
              this.followcursor.setTooltipContent("Click on first vertex to finish");
              var linelastcoord = e.layer._latlngs[e.layer._latlngs.length-1];
              if (e.layer._latlngs.length == 1) {
                // If this is the first vertex, get a key and add the new shape in the database
 
                this.objects.push({id:this.getNewID(), local:true, color:this.color, name:"Area", desc:"", trigger:"", distance:0, area:0, layer:"", type:"area", completed:false});
              } else {
                // If this is not the first vertex, update the data in the database with the latest coordinates
 
              }
            } else if (e.shape == "Line") {
              this.state.lineon = true;
              var linedistance = 0;
              linelastcoord = e.layer._latlngs[e.layer._latlngs.length-1];
              if (e.layer._latlngs.length == 1) {
                // If this is the first vertex, get a key and add the new shape in the database
 
                this.objects.push({id:this.getNewID(), local:true, color:this.color, name:"Line", desc:"", trigger:"", distance:0, layer:"", type:"draw", completed:false});
              } else {
                // If this is not the first vertex, update hints to show total distance drawn
                e.layer._latlngs.forEach(function(coordinate, index){
                  if (index != 0) {
                    linedistance += e.layer._latlngs[index-1].distanceTo(coordinate);
                  }
                });
                this.followcursor.setTooltipContent((linedistance/1000)+"km | Double click to finish");
 
                // Save new vertext in the database
 
              }
            }
          });
       });
      
     // Start drawing lines/areas
  }

  createDraw(latlngs) {
    var line = L.polyline(latlngs, {color: this.color});
    // Create a new key for the line object, and set initial data in the database
    // Save an object with all the defaults
    this.objects.push({id:this.getNewID(), line:line, type:"draw"});
    line.addTo(this.map);
    var inst = this.getCurrentInst();
    this.bindErasingAction(inst)
  }
  // Start free drawing
  startDrawing(lat,lng) {
    var line = L.polyline([[lat,lng]], {color: this.color});

    // Create a new key for the line object, and set initial data in the database

    // Save an object with all the defaults
    this.objects.push({id:this.getNewID(), line:line, type:"draw"});
    line.addTo(this.map);
    // Event handling for lines
  }

  startPathline(lat,lng, event) {
    if(this.state.linetool){
      if(this.state.lineon)
      {
        // If the path tool is enabled and during on lining, add new edge to object list
        let that = this;
        var line = this.getCurrentInst().line;

        // this.objects.filter(function(result){
        //   return result.id === that.currentid;
        // })[0].line._latlngs[line._latlngs.length-1] = L.LatLng(lat, lng);
        this.getCurrentInst().line.addLatLng([lat,lng]);
        this.setState({});
      }
      else
      {
        var line = L.polyline([[lat,lng]], {color: this.color});
        // line.addLatLng([lat,lng]);  // add once more in order to track mouse cursor during mouse move.
        // Create a new key for the line object, and set initial data in the database
        this.state.lineon = true;
        // Save an object with all the defaults
        this.objects.push({id:this.getNewID(), line:line, type:"path"});
        line.addTo(this.map);
        // Event handling for lines

      }
    }

    if(this.state.areatool)
    {
      if(this.state.areaon)
      {
        // If the area tool is enabled and during on area, add new edge to object list
        let that = this;
        this.getCurrentInst().line.addLatLng([lat,lng]);
        this.setState({});
      }
      else
      {
        var line = L.polyline([[lat,lng]], {color: this.color});
        // line.addLatLng([lat,lng]);  // add once more in order to track mouse cursor during mouse move.
        // Create a new key for the line object, and set initial data in the database
        this.state.areaon = true;
        // Save an object with all the defaults
        this.objects.push({id:this.getNewID(), line:line, type:"area"});
        line.addTo(this.map);
        // Event handling for lines
        var inst = this.getCurrentInst();
        this.bindErasingAction(inst);
      }
    }

  }

  createMarkerDirectly(lat, lng, id) {
      let that = this;
      // Go back to cursor tool after creating a marker
      that.cursorTool();

      var marker = L.marker([lat, lng], {icon:VenueLocationIcon, direction:"top", interactive:true, pane:"overlayPane"});
      if (typeof  id === 'undefined')
        id = this.getNewID();
      marker.addTo(this.map);
      marker.openTooltip();
      // Detect when the marker is clicked
      marker.on('click', function(e){
        if (!that.state.erasing) {
          // Open tooltip when the marker is clicked
          marker.openTooltip();

        } else {
          // If erasing, delete the marker
          marker.remove();
          that.socket.emit('one-erased-instance', id, localStorage.getItem('_token'));
        }
      })

      // Detect when the tooltip is closed
      marker.on('tooltipclose', function(e){
        // console.log("--- clicked tooltip close----");  
        
          if (that.state.enteringdata) {
              // If closing the tooltip but the name and description haven't been set yet, revert to defaults
          that.cancelForm();
          } else {
              // De-select object from sidebar
              // $(".annotation-item[data-id="+key+"]").find(".annotation-name span").removeClass("annotation-focus");
          }
          
      });

      // Create a new key for the marker, and add it to the database
      this.objects.push({id:id, color:this.color, name:"Marker", m_type:"none",  desc:"", lat:lat, lng:lng, marker:marker, trigger:marker, completed:true, type:"marker"});
      return marker;
  }

  // Create a new marker
  createMarker(lat, lng) {

    if (this.state.markerson) {
      let that = this;

      var marker = this.createMarkerDirectly(lat, lng);      
      marker.bindTooltip(
        '<label for="shape-name">Name</label><input value="Marker" id="shape-name" name="shape-name" /><label for="shape-desc">Description</label><textarea id="shape-desc" name="description"></textarea><br><div id="buttons"><button class="cancel-button" id="cancel-button">Cancel</button><button class="save-button" id="save-button">Save</button></div><div class="arrow-down"></div>'
      , {permanent: true, direction:"top", interactive:false, bubblingMouseEvents:false, className:"create-shape-flow create-form", offset: L.point({x: 0, y: -35})}
      );
      
      /*
      marker.bindTooltip(
        ReactDOMServer.renderToString(<CustomReactForm/>) , 
        { permanent: true, direction:"top", interactive:false, bubblingMouseEvents:false, className:"create-shape-flow create-form", offset: L.point({x: 0, y: -35})}
      );
      */
    
      const save_button = L.DomUtil.get('save-button');
      save_button.addEventListener("click", function(event){
        // console.log(event.target.value)
        // console.log(event.target.classList)
        // alert(event.target.id)
        that.saveForm();
      });
      
      const cancel_button = L.DomUtil.get('cancel-button');
      cancel_button.addEventListener("click", function(event){
        that.cancelForm();
        marker.remove()
      });
    }
  }

  bindTooltiptoCurrentInst() {
      this.enteringdata = false;
      let that = this;
      var inst = this.getCurrentInst();
      // Delete existing popup (for inputting data)
      inst.trigger.unbindTooltip();
      inst.completed = true;
      if (inst.type == "area") {
      // Create a popup showing info about the area
      inst.trigger.bindTooltip('<h1>'+inst.name+'</h1><h2>'+inst.desc+'</h2><div class="shape-data"><h3><img src="assets/area-icon.svg">'+inst.area+' km&sup2;</h3></div><div class="shape-data"><h3><img src="assets/perimeter-icon.svg">'+inst.distance+' km</h3></div><div class="arrow-down"></div>', {permanent: false, direction:"top", interactive:false, bubblingMouseEvents:false, className:"create-shape-flow", offset: L.point({x: -15, y: 18})});

      } else if (inst.type == "line") {
      // Create a popup showing info about the line
      inst.trigger.bindTooltip('<h1>'+inst.name+'</h1><h2>'+inst.desc+'</h2><div class="shape-data"><h3><img src="assets/distance-icon.svg">'+inst.distance+' km</h3></div><div class="arrow-down"></div>', {permanent: false, direction:"top", interactive:false, bubblingMouseEvents:false, className:"create-shape-flow", offset: L.point({x: -15, y: 18})});

      } else if (inst.type == "marker") {
      console.log('just a popup') 
      // Create a popup showing info about the marker
      inst.trigger.bindTooltip('<h1>'+inst.name+'</h1><h2>'+inst.desc+'</h2><div class="shape-data"><h3><img src="assets/marker-small-icon.svg">'+inst.lat.toFixed(5)+', '+inst.lng.toFixed(5)+'</h3></div><div class="arrow-down"></div>', {permanent: false, direction:"top", interactive:false, bubblingMouseEvents:false, className:"create-shape-flow", offset: L.point({x: 0, y: -35})});
      }
      // Render shape in the sidebar list and focus it

      // Automatically open the new popup with data about the shape
      window.setTimeout(function(){
          inst.trigger.openTooltip();
      }, 200)
      return inst;
  }

  createArea(latlngs) {
    var line = L.polyline(latlngs, {color: this.color});
    // Create a new key for the line object, and set initial data in the database
    
    // Save an object with all the defaults
    this.objects.push({id:this.getNewID(), line:line, type:"area"});
    line.addTo(this.map);
    var inst = this.getCurrentInst();
    this.bindErasingAction(inst)
  }
  // Don't save marker/line/area data (doesn't delete them, just reverts to defaults)
  cancelForm() {
      var inst = this.bindTooltiptoCurrentInst();
      inst.trigger.unbindTooltip();
      // if (inst.type == 'marker')
      console.log('++++ --- cancel marker  ++++++ ')
      // this.socket.emit('one-created-marker', inst.lat, inst.lng, this.getCurrentInst().id, localStorage.getItem('_token'));
  }

  saveForm() {
    var inst = this.bindTooltiptoCurrentInst();

    if (inst.type == 'marker')
    console.log('++++ --- save marker to database ++++++ ')
  }


  render() {
      return (

         <>
            {/* <Container fluid>
                <Row>
                    <Col sm={2}>
                        <SideBar parentCallback={this.nearBy} />
                    </Col>
                    <Col  sm={10} style={{paddingRight: 5}}>
                        <div fluid="true" className="map-container">
                        </div>
                        </Col>
                        </Row>
                      </Container> */}

            <div id="mapDiv"></div>
         </>
      );
  }
}
export default Home;