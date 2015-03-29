var storage = exports;
exports.constructor = function () {};

var sqs = require('./sqs');
var AWS = require('aws-sdk');
var DB = require('./db').DB;
var async = require('async');

AWS.config.update({
  accessKeyId: 'AKIAJYMATCHMKFXEBLTQ',
  secretAccessKey: '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',
  region: 'us-east-1'
});

function Storage () {
  this.storageSqs = new sqs.SQS('https://sqs.us-east-1.amazonaws.com/005341201218/storage');
  this.connectionSqs = new sqs.SQS('https://sqs.us-east-1.amazonaws.com/005341201218/connection');

  this.db = new DB();
}

Storage.prototype._replyErr = function (originalReq) {
  // TODO
  //
  // Reply to requester that we have failed
  // Possibly add message back to SQS ?

  originalReq._success = false;
  this.connectionSqs.sendMessage(originalReq);
};

// Reply back to the requesting service
Storage.prototype._reply = function (originalReq, err) {
  if (err) {
    return this._replyErr(originalReq);
  }

  originalReq._success = true;
  this.connectionSqs.sendMessage(originalReq);
};

Storage.prototype._handleAdd = function (message) {
  this.db.add(message, this._reply.bind(this, message));
};

Storage.prototype.handleMessage = function (message) {
  if (message._cmd === 'ADD') {
    return this._handleAdd(message);
  }

  // default case -- nothing to do here, no recognized command so we ignore
  // the request
  console.log('unknown command, ignoring request', message);
};

// Make the storage server start working, this will setup connections with our
// database, as well as start listening to incoming messages.
Storage.prototype.listen = function (cb) {
  var tasks = {
    // add to this array if we need to do more things during startup.
    db: this.db.connect.bind(this.db)
  };

  async.parallel(tasks, function(err, res) {
    if (err) {
      console.log('fatal -- error setting up');
      throw err;
    }

    this.storageSqs.listen();
    this.storageSqs.on('data', this.handleMessage.bind(this));
  }.bind(this));

};

storage.Storage = Storage;

var s = new Storage();
s.listen();
