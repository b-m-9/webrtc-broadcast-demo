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

// require('./SocketServer.js')(app);


var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(3000, function () {
    console.log((new Date()) + ' Server is listening on port ws:3000');
});

var wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

let listOfBroadcasts = {};
wsServer.on('request', function (request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }
    let connection = request.accept(null, request.origin);

    let currentUser;

    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            try {
                let res = JSON.parse(message.utf8Data);

                switch (res.method) {
                    case 'join-broadcast':
                        let user = res.user;
                        currentUser = user;

                        user.numberOfViewers = 0;
                        if (!listOfBroadcasts[user.broadcastid])
                            listOfBroadcasts[user.broadcastid] = {
                                broadcasters: {},
                                allusers: {},
                                typeOfStreams: user.typeOfStreams // object-booleans: audio, video, screen
                            };


                        let firstAvailableBroadcaster = (u => {
                            let broadcasters = listOfBroadcasts[u.broadcastid].broadcasters;
                            let firstResult;
                            for (let user_id in broadcasters) {
                                if (broadcasters.hasOwnProperty(user_id) && broadcasters[user_id].numberOfViewers <= 3) {
                                    firstResult = broadcasters[user_id];
                                    continue;
                                } else delete listOfBroadcasts[u.broadcastid].broadcasters[user_id];
                            }
                            return firstResult;
                        })(user);


                        if (firstAvailableBroadcaster) {
                            listOfBroadcasts[user.broadcastid].broadcasters[firstAvailableBroadcaster.userid].numberOfViewers++;
                            connection.sendUTF(JSON.stringify({
                                method: 'join-broadcaster',
                                data: [firstAvailableBroadcaster, listOfBroadcasts[user.broadcastid].typeOfStreams]
                            }));

                            console.log('User <', user.userid, '> is trying to get stream from user <', firstAvailableBroadcaster.userid, '>'); //DEBUG
                        } else {
                            currentUser.isInitiator = true;
                            connection.sendUTF(JSON.stringify({
                                method: 'start-broadcasting',
                                data: [listOfBroadcasts[user.broadcastid].typeOfStreams]
                            }));

                            console.log('User <', user.userid, '> will be next to serve broadcast.'); //DEBUG
                        }

                        listOfBroadcasts[user.broadcastid].broadcasters[user.userid] = user;
                        listOfBroadcasts[user.broadcastid].allusers[user.userid] = user;
                        break;
                    case 'message':

                        wsServer.clients.forEach(function each(client) {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({method:'message',data:[res.data]}));
                            }
                        });
                        break;
                }


            } catch (e) {
                console.error('Error message WebSocket:', e)
            }



            console.log('Received Message: ' + message.utf8Data);
            // connection.sendUTF(message.utf8Data);
        }
    });


    connection.on('close', function (reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        if (
            !currentUser ||
            !listOfBroadcasts[currentUser.broadcastid] ||
            !listOfBroadcasts[currentUser.broadcastid].broadcasters[currentUser.userid]
        ) return false;

        delete listOfBroadcasts[currentUser.broadcastid].broadcasters[currentUser.userid];
        if (currentUser.isInitiator)
            delete listOfBroadcasts[currentUser.broadcastid];
    });
});