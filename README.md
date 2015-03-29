# DataSync

## Usage

### Prerequisites

Copy `config.json.example` and fill it in with your actual data.  You will need:

#### SQS

two SQS queue's running on your AWS account with access Id's and keys.  These are
used for the storage and connection queues.

#### MySQL
You need MySQL running on your machine, you must create a database that has the
proper schema that the application expects.  Here are the two tables described, you
should be able to reproduce these tables from the dumb:

```mysql
mysql> describe rooms;
+-------+-------------+------+-----+---------+----------------+
| Field | Type        | Null | Key | Default | Extra          |
+-------+-------------+------+-----+---------+----------------+
| id    | int(11)     | NO   | PRI | NULL    | auto_increment |
| name  | varchar(55) | YES  | UNI | NULL    |                |
+-------+-------------+------+-----+---------+----------------+
2 rows in set (0.00 sec)

mysql> describe adds;
+---------+---------------+------+-----+---------+----------------+
| Field   | Type          | Null | Key | Default | Extra          |
+---------+---------------+------+-----+---------+----------------+
| id      | int(11)       | NO   | PRI | NULL    | auto_increment |
| r_id    | int(11)       | NO   |     | NULL    |                |
| payload | varchar(1024) | YES  |     | NULL    |                |
+---------+---------------+------+-----+---------+----------------+
3 rows in set (0.00 sec)
```

The commands I ran to create the tables look something like this

```mysql
create table rooms(
  id int(11) not null primary key auto increment,
  name varchar(55) not null unique
);

create table adds(
  id int(11) not null primary key auto increment,
  r_id int(11) not null,
  payload varchar(1024)
);
```

#### NodeJS
I used Node.js `v0.10.28` to develop this, but anything around this version should work.

### Running
After cloning the repo run `npm install` to get all dependencies.  Run `node connection.js` to
run the connection server, and `node storage.js` to run the storage server.  Note that these
are two different processes.


## TODO

* We need a better looking demo app (index.html)
* This all needs to get deployed to AWS
* Report for this iteration
* Powerpoint for this iteration
* The client sdk needs to be compiled into a single script (socket.io, lodash, and datasync should all be the same file).
