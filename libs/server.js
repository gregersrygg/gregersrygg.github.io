var connect = require('connect')
  , http = require('http')
  , db = require('nano')({
    "url":  "http://nodejitsudb496426227801.iriscouch.com:5984/gregers_no",
    "log":  function (id, args) {
      console.log("DB gregers_no:", id, args);
    }
  })
  , tempRev
  , designRev;

var app = connect()
  .use(connect.favicon())
  .use(connect.logger('dev'))
  .use(connect.compress())
  .use(connect.static('public'))
  .use(connect.json())
  .use(connect.query())
  .use(function(req, res){
    var tempData;

    if ("PUT" === req.method && "/temperature" === req.url) {
      tempData = req.body;
      tempData._rev = tempRev;
      db.insert(tempData, "temperature", function (err, body) {
        if (err) {
          console.error("Error inserting temperature to database", tempData, err);
          return;
        }
        tempRev = body.rev;

        console.info("Temperature data saved to database", body);
      });
      res.end("");
    } else if ("GET" === req.method && "/temperature" === req.url) {
      db.view('temperature', 'last', function (err, body) {
        if (err) {
          console.error("Error viewing temperature");
        } else {
          body.rows.forEach(function (doc) {
            console.log("LAST TEMPERATURE", doc);
            res.write(doc.value);
          });
        }
      });
    }


    res.end('Hello from Connect!\n');
  });

// get last temperature revision
db.get("temperature", function (err, body) {
  if (err) return;
  tempRev = body._rev;
});

/*db.get("_design/temperature", function (err, body) {
  if (err) return;
  designRev = body._rev;
});*/

/*db.insert({
  "views": {
    "last": {
      "map":  function (doc) {
        emit([doc.temp, doc.time], doc._id);
      }
    },
    _rev: designRev
  }
}, '_design/temperature', function (err, body) {
  if (err) {
    console.error("Error inserting design doc", err);
  } else {
    console.log("Successfully created design doc", body);
  }
});*/

http.createServer(app).listen(3000);