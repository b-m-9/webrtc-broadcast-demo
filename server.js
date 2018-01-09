// const fs = require("fs");
// const path = require('path');
const static_file = require('node-static');
const fileServer = new static_file.Server('./www');
let app = require('http').createServer((request, response) => {
    request.addListener('end', function () {
        fileServer.serve(request, response);
    }).resume();
});

app = app.listen(process.env.PORT || 8888, process.env.IP || "0.0.0.0", () => {
    let addr = app.address();
    console.log("Server listening at", addr.address + ":" + addr.port);
});

require('./SocketServer.js')(app);
