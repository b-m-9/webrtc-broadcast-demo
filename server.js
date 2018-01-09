const fs = require("fs");
const path = require('path');

let app = require('http').createServer((request, response) => {
    let uri = require('url').parse(request.url).pathname,
        filename = path.join(process.cwd(), uri);

    let isWin = !!process.platform.match(/^win/);

    if (!fs.existsSync(filename)) {
        response.writeHead(404, {
            "Content-Type": "text/plain"
        });
        response.write('404 Not Found: ' + filename + '\n');
        response.end();
        return false;
    }
    if (fs.statSync(filename).isDirectory()) {
        if (!isWin) filename += '/index.html';
        else filename += '\\index.html';
    }

    fs.exists(filename, (exists) => {
        if (!exists) {
            response.writeHead(404, {
                "Content-Type": "text/plain"
            });
            response.write('404 Not Found: ' + filename + '\n');
            response.end();
            return false;
        }

        fs.readFile(filename, 'binary', (err, file) => {
            if (err) {
                response.writeHead(500, {
                    "Content-Type": "text/plain"
                });
                response.write(err + "\n");
                response.end();
                return false;
            }

            response.writeHead(200);
            response.write(file, 'binary');
            response.end();
            return true;
        });
    });
});

app = app.listen(process.env.PORT || 8888, process.env.IP || "0.0.0.0", () => {
    let addr = app.address();
    console.log("Server listening at", addr.address + ":" + addr.port);
});

require('./SocketServer.js')(app);
