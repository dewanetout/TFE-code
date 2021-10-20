var pictionary = function() {
    var canvas, context;
    var socket = io();//'http://localhost:8080');
    var play = false;

    var guessBox;
    var userType;
    var initialGuess;
    var randomWord;
    var ID;
    var guesserCount = 0;
    var score = 0;
    var scoreToWin = 2;


    socket.on('setID', function(userID) {
        ID = userID;
    });

    socket.on('wait', function(){
        $('.waiting').fadeIn('fast');
        $('#top-message .drawerTag').css('display', 'none');
        play = false;
    });
    /*************************Measure******************/
    //latency test engaged
    var test;
    var departure;
    var measure;
    var start=0;

    socket.on('test', function(nb){
        departure = new Date().getTime();
        start = new Date().getTime();
        socket.emit('latency');
        test = nb;
        measure = [];
        measure[0]=Date.now();
    });

    socket.on('latencyback', function(){
        console.log(test);
        //measure[measure.length]=new Date().getTime()-departure;
        measure[measure.length-1]=Date.now()-measure[measure.length-1];
        //departure= new Date().getTime();
        if(test>0){
            test--;
            measure[measure.length]=Date.now();
            socket.emit('latency');
        } else if(test==0) {
            console.log(measure.length);
            console.log(measure);
            console.log(new Date().getTime()-start);
            socket.emit('latencyResult',measure);
            test --;
            measure=[];
        }
    });

    socket.on('loss', function(){
        socket.emit('latency');
    });

    /**********************Game event***********************/
    socket.on('play', function(){
        console.log('inPlay');
        if(userType){
        $('.waiting').delay(10).fadeOut('fast');
        $('#top-message .drawerTag').css('display', 'inline-block');
        }
        play = true;
    });

    socket.on('playerJoined', function(totalUsers) {
        $('.totalPlayers').text(totalUsers);
        $('.playerJoined').fadeIn(1000, 'linear').delay(1000).fadeOut(1000, 'linear');
    });

    socket.on('playerLeft', function(totalUsers) {
        $('.totalPlayers').text(totalUsers);
        $('.playerLeft').fadeIn(1000, 'linear').delay(1000).fadeOut(1000, 'linear');
    });


    var WORDS = [
        "voiture","fleur","maison", "nuage", "arbre", "ampoule", "gsm", "chaussure", "vaisselle", "pied", "ballon",
        "plage","bonbon","fusil","avion","chaise","table","douche","lit","argent",
        "souris","couteau","bateau","coeur","carre","main","oiseau","mouton","elephant","fourchette",
        "yeux","banane","vache","marteau","tortue","bras","cd","moto","sucette","soleil"
    ];

    //drawerReset function clears the userGuesses div and displays the drawerTag showing the user it is
    //their turn to draw the displayed word.
    var drawerReset = function() {
        randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
        setScore();
        $('.userGuesses').empty();
        if(play){
            $('#top-message .drawerTag').css('display', 'inline-block');
        }
        $('.drawerTag span').text(randomWord);
        $('#top-message #guess').css('display', 'none');
        context.clearRect(0, 0, canvas[0].width, canvas[0].height);
    };

    //Get the word to guess from the text
    var textCut = function(text, word) {
        var offset = 0;
        var cmp = 0;
        for(var i = 0; i<text.length; i++){
            if(i-offset< word.length){
                if(word[i-offset] === text[i]){
                    cmp++;
                } else {
                    cmp = 0;
                    offset++;
                }
                if(cmp === word.length){return true;}
            }
        }
        console.log(cmp);
        console.log(word.length);
        return false;
    };

    //Update the score on the page
    var setScore = function(){
        $('.score').text(score);
    }

    //The guesserReset also resets the userGuesses div and displays the make a guess input. This tells the user
    //it is their turn to make a guess.
    var guesserReset = function() {
        setScore();
        play=true;
        $('.userGuesses').empty();
        $('#top-message #guess').css('display', 'inline-block');
        $('#top-message .drawerTag').css('display', 'none');
        context.clearRect(0, 0, canvas[0].width, canvas[0].height);
    };

    //The userTypeCheck listener gets the type parameter from the server and declares the clients userType variable.
    //The server takes the first user as a drawer(a drawer's userType = true), and all subsequent connections
    //are guessers (a guessers userType = false).
    socket.on('userTypeCheck', function(type) {

        userType = type;
        if (userType === true) {
            drawerReset();
        } else if (userType === false) {
            guesserReset();
        }

        //This clientToServerWordCheck listener sends an object to the server containing the userType and randomWord.
        socket.emit('clientToServerWordCheck', { drawer: userType, word: randomWord });

    });

    socket.on('endGame', function(WinnerID){
        score = 0;
        setScore();
        $('.playerId').text(WinnerID);
        $('.winner').fadeIn(1000, 'linear').delay(1000).fadeOut(1000, 'linear');
    });

    //The serverToClientDrawerCheck listener will have a function which emits the userType back to the server.
    socket.on('serverToClientDrawerCheck', function() {
        socket.emit('drawerHere', userType);
    });

    //addNewDrawer and resetGuessers are listeners to restart the game and add a new drawer when the previous drawer so happens
    //to leave the game.
    socket.on('addNewDrawer', function(addDrawer) {
        userType = addDrawer;
        drawerReset();
        socket.emit('clientToServerWordCheck', { drawer: userType, word: randomWord });

    });

    socket.on('resetGuessers', function() {
        guesserReset();
    });

    //function for the enter click. This click is only available to the guesser and not the drawer.
    //The initialGuess variable is assigned to the users guess on every enter click. Then the guessToServer
    //listener emits an object to the server containing the users guess.
    var onKeyDown = function(event) {
        if (event.keyCode != 13) { // Enter
            return;
        }

        if (userType === false) {
            initialGuess = guessBox.val();
            socket.emit('guessToServer', { guess: guessBox.val() });
            guessBox.val('');
        }

    };

    //This guessToClient listener performs a function with the object created in the guessToServer listener.
    socket.on('guessToClient', function(information) {

        //If the guesser guesses the word correctly then an object is emitted to ALL clients including the client that emited.
        //But if the guesser does not guess the word correctly then a guessToServer listener is broadcasted.
        //If the guessToServer listener is broadcasted then the following if statement will never be true.
        if (information.guess === initialGuess) {
            userType = true;
            score +=1;
            if(score == scoreToWin){
                socket.emit("Winner", ID);
                score=0;
                setScore();
            }
            drawerReset();
            context.clearRect(0, 0, canvas[0].width, canvas[0].height);
            socket.emit('clientToServerWordCheck', { drawer: userType, word: randomWord });
            
            //If the guesser guesses the word correctly, then drawer is found by checking for the userType and
            //comparing the drawers span context (which is the randomWord) to the initial saved drawerWord. If the guesser
            //does not guess correctly then the information object will only contain a guess property.
        } else if (userType === true && textCut($('span').text(),information.word)) {
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
    });

    guessBox = $('input');
    guessBox.on('keydown', onKeyDown);

    //function to draw on the canvas/context.
    var draw = function(position) {
        context.beginPath();
        context.arc(position.x, position.y,
            6, 0, 2 * Math.PI);
        context.fill();
    };

    //drawing boolean is used to determine when to draw if the user clicks down.
    var drawing = false;
    canvas = $('canvas');
    context = canvas[0].getContext('2d');
    canvas[0].width = canvas[0].offsetWidth;
    canvas[0].height = canvas[0].offsetHeight;

    //drawing boolean is changed from true to false from the mousedown and mouseup events.
    canvas.on('mousedown', function() {
        drawing = true;
    });

    canvas.on('mouseup', function() {
        drawing = false;
    });

    canvas.on('mousemove', function(event) {
        if (userType) {
            if (drawing) {
                var offset = canvas.offset();
                var position = {
                    x: event.pageX - offset.left,
                    y: event.pageY - offset.top
                };
                draw(position);
                socket.emit('clientToServer', position);
            }
        }
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
    event = events.originalEvent.changedTouches[0]
    events.preventDefault();
    if (userType) {
        if (drawing) {
    console.log('in draw');
            var offset = canvas.offset();
            var position = {
                x: event.pageX - offset.left,
                y: event.pageY - offset.top
            };
            draw(position);
            socket.emit('clientToServer', position);
        }
    }
  });


    //This serverToClient listener will use the draw function when it is emmited. Which
    //will be in the server due to the mousemove event.
    socket.on('serverToClient', draw);

};

$(document).ready(function() {
    pictionary();
});