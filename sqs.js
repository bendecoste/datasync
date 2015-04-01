var sqs = exports;
exports.constructor = function () {};

var _ = require('lodash');
var AWS = require('aws-sdk');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var config = require('./config').get();

function SQS (queueUrl) {
  EventEmitter.call(this);
  this.messenger = new AWS.SQS();
  this.queueUrl = queueUrl;
}

util.inherits(SQS, EventEmitter);

AWS.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region
});

SQS.prototype.sendMessage = function(msg) {
  try {
    msg = JSON.stringify(msg);
  } catch (e) {
    // we failed to convert the message into a string, omit an error
    this.emit('messageError', msg);
  }

  var params = {
    MessageBody: msg,
    QueueUrl: this.queueUrl,
    DelaySeconds: 0
  };

  console.log('sending sqs message');

  this.messenger.sendMessage(params, function (err, data) {
    console.log('sent message', err, data);
  });
};

SQS.prototype.listen = function () {
  var params = {
    QueueUrl: this.queueUrl,
    WaitTimeSeconds: 1
  };

  this.messenger.receiveMessage(params, function(err, data) {
    if (err) {
      console.log('error getting data', retrying);
      return this.listen();
    }

    if (!data.Messages) {
      // no useful data returned, nothing to do but retry
      return this.listen();
    }

    // if there is no error, emit the data and fetch again
    _.forEach(data.Messages, function(message) {
      // before emitting the data, delete the message from sqs so we do not
      // process it twice.  If processing fails, it will be re-added to
      // retry
      var delParams = {
        QueueUrl: this.queueUrl,
        ReceiptHandle: message.ReceiptHandle
      };

      this.messenger.deleteMessage(delParams, function(err, data) {
        if (err) {
          console.log('error deleting message', err);
          return this.listen();
        }

        console.log('got sqs request', message);
        this.emit('data', JSON.parse(message.Body));
        this.listen();

      }.bind(this));
    }.bind(this));

    this.listen();
  }.bind(this));
};

sqs.SQS = SQS;
