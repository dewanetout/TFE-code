var ecstatic = require('ecstatic')
var server = require('http').createServer(
  ecstatic({ root: __dirname, handleError: false })
)

const fs = require('fs');
var p2pserver = require('socket.io-p2p-server').Server
var io = require('socket.io')(server)
var port = 8080;
server.listen(port, '0.0.0.0',)
io.use(p2pserver)

var totalUsers = 0;
var serverUserType = true;
var drawerWord;
var usersArray = [];
var connectedUsersArray;
var drawerHere = false;
var drawerCheckCount = 0;
var socketHost;
var private=true;
var hosting = true;
var toDraw = []

var start = new Date().getTime()

var filename = 'logs.txt'

fs.appendFile(filename, '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n server launched \n', (err) => {
  if (err) {
      throw err;
  }
});


io.on('connection', function (socket) {
  totalUsers++;
  console.log(totalUsers);
  
  socket.emit('setID', {"ar":socket.id,"id":socket.id});

  if (totalUsers == 1) {
    socket.emit('youHost');
    socket.emit('wait',socket.id);
    socketHost = socket;
    serverUserType = true;
    private=false;
  } else {
    socket.emit('hosted');
    serverUserType = false;
    socketHost.emit('newplayer',socket.id)
  }

  socket.emit('privacy',private);

  previousTotalUsers = totalUsers;

  socket.broadcast.emit('playerJoined', {"ar":totalUsers,"id":socket.id});

  socket.emit('userTypeCheck', {"ar":serverUserType,"id":socket.id});

  if (totalUsers === 2) {
    socket.broadcast.emit('play',socket.id);
  }

  socket.on('event', function (args) {
    const log = {
      "event": args.event,
      "args": args.args,
      "sender": socket.id,
      "date": new Date().getTime()-start
    };

    const data = JSON.stringify(log) + '\n';
    fs.appendFile(filename, data, (err) => {
        if (err) {
            throw err;
        }
    });
  })
  
  socket.on('go-private', function (ar) {
    socket.broadcast.emit('go-private', ar);
    private=true;
  });

  socket.on('IHost',()=>{
    socketHost=socket
  })

  socket.on('clientToServerWordCheck', function (ar) {
    if(hosting){
      wordCheckObject= ar.ar;
      if (wordCheckObject.drawer) {
        if(wordCheckObject.word!==drawerWord){
          drawerWord = wordCheckObject.word;
          socketHost.emit('clientToServerWordCheck',ar);
        }
      }
    }
  });

  socket.on('clientToServer', function (clientObject) {
    if(hosting){
      socket.broadcast.emit('serverToClient', clientObject);
      localDraw(clientObject);
    }
  });

  socket.on('guessToServer', function (ar) {
    if(hosting){
      message=ar.ar;
      if (message.guess.toLowerCase() === drawerWord) {
        console.log(message.guess + ' '+ drawerWord);
        var guessToClientObject = { guess: message.guess, word: drawerWord };
        io.sockets.emit('guessToClient', {"ar":guessToClientObject,"id":ar.id});
        isGuessed({"ar":guessToClientObject,"id":ar.id});
      } else {
        socket.broadcast.emit('guessToClient', {"ar":message,"id":ar.id});
        isGuessed({"ar":message,"id":ar.id});
      }
    }
  });

  socket.on('Winner', function (ar) {
    if(hosting){
      WinnerID=ar.ar;
      socket.broadcast.emit('endGame', {"ar":WinnerID,"id":ar.id});
      win()
    }
  });

  socket.on('disconnect', function () {
    totalUsers--;
    usersArray = [io.sockets.sockets];
    connectedUsersArray = Array.from(Object.keys(usersArray[0]));
    if (socketHost === socket) {
      if (connectedUsersArray.length > 0) {
        io.sockets.sockets[connectedUsersArray[0]].emit('youHost');
        socketHost = io.sockets.sockets[connectedUsersArray[0]];
      }
    }
    socketHost.emit('deconnection', connectedUsersArray);
    socket.broadcast.emit('playerLeft', { "ar": totalUsers, "id": socket.id });
    socket.broadcast.emit('serverToClientDrawerCheck', socket.id);

  });

  socket.on('drawerHere', function (ar) {
    if(hosting){
      clientToServerDrawerCheck= ar.ar;
      drawerCheckCount++;
      if (clientToServerDrawerCheck === true) {
        drawerHere = true;
      }
      // if the last client
      if (drawerCheckCount === totalUsers) {
        // if there is a drawer
        if (drawerHere === false) {
          for (var i = 0; i < connectedUsersArray.length; i++) {
            if (i === connectedUsersArray.length - 1) {
              io.sockets.sockets.get(connectedUsersArray[i]).emit('addNewDrawer', {"ar":true,"id":ar.id});
              if (totalUsers === 1) {
                io.sockets.sockets.get(connectedUsersArray[i]).emit('wait',ar.id);
              }
            } else {
              io.sockets.sockets.get(connectedUsersArray[i]).emit('resetGuessers',ar.id);
            }
          }
        }
        drawerHere = false;
        drawerCheckCount = 0;
      }
    }
  });

  //specific behaviour
  function localDraw(pt){
    toDraw[toDraw.length] = pt.position
    return;
  }

  function isGuessed(ms){
    return;
  }

  function win(){
    return;
  }
})