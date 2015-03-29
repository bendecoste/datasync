function DataSync () {
  // rooms we have joined
  this.rooms = {};
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

  if (this.rooms[name]) {
    return this.rooms[name];
  }

  var room = new Room(name, this);
  this.rooms[name] = room;

  return room;
}

function Room (room, ds) {
  this.room = room;
  this.ds = ds;

  this.joined = false;
}

Room.prototype.join = function (cb) {
  if (this.joined) {
    console.log('already joined');
    return;
  }

  this.joinCb = cb;

  this.ds.socket.emit('join', this.room);
  this.ds.socket.on('joined', this._handleJoined.bind(this));
  this.ds.socket.on('get#complete', this._handleGetComplete.bind(this));
};

Room.prototype._handleGetComplete = function (msg) {
  var resp = _.map(msg._data, function(data) {
    return data.payload;
  });

  this.getCb(resp);
};

Room.prototype._handleJoined = function () {
  this.joined = true;
  this.joinCb();
};

Room.prototype.get = function (limit, cb) {
  this.ds.socket.emit('get', {
    room: this.room,
    limit: limit
  });

  this.getCb = cb;
};

Room.prototype.add = function (value) {
  if (!this.joined) {
    throw new Error('cannot add mesasge before joining room');
  }

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
