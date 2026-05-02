You can use local mongo db by spinning one up

mongod recommended
run from inside resqgo-api folder
mongod --dbpath ./db

to run as replica set
mongod --dbpath ./db --replSet rs0

mongosh --port 27017

run rs.initiate() in mongo shell
