var db = exports;
exports.constructor = function () {};

var mysql = require('mysql');
var async = require('async');

var config = require('./config').get();

function DB () {
  this.config = {
    host: config.db.host,
    user: config.db.user,
    database: config.db.database,
    password: config.db.password
  };
}

DB.prototype.connect = function (cb) {
  this.connection = mysql.createConnection(this.config);
  this.connection.connect(cb);
};

DB.prototype._getRoomId = function (roomName) {
  cb = arguments[arguments.length - 1];
  this.connection.query('select id from rooms where name=?', roomName, function(err, res) {
    if (err) {
      return cb(err);
    }

    return cb(null, res[0].id);
  });
};

DB.prototype.get = function (message, cb) {
  function getMessages (roomId, cb) {
    this.connection.query(
      'select payload from adds where r_id = ? order by id desc limit ?',
      [roomId, message.limit],
      cb
    );
  }

  var jobs = [
    this.connection.beginTransaction.bind(this.connection),
    this._getRoomId.bind(this, message.room),
    getMessages.bind(this)
  ];

  async.waterfall(jobs, function(err, data) {
    if (err) {
      return this.connection.rollback(function () {
        cb(err);
      });
    }

    this.connection.commit(function(err) {
      if (err) {
        return cb(err);
      }

      return cb(null, data);
    });
  }.bind(this));
};

DB.prototype.add = function (message, cb) {
  function createRoom (res, unused, cb) {
    this.connection.query('insert into rooms set name=?', message.room, function(err) {
      if (err && err.code == 'ER_DUP_ENTRY') {
        // a room of this names already exists in the table, ignore it
        return cb(null);
      }

      return cb();
    });
  }

  function addMsg (roomId, cb) {
    console.log('inserting', message.value);
    this.connection.query(
      'insert into adds set r_id=?, payload=?',
      [ roomId, message.value ],
      cb
    );
  }

  var jobs = [
    this.connection.beginTransaction.bind(this.connection),
    createRoom.bind(this),
    this._getRoomId.bind(this, message.room),
    addMsg.bind(this)
  ];

  async.waterfall(jobs, function(err) {
    if (err) {
      return this.connection.rollback(function() {
        cb(err);
      });
    }

    this.connection.commit(cb);
  }.bind(this));
};

db.DB = DB;
