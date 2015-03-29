var storage = exports;
exports.constructor = function () {};

var sqs = require('./sqs');
var AWS = require('aws-sdk');
var DB = require('./db').DB;
var async = require('async');

var config = require('./config').get();

AWS.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region
});

function Storage () {
  this.storageSqs = new sqs.SQS(config.sqs.storageQueueUrl);
  this.connectionSqs = new sqs.SQS(config.sqs.connectionQueueUrl);

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
Storage.prototype._replyAdd = function (originalReq, err) {
  if (err) {
    return this._replyErr(originalReq);
  }

  originalReq._success = true;
  this.connectionSqs.sendMessage(originalReq);
};

Storage.prototype._replyGet = function (originalReq, err, data) {
  if (err) {
    return this._replyErr(originalReq);
  }

  originalReq._success = true;
  originalReq._data = data;
  this.connectionSqs.sendMessage(originalReq);
};

Storage.prototype._handleAdd = function (message) {
  this.db.add(message, this._replyAdd.bind(this, message));
};

Storage.prototype._handleGet = function (message) {
  this.db.get(message, this._replyGet.bind(this, message));
};

Storage.prototype.handleMessage = function (message) {
  if (message._cmd === 'ADD') {
    return this._handleAdd(message);
  }

  if (message._cmd === 'get') {
    return this._handleGet(message);
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
