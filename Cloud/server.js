var http = require('http');
var express = require('express');
var socket_io = require('socket.io');
const fs = require('fs');

var port = 8081;
var hosting = true

var app = express();
app.use(express.static('public'));

var server = http.Server(app);
var io = socket_io(server);

var totalUsers = 0;
var previousTotalUsers;
var serverUserType = true;
var drawerWord;
var usersArray = [];
var connectedUsersArray;
var drawerHere = false;
var drawerCheckCount = 0;
var toDraw = [];
var start = new Date().getTime()

var filename = 'logs.txt'

fs.appendFile(filename, '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n server launched \n', (err) => {
    if (err) {
        throw err;
    }
});

io.on('connection', function(socket) {

    socket.emit('setID', socket.id);

    previousTotalUsers = totalUsers;

    totalUsers++;
    socket.broadcast.emit('playerJoined', totalUsers);

    // serverUserType helps to determine the drawer in this game. Only the first person that
    // joins the server will be considered the drawer or serverUserType = true.
    if (totalUsers > 1) {
        serverUserType = false;
    } else {
        socket.emit('wait');
        serverUserType = true;
    }

    if (totalUsers === 2){
        socket.broadcast.emit('play');
    }

    socket.onAny((event, args) => {
        // create a JSON object
        const log = {
            "event": event,
            "args": args,
            "sender": socket.id,
            "date": new Date().getTime()-start
        };

        // convert JSON object to string
        const data = JSON.stringify(log) + '\n';
        fs.appendFile(filename, data, (err) => {
            if (err) {
                throw err;
            }
            //console.log("log saved");
        });
    })
    // This listener will specify if the connected user is a drawer or not.
    socket.emit('userTypeCheck', serverUserType);

    // This listener will receive the userType and random word from every user, but
    // only the drawer's word will be saved.
    socket.on('clientToServerWordCheck', function(wordCheckObject) {
        if (wordCheckObject.drawer) {
            drawerWord = wordCheckObject.word;
        }
    });

    console.log(totalUsers);
    toDraw.forEach(elem => {
        socket.emit('serverToClient', elem);
    });

    socket.on('clientToServer', function(clientObject) {
        toDraw[toDraw.length]=clientObject;
        socket.broadcast.emit('serverToClient', clientObject);
    });

    socket.on('guessToServer', function(message) {
        if (message.guess.toLowerCase() === drawerWord) {
            var guessToClientObject = { guess: message.guess, word: drawerWord };
            io.sockets.emit('guessToClient', guessToClientObject);
            toDraw=[];
        } else {
            socket.broadcast.emit('guessToClient', message);
        }
    });

    socket.on('Winner', function(WinnerID) {
        socket.broadcast.emit('endGame', WinnerID);
    });

    socket.on('disconnect', function() {
        totalUsers--;
        usersArray = [io.sockets.sockets];
        connectedUsersArray = Array.from(usersArray[0].keys());
        //When a user disconnects I will be emitting the serverToClientDrawerCheck listener.
        socket.broadcast.emit('playerLeft', totalUsers);
        socket.broadcast.emit('serverToClientDrawerCheck');
    });

    socket.on('drawerHere', function(clientToServerDrawerCheck) {
        if(hosting){
            drawerCheckCount++;
            // set drawer exist if any client is a drawer
            if (clientToServerDrawerCheck === true) {
                drawerHere = true;
            }
            // if the last client
            if (drawerCheckCount === totalUsers) {
                // if there is a drawer
                if (drawerHere === false) {
                    for (var i = 0; i < connectedUsersArray.length; i++) {
                        if (i === connectedUsersArray.length - 1) {
                            io.sockets.sockets.get(connectedUsersArray[i]).emit('addNewDrawer', true);
                            if(totalUsers === 1){
                                io.sockets.sockets.get(connectedUsersArray[i]).emit('wait');
                            }
                        } else {
                            io.sockets.sockets.get(connectedUsersArray[i]).emit('resetGuessers');
                        }
                    }
                } 
                drawerHere = false;
                drawerCheckCount = 0;
            }
        }
    });

    //Measure latency
    socket.on('latency', function(){
        socket.emit('latencyback');
    });

    socket.on('loss', function(){
        socket.emit('latencyback');
    });
});

server.listen(port, function() {
  console.log('Please navigate to http://localhost:' + port);
});