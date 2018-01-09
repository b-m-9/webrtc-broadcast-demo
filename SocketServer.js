module.exports = exports = (app) =>{
    let io = require('socket.io').listen(app, {
        log: false,
        origins: '*:*'
    });

    io.set('transports', [
        'websocket', // 'disconnect' EVENT will work only with 'websocket'
        'xhr-polling',
        'jsonp-polling'
    ]);

    let listOfBroadcasts = {};

    io.on('connection', function (ws) {
        let currentUser;
        ws.on('join-broadcast', function (user) {
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
                ws.emit('join-broadcaster', firstAvailableBroadcaster, listOfBroadcasts[user.broadcastid].typeOfStreams);

                console.log('User <', user.userid, '> is trying to get stream from user <', firstAvailableBroadcaster.userid, '>'); //DEBUG
            } else {
                currentUser.isInitiator = true;
                ws.emit('start-broadcasting', listOfBroadcasts[user.broadcastid].typeOfStreams);

                console.log('User <', user.userid, '> will be next to serve broadcast.'); //DEBUG
            }

            listOfBroadcasts[user.broadcastid].broadcasters[user.userid] = user;
            listOfBroadcasts[user.broadcastid].allusers[user.userid] = user;
        });

        ws.on('message', message => {
            ws.broadcast.emit('message', message);
        });

        ws.on('disconnect', function () {
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

};
