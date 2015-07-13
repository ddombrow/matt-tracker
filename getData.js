var tracker = require('./DelormeExplore.js');
var schedule = require('tempus-fugit').schedule;

var interval = { minute: 1 };

var runTracker = function(job) {
	tracker({num: 30, unit: 'days'}, function(err){
		job.done();
	});
}

var run = schedule(interval, runTracker);