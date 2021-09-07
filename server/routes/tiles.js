const p = require("path");
const MBTiles = require('@mapbox/mbtiles');
const express = require('express');
const router = express.Router();



router.get('/tiles/:source/:z/:x/:y.pbf', function (req, res) {
    
    // console.log('pathname ++++++  ' , p.join(__dirname,"/tilesets/"+ req.params.source + '.mbtiles'))
    // console.log('parameters +++++ ', req.params)

    new MBTiles( p.join(__dirname,"/tilesets/"+ req.params.source + '.mbtiles'), function (err, mbtiles) {

        mbtiles.getTile(req.params.z, req.params.x, req.params.y, function (err, tile, headers) {

            if (err) {
                res.set({"Content-Type": "text/plain"});
                res.status(404).send('Tile rendering error: ' + err + '\n');
            } else {
                res.set(header);
                // console.log('set tile', tile)
                res.send(tile);
            }
        });
        if (err) console.log("error opening database");
    });
});


module.exports = router ;






