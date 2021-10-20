var Socketiop2p = require('../../../index')
var io = require('socket.io-client')

var private = false;
var hosting;     
var canvas, context;     
var play = false;

//connection variables
var p2psocket;               
var socketHost;              


//game variables
var guessBox;
var userType;             
var initialGuess;
var randomWord;
var ID;
var guesserCount = 0;
var score;           
var scoreToWin = 2;
var totalUsers;      


//server variables
var totalUsers = 0;
var drawerWord;              
var usersArray = [];
var connectedUsersArray;
var drawerHere = false;
var drawerCheckCount = 0;
var toDraw;            

//Role variables
var display          
var wordGuesser      
var artist           
var interval;                



console.log(sessionStorage.getItem('hosting'))


function init() {
  var nbPing = 0
  var start = Date.now()
  hosting = false
  display = true
  wordGuesser = true
  artist = false
  shared = false

  drawerWord = null
  toDraw = []
  totalUsers = 1
  score = 0
  userType = false
  context
  socketHost = io()
  var opts = { peerOpts: { trickle: true }, autoUpgrade: false }
  p2psocket = new Socketiop2p(socketHost, opts, function () {
    endTime = Date.now() - start
    console.log('time to connect ' + endTime + ' ms');
    p2psocket.emit('peer-obj', 'Hello there. I am ' + p2psocket.peerId)
    p2psocket.emit('go-private');//, true);
    goPrivate();
  })

  p2psocket.on('go-private', function () {
    if (hosting) {
      toDraw.forEach(elem => {
        p2psocket.emit('serverToClient', elem);
      });
      socketHost.emit('event',{"event":"go-private", "args":null})
    }
    goPrivate()
  })

  p2psocket.on('privacy', (private) => {
    if (private) {
      $('.private').fadeIn('fast');
      $('#top-message .private').css('display', 'none');
    } else {
      $('.private').delay(10).fadeOut('fast');
      $('#top-message .private').css('display', 'inline-block');
    }
  })

  function goPrivate() {
    if (!private) {
      p2psocket.useSockets = false
      private = true;

      $('.private').delay(10).fadeOut('fast');
      $('#top-message .private').css('display', 'inline-block');
      //p2psocket.emit('guessToServer', { "ar": { guess: initialGuess, word: "aO_i%%ssbskkvsivduvsdukvcdhvsbhdhv" }, "id": ID });
    }
  }

  p2psocket.on('ping', (id) => {
    if (id === nbPing && !hosting) {
      nbPing++;
      p2psocket.emit('ping', -1)
    }
    if (hosting) {
      if (id === -1) {
        endTime = Date.now() - start;
        console.log('Ping to client ' + endTime)
        socketHost.emit('event',{"event":"ping", "args":endTime})
      }
    }
  })

  //Hosting part
  p2psocket.on('youHost', () => {
    hosting = true;
    console.log('I host');
    interval = setInterval(function () {
      start = Date.now()
      p2psocket.emit('ping', nbPing)
      nbPing++;
    }, 5000);
    socketHost.emit('event',{"event":"youhost", "args":null})
  });

  p2psocket.on('hosted', () => {
    if (hosting) {
      interval.clearInterval();
    }
    hosting = false;
  });

  //classical gaming part

  p2psocket.on('setID', function (ar) {
    var userID = ar.ar;
    ID = userID;
  });

  p2psocket.on('wait', function (id) {
    $('.waiting').fadeIn('fast');
    $('#top-message .drawerTag').css('display', 'none');
    play = false;
  });


  p2psocket.on('play', function (id) {
    if (userType) {
      $('.waiting').delay(10).fadeOut('fast');
      $('#top-message .drawerTag').css('display', 'inline-block');
    }
    play = true;
  });

  p2psocket.on('playerJoined', function (ar) {
    totalU = ar.ar;
    totalUsers = totalU;
    $('.totalPlayers').text(totalU);
    $('.playerJoined').fadeIn(1000, 'linear').delay(1000).fadeOut(1000, 'linear');
  });

  p2psocket.on('playerLeft', function (ar) {
    totalU = ar.ar;
    totalUsers = totalU;
    $('.totalPlayers').text(totalU);
    $('.playerLeft').fadeIn(1000, 'linear').delay(1000).fadeOut(1000, 'linear');
  });


  var WORDS = [
    "voiture","fleur","maison", "nuage", "arbre", "ampoule", "gsm", "chaussure", "vaisselle", "pied", "ballon",
        "fusil","avion","chaise","table","douche","argent",
        "souris","couteau","bateau","coeur","carre","main","oiseau","mouton","elephant","fourchette",
        "yeux","banane","vache","marteau","tortue","bras","cd","moto","sucette","soleil"
  ];

  /*"word", "letter", "number", "person", "pen", "class", "people",
    "sound", "water", "side", "place", "man", "men", "woman", "women", "boy",
    "girl", "year", "day", "week", "month", "name", "sentence", "line", "air",
    "land", "home", "hand", "house", "picture", "animal", "mother", "father",
    "brother", "sister", "world", "head", "page", "country", "question",
    "answer", "school", "plant", "food", "sun", "state", "eye", "city", "tree",
    "farm", "story", "sea", "night", "day", "life", "north", "south", "east",
    "west", "child", "children", "example", "paper", "music", "river", "car",
    "foot", "feet", "book", "science", "room", "friend", "idea", "fish",
    "mountain", "horse", "watch", "color", "face", "wood", "list", "bird",
    "body", "dog", "family", "song", "door", "product", "wind", "ship", "area",
    "rock", "order", "fire", "problem", "piece", "top", "bottom", "king",
    "space"*/

  //drawerReset function clears the userGuesses div and displays the drawerTag showing the user it is
  //their turn to draw the displayed word.
  var drawerReset = function () {
    randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    drawerWord = randomWord;
    setScore();
    $('.userGuesses').empty();
    if (play) {
      $('#top-message .drawerTag').css('display', 'inline-block');
    }
    $('#top-message #guess').css('display', 'none');
    $('.drawerTag span').text(randomWord);
    context.clearRect(0, 0, canvas[0].width, canvas[0].height);
  };

  //Get the word to guess from the text
  var textCut = function (text, word) {
    var offset = 0;
    var cmp = 0;
    for (var i = 0; i < text.length; i++) {
      if (i - offset < word.length) {
        if (word[i - offset] === text[i]) {
          cmp++;
        } else {
          cmp = 0;
          offset++;
        }
        if (cmp === word.length) { return true; }
      }
    }
    console.log(cmp);
    console.log(word.length);
    return false;
  };

  //Update the score on the page
  var setScore = function () {
    $('.score').text(score);
  }

  //The guesserReset also resets the userGuesses div and displays the make a guess input. This tells the user
  //it is their turn to make a guess.
  var guesserReset = function () {
    toDraw = [];
    console.log('I am Guesser');
    setScore();
    play = true;
    $('.userGuesses').empty();
    if (wordGuesser) {
      $('#top-message #guess').css('display', 'inline-block');
    }
    if (!artist) {
      $('#top-message .drawerTag').css('display', 'none');
    }
    context.clearRect(0, 0, canvas[0].width, canvas[0].height);
  };

  //The userTypeCheck listener gets the type parameter from the server and declares the clients userType variable.
  //The server takes the first user as a drawer(a drawer's userType = true), and all subsequent connections
  //are guessers (a guessers userType = false).
  //TODO with deconnexion
  p2psocket.on('userTypeCheck', function (ar) {
    console.log('id ' + ar.id + ' is drawer ' + ar.ar)
    if (ar.id === ID) {
      userType = ar.ar;
      if (userType === true) {
        drawerReset();
      } else {
        console.log('to be guesses (if place)')
        guesserReset();
      }

      //This clientToServerWordCheck listener sends an object to the server containing the userType and randomWord.
      if (!hosting || !private) {
        p2psocket.emit('clientToServerWordCheck', { "ar": { 'drawer': userType, word: randomWord }, "id": ar.id });
        socketHost.emit('event',{"event":"userTypeCheck", "args":ar})
      } else if (userType) {
        drawerWord = randomWord;
      }
    }
  });

  p2psocket.on('endGame', function (ar) {
    WinnerID = ar.ar;
    win(WinnerID)
  });

  //The serverToClientDrawerCheck listener will have a function which emits the userType back to the server.
  p2psocket.on('serverToClientDrawerCheck', function (id) {
    p2psocket.emit('drawerHere', { "ar": userType, "id": ID });
  });

  //addNewDrawer and resetGuessers are listeners to restart the game and add a new drawer when the previous drawer so happens
  //to leave the game.
  p2psocket.on('addNewDrawer', function (ar) {
    if (ar.id === ID) {
      userType = ar.ar;
      drawerReset();
      p2psocket.emit('clientToServerWordCheck', { "ar": { drawer: userType, word: randomWord }, "id": ID });
    }
  });

  p2psocket.on('resetGuessers', function (id) {
    if (id) {
      guesserReset();
    }
  });

  //function for the enter click. This click is only available to the guesser and not the drawer.
  //The initialGuess variable is assigned to the users guess on every enter click. Then the guessToServer
  //listener emits an object to the server containing the users guess.
  var onKeyDown = function (event) {
    if (event.keyCode != 13) { // Enter
      return;
    }

    if (userType === false) {
      initialGuess = guessBox.val().toLowerCase();
      if (!hosting || !private) {
        p2psocket.emit('guessToServer', { "ar": { guess: guessBox.val().toLowerCase(), word: "aO_i%%ssbskkvsivduvsdukvcdhvsbhdhv" }, "id": ID });
        socketHost.emit('event',{"event":"guessToServer", "args":{ "ar": { guess: guessBox.val().toLowerCase(), word: "aO_i%%ssbskkvsivduvsdukvcdhvsbhdhv" }, "id": ID }})
      } else {
        GuessToServer({ "ar": { guess: guessBox.val().toLowerCase(), word: "aO_i%%ssbskkvsivduvsdukvcdhvsbhdhv" }, "id": ID });
      }
      guessBox.val('');
    }

  };

  function isGuessed(ar) {
    information = ar.ar;
    if (userType == false && information.guess === initialGuess && information.guess === information.word) {
      userType = true;
      score += 1;
      if (score == scoreToWin) {
        p2psocket.emit("Winner", ID);
        console.log("winner event send")
        score = 0;
        setScore();
      }
      drawerReset();
      context.clearRect(0, 0, canvas[0].width, canvas[0].height);
      if (hosting) {
        drawerWord = randomWord;
      } else {
        p2psocket.emit('clientToServerWordCheck', { 'ar': { 'drawer': userType, word: randomWord }, "id": ID });
      }
      toDraw = [];

      //If the guesser guesses the word correctly, then drawer is found by checking for the userType and
      //comparing the drawers span context (which is the randomWord) to the initial saved drawerWord. If the guesser
      //does not guess correctly then the information object will only contain a guess property.
    } else if (userType === true && randomWord === information.word) {
      userType = false;
      console.log('drawer->guesser');
      guesserReset();
      context.clearRect(0, 0, canvas[0].width, canvas[0].height);
    }

    //If the user guesses correctly then an object will return that contains both the guess and word
    //property. Then this function will reset the canvas and guesser input for all other guessers.
    else if (userType === false && information.guess === information.word) {
      guesserReset();
      context.clearRect(0, 0, canvas[0].width, canvas[0].height);
    }
    //If the guesser does not guess correctly then the userGuesses div will be changed to the wrong guess to all
    //other clients,excluding the client that sent the guess since the emitter will be broadcasted.
    else {
      var guessArea = $('.userGuesses');
      guessArea.text(information.guess);
    }
  }

  //This guessToClient listener performs a function with the object created in the guessToServer listener.
  p2psocket.on('guessToClient', function (ar) {
    isGuessed(ar);
  });

  guessBox = $('input');
  guessBox.on('keydown', onKeyDown);

  //function to draw on the canvas/context.
  var draw = function (position) {
    context.beginPath();
    context.arc(position['position'].x, position['position'].y,
      6, 0, 2 * Math.PI);
    context.fill();
    p2psocket.emit('timeToDraw', Date.now() - position['time'])
  };

  //drawing boolean is used to determine when to draw if the user clicks down.
  var drawing = false;
  canvas = $('canvas');
  context = canvas[0].getContext('2d');
  canvas[0].width = canvas[0].offsetWidth;
  canvas[0].height = canvas[0].offsetHeight;
  //var touchEvents = require('touch-events');

  //drawing boolean is changed from true to false from the mousedown and mouseup events.
  canvas.on('mousedown', function () {
    drawing = true;
    //alert('click down')
  });

  canvas.on('mouseup', function () {
    drawing = false;
  });

  // Prevent scrolling when touching the canvas
  canvas.on("touchstart", function (e) {
    drawing = true
    console.log('in start')
    //alert('touch start')
    e.preventDefault();
  });

  canvas.on("touchend", function (e) {
    drawing = false
    console.log('in end')
    //alert('touch end')
    e.preventDefault();
  });

  canvas.on("touchmove", function (events) {
    console.log('in move');
    events.preventDefault();
    console.log(events.originalEvent.changedTouches[0])
    drawerDraw(events.originalEvent.changedTouches[0])
  });

  function drawerDraw(event) {
    if (userType | artist) {
      //alert('before drawing')
      if (drawing) {
        //alert('in drawing')
        var offset = canvas.offset();
        var position = {
          x: event.pageX - offset.left,
          y: event.pageY - offset.top
        };
        pos = { 'position': position, 'time': Date.now() }
        if (hosting) {
          if (userType || artist) {
            p2psocket.emit('serverToClient', pos);
            toDraw[toDraw.length] = pos;
          }
        }
        draw(pos);
        p2psocket.emit('clientToServer', pos);
        socketHost.emit('event',{"event":"serverToClient", "args":pos})
      }
    }
  }
  canvas.on('mousemove', drawerDraw);

  //This serverToClient listener will use the draw function when it is emmited. Which
  //will be in the server due to the mousemove event.
  p2psocket.on('serverToClient', draw);

  //----------------------server part--------------------//

  function localDraw(pt) {
    //if (!userType ) {
    context.beginPath();
    context.arc(pt["position"].x, pt["position"].y,
      6, 0, 2 * Math.PI);
    context.fill();
    toDraw[toDraw.length] = pt;
    draw(pt)
    console.log('after drawing')
    //}
  }

  function win(WinnerID) {
    score = 0;
    setScore();
    $('.playerId').text(WinnerID);
    $('.winner').fadeIn(1000, 'linear').delay(1000).fadeOut(1000, 'linear');
    if (hosting) {
      miggrateHost(WinnerID)
    }
  }


  p2psocket.on('deconnection', (ids) => {
    if (hosting) {
      totalUsers = ids.length;
      connectedUsersArray = ids;
    }
    if (totalUsers == 1) {
      drawerReset();
    }
    console.log(ID);
    console.log(ids);
  })

  //=================Partie commune server local host===================//

  p2psocket.on('clientToServerWordCheck', function (ar) {
    if (hosting) {
      wordCheckObject = ar.ar;
      if (wordCheckObject.drawer) {
        if (wordCheckObject.word !== drawerWord) {
          drawerWord = wordCheckObject.word;
          socketHost.emit('clientToServerWordCheck', ar);
        }
      }
    }
  });  //ok same

  p2psocket.on('clientToServer', function (clientObject) {
    if (hosting) {
      p2psocket.emit('serverToClient', clientObject);
      socketHost.emit('event',{"event":"serverToClient", "args":clientObject})
      localDraw(clientObject);
    }
  }); //ok same

  p2psocket.on('guessToServer', function (ar) {
    GuessToServer(ar)
  });

  function GuessToServer(ar) {
    if (hosting) {
      var message = ar.ar;
      if (message.guess.toLowerCase() === drawerWord) {
        console.log(message.guess + ' ' + drawerWord);
        var guessToClientObject = { guess: message.guess, word: drawerWord };
        p2psocket.emit('guessToClient', { "ar": guessToClientObject, "id": ar.id });
        drawerWord= 'aaaaaaaaaaa'
        socketHost.emit('event',{"event":"guessToClient", "args":{ "ar": guessToClientObject, "id": ar.id }})
        isGuessed({ "ar": guessToClientObject, "id": ar.id });
      } else {
        p2psocket.emit('guessToClient', { "ar": message, "id": ar.id });
        socketHost.emit('event',{"event":"guessToClient", "args":{ "ar": guessToClientObject, "id": ar.id }})
        isGuessed({ "ar": message, "id": ar.id });
      }
    }
  }

  p2psocket.on("Winner", function (ar) {
    console.log("winner received" + ar)
    if (hosting) {
      console.log("winner received" + ar)
      p2psocket.emit('endGame', { "ar": ar, "id": ar });
      socketHost.emit('event',{"event":"endGame", "args":ar})
      win(ar)
    }
  });

  p2psocket.on('drawerHere', function (ar) {
    if (hosting) {
      clientToServerDrawerCheck = ar.ar;
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
              p2psocket.emit('addNewDrawer', { "ar": true, "id": connectedUsersArray[i] });
              if (totalUsers === 1) {
                p2psocket.emit('wait', connectedUsersArray[i]);
              }
            } else {
              p2psocket.emit('resetGuessers', connectedUsersArray[i]);
            }
          }
        }
        drawerHere = false;
        drawerCheckCount = 0;
      }
    }
  });

  p2psocket.on('timeToDraw', (time) => {
    if (hosting) {
      console.log('time to draw : ' + time)
      
      socketHost.emit('event',{"event":'timeToDraw', "args":time})
    }
  })

  //================Migration part===============//

  //sender
  function miggrateHost(ID) {
    console.log('begin migration')
    dataToSend = { "ID": ID, "word": drawerWord, "hosting": true, "draw": toDraw }
    p2psocket.emit('DataTransfer', dataToSend)
  }

  p2psocket.on('Complete', () => {
    if (hosting) {
      hosting = false
      console.log('end transfert')
    }

  })

  //receiver
  p2psocket.on('DataTransfer', (data) => {
    if (data.ID == ID) {
      console.log('transfering' + data.draw)
      toDraw = data.draw;
      if (!userType) {
        drawerWord = data.word;
      }
      p2psocket.emit('Complete')
      hosting = data.hosting;
      socketHost.emit('IHost')
    }
  })

  p2psocket.on('newplayer', (id) => {
    toDraw.forEach(elem => {
      console.log(elem)
      p2psocket.emit('serverToClient', elem)
    })
  })

  p2psocket.on('measure',(measure)=>{
    console.log(measure)
  });
}


/************Manage role **************/
document.getElementById("display").onchange = function () {
  display = (this.value === "true")
  displayDraw()
}

function displayDraw() {
  if (display) {
    document.getElementById("canvas").style.display = "block"
    document.getElementById("artist").style.display = "block"
    artist = false
  }
  else {
    document.getElementById("canvas").style.display = "none";
    document.getElementById("artist").style.display = "none"
  }
}

document.getElementById("guessbox").onchange = function () {
  wordGuesser = (this.value == "true")
  displayGuessBox()
}

document.getElementById("artist").style.display = "none"
function displayGuessBox() {
  if (wordGuesser) {
    document.getElementById("guess").style.display = "block"
    document.getElementById("artist").style.display = "none"
  }
  else {
    document.getElementById("guess").style.display = "none";
    document.getElementById("artist").style.display = "block"
  }
}

document.getElementById("drawingarea").onchange = function () {
  artist = (this.value == "true")
}


document.addEventListener('DOMContentLoaded', init, false);