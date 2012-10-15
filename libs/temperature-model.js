var db = require('nano')({
    "url":  "http://nodejitsudb496426227801.iriscouch.com:5984/gregers_no",
    //"url":  "http://127.0.0.1:5984/gregers_no",
    "log":  function (id, args) {
      console.log("DB gregers_no:", id, args);
    }
  });


db.list(function checkDbAvailability(err, body) {
  if (err) throw new Error("Could not connect to CouchDB");
});

db.get("_design/temperature", function (err, body) {
  if (err && err.error === 'not_found') {
    createViews();
  } else if (err) {
    console.error("Couldn't get views from DB");
    throw err;
  } else {
    destroyViews(body._rev);
  }
});

function destroyViews(rev) {
  db.destroy("_design/temperature", rev, function (err, body) {
    if (err) return;
    createViews();
  });
}

function createViews () {
  var mapTemp = function (doc) {
    if (doc.temp && doc.time) {
      emit(doc.name || 'unknown', {
        temp: doc.temp,
        time: doc.time,
        name: doc.name
      });
    }
  };

  db.insert({
    "views": {
      "last": {
        "map":  mapTemp,
        "reduce": function (keys, values, rereduce) {
        	var latest = {}, latestTime = {}, arr = [];

          values.forEach(function (data, i) {
            var name = (rereduce ? data.name : keys[i][0]);
            if (!latest[name] || data.time > latestTime[name]) {
              if (!data.name) {
                data.name = name;
              }
              latestTime[name] = data.time;
              latest[name] = data;
            }
        	});

          for (var key in latest) {
            log("REDUCE " + key);
            arr.push(latest[key]);
          }

        	return arr;
        }
      },
      "stats": {
        "map":  function (doc) {
          if (doc.temp && doc.time) {
            emit("temp",  doc.temp);
          }
        },
        "reduce": "_stats"
      }
    }
  }, '_design/temperature', function (err, body) {
    if (err) {
      console.error("Error inserting design doc", err);
    } else {
      console.log("Successfully created design doc", body);
    }
  });
}

module.exports = {
	create: function create(tempData) {
		if (Array.isArray(tempData)) {
			tempData.forEach(function (data) {
				create(data);
			});
			return;
		}
		console.log("Inserting temperature to DB: ", tempData);
	  db.insert(tempData, null, function (err, body) {
	    if (err) {
	      console.error("Error inserting temperature to database", tempData, err);
	      return;
	    }

	    console.info("Temperature data saved to database", body);
	  });
	},

	last: function (callback) {
		db.view('temperature', 'last', function (err, body) {
      if (err) {
        console.error("Error getting last temperature");
      } else {
        callback( body.rows.length ? body.rows[0].value : null);
      }
    });
	},

	stats: function (callback) {
		db.view('temperature', 'stats', function (err, body) {
      if (err) {
        console.error("Error calculating temperature stats");
      } else {
      	callback( body.rows.length ? body.rows[0].value : null);
      }
    });
	}
};
