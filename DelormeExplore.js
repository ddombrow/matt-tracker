var request = require('request');
var moment = require('moment');
var util = require('util');
var fs = require('fs');
var tj = require('togeojson');
var DOMParser = require('xmldom').DOMParser;
var queue = require('queue');
var low = require('lowdb');
var db = low('./data/db.json');
var uuid = require('uuid')
var _ = db._;


var feed = {
	url: "https://explore.delorme.com/feed/share/%s?d1=%s",
	user_name: "TheMadBombers",
	file_name: "MadBombers-%s"
};

module.exports = function(when, cb) {
	feed.base_name = util.format(feed.file_name, moment().valueOf());
	feed.kml_path = util.format('./data/%s.kml', feed.base_name);
	feed.json_path = util.format('./data/%s.json', feed.base_name);
	if (when) {
		feed.when = when;
	}
	else {
		feed.when = { num: 1, unit: 'days'};
	}
	
	feed.geojson = {};

	var q = queue({ concurrency: 1 });

	q.push(getKml);

	q.push(convertKml);

	q.push(processPoints);

	q.start(function(err) {
		//console.log('All done.')
		cb(err);
	});
};

var getKml = function(cb) {
	var kmlUrl = util.format(feed.url, feed.user_name, moment().subtract(feed.when.num, feed.when.unit).toISOString());
	//console.log(kmlUrl + ' ' + feed.kml_path);

	var kmlWriter = fs.createWriteStream(feed.kml_path);
	kmlWriter.on('finish', function() {
		cb();
	});
	request(kmlUrl).on('error', function(err) { cb(err); }).pipe(kmlWriter);
};

var convertKml = function(cb) {
	//var kmlStr = fs.readFileSync(, 'utf8');
		
	fs.readFile(feed.kml_path, 'utf8', function (err, data) {
		if (err) throw err;
		var kmlStr = data;
		//console.log(data);
		var doc = new DOMParser().parseFromString(kmlStr);
		feed.geojson = tj.kml(doc);
		//console.log(JSON.stringify(feed.geojson));
		cb();
	});
};

var processPoints = function(cb) {
	var pts = feed.geojson.features;

	if (pts) {
		_.forEach(pts, function(val, key, collection) {
			//console.log(val.properties['Id']);
			//console.log(db(feed.user_name).where({id: val.properties['Id']}));
			var isValid = val.properties['Valid GPS Fix'] == 'True';
			//console.log(db(feed.user_name).where({id: val.properties['Id']}));
			if (isValid && !(db(feed.user_name).where({id: val.properties['Id']}).length > 0)) {
				var pt = {
					id: val.properties['Id'],
					time: moment(val.properties['Time'], "M/D/YYYY h:mm:ss A").toDate(),
					time_utc: moment(val.properties['Time UTC'], "M/D/YYYY h:mm A").toDate(),
					latitude: parseFloat(val.properties['Latitude']),
					longitude: parseFloat(val.properties['Longitude']),
					elevation: val.properties['Elevation'],
					velocity: val.properties['Velocity']
				};

				db(feed.user_name).push(pt);
			}
		});
		cb();
	}
};
