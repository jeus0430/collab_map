import L from "leaflet"

export const IndicatorIcon = L.icon({
  iconUrl: require("../assets/indicator_icon.svg"),
  iconRetinaUrl: require("../assets/venue_location_icon.svg"),
  iconAnchor: null,
  shadowUrl: null,
  shadowSize: null,
  shadowAnchor: null,
  iconSize: [35, 35],
  className: "leaflet-venue-icon",
})
