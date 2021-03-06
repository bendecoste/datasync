// This is done for better stack traces
var connection = exports;
exports.constructor = function () {};

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var _ = require('lodash');

var SQS = require('./sqs').SQS;
var config = require('./config').get();

app.get('/datasync.js', function (req, res) {
  res.sendfile('datasync.js');
});

app.get('/media/style.css', function (req, res) {
  res.sendfile('media/style.css');
});

app.get('/', function(req, res) {
  res.sendfile('index.html');
});

function Connection () {
  this.connectionSqs = new SQS(config.sqs.connectionQueueUrl);
  this.storageSqs = new SQS(config.sqs.storageQueueUrl);

  this._sockets = {};
  this._rooms = {};

  io.on('connection', this._handleSocketConnect.bind(this));

  http.listen(8080, function () {
    console.log('listening on *:8080');
  });
}

Connection.prototype._handleSocketConnect = function (socket) {
  console.log('new socket connection with id', socket.id);

  this._sockets[socket.id] = socket;

  socket.on('disconnect', this._handleSocketDisconnect.bind(this, socket));
  socket.on('join', this._handleJoin.bind(this, socket));
  socket.on('get', this._handleGet.bind(this, socket));
  socket.on('ADD', this._handleAdd.bind(this, socket));
};

Connection.prototype._handleSocketDisconnect = function (socket) {
  console.log('socket disconnected: ', socket.id);
  // no need to store this anymore
  this._sockets[socket.id] = undefined;
};

Connection.prototype._handleJoin = function (socket, room) {
  console.log('received join request from', socket.id, 'to join room', room);

  if (!this._rooms[room]) {
    this._rooms[room] = [];
  }

  this._rooms[room].push(socket);
  socket.emit('joined');
};

Connection.prototype._handleGet = function (socket, payload) {
  console.log('recevied get request from', socket.id);

  payload._socketId = socket.id;
  payload._cmd = 'get';

  this.storageSqs.sendMessage(payload);
};

Connection.prototype._handleAdd = function (socket, payload) {
  console.log('received add message from', socket.id, 'for', payload);

  payload._socketId = socket.id;
  payload._cmd = 'ADD';

  this.storageSqs.sendMessage(payload);
};

Connection.prototype._handleAddResponse = function (message) {
  _.forEach(this._rooms[message.room], function(socket) {
    console.log('broadcasting add success to', socket.id, 'message was: ', message);
    socket.emit('add#complete', message);
  });
};

Connection.prototype._handleGetResponse = function (message) {
  var socket = this._sockets[message._socketId];
  if (!socket) {
    // nothing to do if we pull expired socket
    return;
  }

  console.log('replying back to client', socket.id, 'with', message);

  socket.emit('get#complete', message);
};

Connection.prototype._handleResponse = function (message) {
  if (message._cmd === 'ADD') {
    return this._handleAddResponse(message);
  } else if (message._cmd === 'get') {
    return this._handleGetResponse(message);
  }

  console.log('unknown response from storage service:', message);
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
