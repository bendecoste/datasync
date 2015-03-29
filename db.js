var db = exports;
exports.constructor = function () {};

var mysql = require('mysql');
var async = require('async');

function DB () {
  this.config = {
    host: 'localhost',
    user: 'bdecoste',
    database: 'csProj'
  };
}

DB.prototype.connect = function (cb) {
  this.connection = mysql.createConnection(this.config);
  this.connection.connect(cb);
};

DB.prototype.add = function (message, cb) {
  function createRoom (res, unused, cb) {
    this.connection.query('insert into rooms set name=?', message.room, function(err) {
      if (err && err.code == 'ER_DUP_ENTRY') {
        // a room of this names already exists in the table, ignore it
        return cb();
      }

      return cb(err);
    });
  }

  function getRoomId (cb) {
    this.connection.query('select id from rooms where name=?', message.room, function(err, res) {
      if (err) {
        return cb(err);
      }

      console.log('added room id', res[0].id);
      return cb(null, res[0].id);
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
    getRoomId.bind(this),
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
