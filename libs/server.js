var connect = require('connect')
  , http = require('http')
  , model = require('./temperature-model.js');

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
      model.create(req.body);
      res.end("");
    } else if ("GET" === req.method && "/temperature" === req.url) {
      model.last(function (arr) {
        arr.forEach(function (data) {
          console.log("LAST TEMPERATURE", data);
          res.write("Last temperature " + data.name + ": " + data.temp + "C " + new Date(data.time)+"\n");
        });
        res.end();
      });
    } else if ("GET" === req.method && "/temperature-stats" === req.url) {
      model.stats(function (data) {
        console.log("TEMPERATURE STATS", data);
        res.end("Temperature stats. " + Object.keys(data).map(function (key, value) { return key + ": " + value.toString(); }).join(' ') );
      });
    } else {
      res.end('Hello from Connect!\n');
    }
  });

http.createServer(app).listen(3000);