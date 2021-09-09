import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch"
import L from "leaflet"
import "leaflet-geosearch/dist/geosearch.css"
import config from "../config"
import { VenueLocationIcon } from "../components/VenueLocationIcon"

class MyProvider extends OpenStreetMapProvider {
  endpoint({ query, type }) {
    return this.getUrl(`${config.SERVER_URL}/collaborate/forwardGeocode`, {
      place: query,
    })
  }
  parse({ data }) {
    const resp = data.map((k) => ({
      x: Number(k.latitude),
      y: Number(k.longitude),
      label: k.label,
      bounds: [
        [Number(k.bbox_module[2]), Number(k.bbox_module[3])],
        [Number(k.bbox_module[0]), Number(k.bbox_module[1])],
      ],
      raw: k,
    }))

    return resp
  }
}

const Geocoder = new GeoSearchControl({
  provider: new MyProvider(),
  marker: {
    icon: VenueLocationIcon,
    draggable: false,
    retainZoomLevel: true,
  },
})

export default Geocoder
