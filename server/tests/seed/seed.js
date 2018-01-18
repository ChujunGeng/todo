const { ObjectID } = require('mongodb');
const jwt = require('jsonwebtoken');

const { Todo } = require('../../models/Todo');
const { User } = require('../../models/User');

const userOneId = new ObjectID();
const userTwoId = new ObjectID();

const dummyUsers = [
  {
    _id: userOneId,
    email: 'foo@bar.com',
    password: 'secretPass',
    tokens: [
      {
        access: 'auth',
        token: jwt.sign({_id: userOneId, access: 'auth'}, process.env.JWT_SECRET).toString()
      }]
  },
  {
    _id: userTwoId,
    email: 'dummy@example.com',
    password: 'userTwoPass',
    tokens: [
      {
        access: 'auth',
        token: jwt.sign({_id: userTwoId, access: 'auth'}, process.env.JWT_SECRET).toString()
      }]
  }
];

const dummyTodos = [
  {
    _id: new ObjectID(),
    text: 'First test todo',
    _creator: userOneId
  },
  {
    _id: new ObjectID(),
    text: 'Second test todo',
    completed: true,
    completedAt: "402",
    _creator: userTwoId
  }
];

const populateTodos = (done) => {
  Todo.remove({}).then(() => {
    return Todo.insertMany(dummyTodos);
  }).then(() => done());
};

const populateUsers = (done) => {
  User.remove({}).then(() => {
    const userOne = new User(dummyUsers[0]).save();
    const userTwo = new User(dummyUsers[1]).save();

    //wait for both above promises to return
    return Promise.all([userOne, userTwo]);
  }).then(() => done());
};

module.exports = {
  dummyTodos, 
  populateTodos, 
  dummyUsers, 
  populateUsers
};
