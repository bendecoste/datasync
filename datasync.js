function DataSync () {
}

DataSync.prototype.connect = function (cb) {
  this.socket = io({ port: 3000 });
  this.socket.on('connect', cb.bind(cb, this));

  return this;
};

DataSync.prototype.room = function (name) {
  if (this.socket == null || !this.socket.connected) {
    throw new Error('You must establish a datasync connection before creating a room');
  }

  return new Room(name, this);
}

function Room (room, ds) {
  this.room = room;
  this.ds = ds;
}

Room.prototype.add = function (value) {
  this.ds.socket.emit('ADD', {
    room: this.room,
    value: value
  });
};

Room.prototype.onadd = function (cb) {
  this.ds.socket.on('add#complete', function(payload) {
    if (payload.room === this.room) {
      cb(payload.value);
    }
  }.bind(this));
};
