//----------------Port and address--------------//
//Set up the default value of address and port
var PORTSERVER = 8081;
var PORTUSER = 8080;
var IP = 'localhost';
var analysis = false; //implemented after
var nbmeasure = 20;
var display = true;
var sendDraw = false;

//----------------Loss and latency--------------//
var packetLoss = 0; //packetLoss = 0 means no packet loss; 100 = all packets are lose
var latency = 10; //additional latency give in ms
var latencyVariance = 0; //max possible adding or substract ms to the latency  !!! must be set up after the latency (if changed)


//---------------------Option analysis-------------//
var offset = 2; //used to analyse arguments
//ajouter quelle simumlation lancer
while(offset<process.argv.length){
    option();
}

function option(){
    switch (process.argv[offset]) {
        case "-up" : 
            var port = parseInt(process.argv[offset+1]);
            if(isNaN(port)){
                console.log('User port not valid! the default port will be used');
            } else if(port === PORTSERVER){
                console.log('The user port cannot be the same that the server port!')
            } else {PORTUSER = port;}
            offset += 2;
            break;
        case "-sp" : 
            var port = parseInt(process.argv[offset+1]);
            if(isNaN(port)){
                console.log('Server port not valid! The default port will be used');
            } else if (port === PORTUSER){
                console.log('The server port cannot be the same that the user port!')
            } else {PORTSERVER = port;}
            offset += 2;
            break;
        case "-i" : 
            IP = process.argv[offset+1];
            offset += 2;
            break;
        case "-m" :
            analysis=true;
            offset ++;
            break;
        case "-nd" :
            display=false;
            offset ++;
            break;
        case "-l" : 
            var lat = parseInt(process.argv[offset+1]);
            if(isNaN(lat)){
                console.log('The latency gived is not a number!');
            } else if(lat<0){
                console.log('The latency must be zero or positive');
            } else {
                latency = lat;
            }
            offset += 2;
            break;
        case "-pl" :
            var pl = parseInt(process.argv[offset+1]);
            if(isNaN(pl)){
                console.log('The paquet loss gived is not a number!');
            } else if(pl<0 || pl>100){
                console.log('The paquet must be between 0 and 100');
            } else {
                packetLoss = pl;
            }
            offset += 2;
            break;
        case "-vl" : 
            var latvar = parseInt(process.argv[offset+1]);
            if(isNaN(latvar)){
                console.log('The latency variance gived is not a number!');
            } else if(latvar>latency || latvar<0){
                console.log('The latency variance must be positive and smaller than latency');
            } else {
                latencyVariance = latvar;
            }
            offset += 2;
            break;
        case "sendDraw" :
            sendDraw = true
        default : 
            console.log('Argument not recognise!');
            break;
    }
    return;
}

//----------------------show the parameters--------------------//
if(display){
    console.log('The server port is : ' + PORTSERVER);
    console.log('The address used to connect to the game is : http://' + IP + ':' + PORTUSER);
    console.log('the ip of the server is : ' + IP);
    console.log('will we do measurements? ' + analysis);

    console.log('\n' + packetLoss + ' % of the paquet will be loss');
    console.log('The latency added is ' + latency + ' ms');
}


//-------------------Start the server and connexion-----------//
var http = require('http');
var express = require('express');
var socket_io = require('socket.io');
var client = require('socket.io-client');

var app = express();
app.use(express.static('public'));

var server = http.Server(app);
var io = socket_io(server);

io.on('connection', function(socket){
    socketRelay(socket);
})

server.listen(PORTUSER, function() {
    console.log('Please navigate to http://localhost:' + PORTUSER);
});

//--------------Latency and data losing-------------//
function giveLatency(){
    return (Math.random()*latencyVariance-latencyVariance/2+latency);
}

function isLoss(){
    return ((1-Math.sqrt(1-packetLoss/100))-Math.random())<0;
}

//-------------------Socket gestion------------------//
var NextID = 0;
var regroup=0;
var record = []; //this is an array of array containing in order [playerID,]
function socketRelay(socket){
    var transfert = client.connect('http://localhost:' + PORTSERVER);
    NextID ++;
    var id = NextID;

    if(display){console.log(NextID);}

    if(analysis){
        socket.emit('test',nbmeasure);
    }

    if(sendDraw){
        
    }

    transfert.onAny((event, arg) => {
        if(event !== 'latencyback'){
            setTimeout(() => {
                socket.emit(event,arg);
            }, (giveLatency()/2));
        }
    });

    transfert.on('latencyback', () => {
        setTimeout(() => {
            if(isLoss()){
                socket.emit('latencyback');
            } else {
                transfert.emit('loss');
            }
        }, 1*(giveLatency()/2));
    })

    socket.onAny((event,arg) => { 
        if(event !== 'latency'){
            setTimeout(() => {
                transfert.emit(event,arg);
            }, (giveLatency()/2));
        }
    });

    socket.on('disconnect', function(){
        NextID--;
        transfert.close();
    });

    socket.on('latency', function(){
        setTimeout(function() {
            if(isLoss()){
                transfert.emit('latency');
            } else {
                socket.emit('loss');
            }
        }, 1*(giveLatency()/2));//1*(giveLatency()/2));
    });

    socket.on('latencyResult', function(result){
        var mean = sum(result)/nbmeasure;
        record[id-1]=mean;
        //console.log(result);
        regroup++;
        console.log('the mean of ' + id + ' is : ' + mean);
        if(regroup == NextID){
            global = sum(record)/record.length;
            console.log('global mean is : ' + global);
        }
    });
}

//gerer les analyses statistiques (outsiders,...)
function sum(array){
    var total=0;
    array.forEach(element => {
        total += element;
    });
    return total;
}