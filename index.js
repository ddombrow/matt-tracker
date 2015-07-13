var restify = require('restify');
var low = require('lowdb');

var geojson = require('geojson');

function getCurrentPos(req, res, next) {
  var db = low('./data/db.json');
  var pos = db('TheMadBombers').max(function(pt){ 
  	return (new Date(pt.time_utc)).getTime();
  });

  var currentPoint = geojson.parse([pos], {Point: ['latitude', 'longitude']})

  //HACK: adding custom mapbox properties
  currentPoint.features[0].properties["title"] = "The Mad Bombers";
  currentPoint.features[0].properties["marker-size"] = "medium";
  currentPoint.features[0].properties["marker-color"] = "#000000";
  currentPoint.features[0].properties["marker-symbol"] = "star";

  res.send( currentPoint );
  next();
}

function getRoute(req, res, next) {
  var db = low('./data/db.json');
  var routePts = db('TheMadBombers').chain().sortBy(function(pt) {
    return (new Date(pt.time_utc)).getTime();
  }).map(function(pt) {
    return [pt.longitude, pt.latitude];
  });

  var routeLine = 
    {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "geometry": {
            "type": "LineString",
            "coordinates": routePts
          },
          properties: {
            title: "Current Progress",
            "stroke": "#c6124e",
            "stroke-width": 4,
            "stroke-opacity": 1
          }
        }
      ]
  };
  res.send(routeLine);
  next();
}

var server = restify.createServer();
server.use(restify.CORS());

server.get('/madbombers/current', getCurrentPos);

server.get('/madbombers/route', getRoute);

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});