// This is done for better stack traces
var connection = exports;
exports.constructor = function () {};

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var SQS = require('./sqs').SQS;

app.get('/datasync.js', function (req, res) {
  res.sendfile('datasync.js');
});

app.get('/', function(req, res) {
  res.sendfile('index.html');
});

function Connection () {
  this.connectionSqs = new SQS('https://sqs.us-east-1.amazonaws.com/005341201218/connection');
  this.storageSqs = new SQS('https://sqs.us-east-1.amazonaws.com/005341201218/storage');

  this._sockets = {};

  io.on('connection', this._handleSocketConnect.bind(this));

  http.listen(3000, function () {
    console.log('listening on *:3000');
  });
}

Connection.prototype._handleSocketConnect = function (socket) {
  this._sockets[socket.id] = socket;

  socket.on('disconnect', this._handleSocketDisconnect.bind(this, socket));
  socket.on('ADD', this._handleAdd.bind(this, socket));
};

Connection.prototype._handleSocketDisconnect = function (socket) {
  // no need to store this anymore
  this._sockets[socket.id] = undefined;
};

Connection.prototype._handleAdd = function (socket, payload) {
  console.log('received add message:', payload);

  payload._socketId = socket.id;
  payload._cmd = 'ADD';

  this.storageSqs.sendMessage(payload);
};

Connection.prototype._handleResponse = function (message) {
  var socket = this._sockets[message._socketId];
  socket.emit('add#complete', message);
};

Connection.prototype.listen = function (cb) {
  this.storageSqs.on('messageError', function (msg) {
    console.log('received error for', msg._socketId);

    // TODO -- notify the client (use the socket id to send a message to that
    //         client.
  });

  this.connectionSqs.listen();
  this.connectionSqs.on('data', this._handleResponse.bind(this));
};

connection.Connection = Connection;

var c = new Connection();
c.listen();
