require('./config/config');

const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');
const { ObjectID } = require('mongodb');
const bcrypt = require('bcryptjs');

const { mongoose } = require('./db/mongoose');
const { Todo } = require('./models/Todo');
const { User } = require('./models/User');
const { authenticate } = require('./middlewares/authenticate');

const app = express();

app.use(bodyParser.json());


app.get('/users/me', authenticate, (req, res) => {
  res.send(req.user);
});

app.post('/todos', authenticate, (req, res) => {
  const todo = new Todo({
    text: req.body.text,
    _creator: req.user._id
  });
  todo.save().then((doc) => {
    res.send(doc);
  }, (e) => {
    res.status(400).send(e);
  });
});

app.get('/todos', authenticate, (req, res) => {
  Todo.find({
    _creator: req.user._id
  }).then((todos) => {
    res.send({todos})
  }, (e) => {
    res.status(400).send(e);
  });
});

app.get('/todos/:id', authenticate, (req, res) => {
  const id = req.params.id;
  if ( !ObjectID.isValid(id)) {
    return res.status(404).send({error: 'Invalid ID'});
  }
  Todo.findOne({
    _id: id,
    _creator: req.user._id
  }).then((todo) => {
    if (todo) {
      res.send({todo});
    } else {
      res.status(404).send({error: 'todo not found'});
    }
  }, (e) => {
    res.status(400).send(e);
  });
});

app.delete('/todos/:id', authenticate, (req, res) => {
  const id = req.params.id;
  if (!ObjectID.isValid(id)) {
    return res.status(404).send({error: 'Invalid ID'});
  }
  Todo.findOneAndRemove({
    _id: id,
    _creator: req.user._id
  }).then((todo) => {
    if (todo) {
      res.send({todo});
    } else {
      res.status(404).send({error: 'todo not found'});
    }
  }, (e) => {
    res.status(400).send(e);
  });
});

app.patch('/todos/:id', authenticate, (req, res) => {
  const id = req.params.id;
  var body = _.pick(req.body, ['text', 'completed']);

  if (!ObjectID.isValid(id)){
    return res.status(404).send({error: 'Invalid ID'});
  }

  if (_.isBoolean(body.completed) && body.completed) {
    body.completedAt = new Date().getTime();
  } else {
    body.completed = false;
    body.completedAt = null;  //setting to null will remove it from database
  }

  Todo.findOneAndUpdate({
    _id: id,
    _creator: req.user._id
  }, {$set: body}, {new: true}).then((todo) => {
    if (!todo){
      return res.status(404).send({error: 'todo not found'});
    }
    res.send({todo});
  },(e) => {
    res.status(400).send();
  });
});

app.post('/users', (req, res) => {
  var body = _.pick(req.body, ['email', 'password']);
  const userNew = new User(body);
  userNew.save().then(() => {
    return userNew.generateAuthToken();
  }).then((token) => {
    res.header('x-auth', token).send(userNew);
  }).catch((e) => {
    res.status(400).send(e);
  });
});

app.post('/users/login', (req, res) => {
  var body = _.pick(req.body, ['email', 'password']);
  /*User.findOne({email: body.email}).then((user) => {
    bcrypt.compare(body.password, user.password, (err, match) => {
      if (err) {
        return res.status(400).send(err);
      }
      if (!match) {
        return res.status(401).send();
      }
      res.header('x-auth', user.tokens[0].token).send(user);
    })
  }).catch(e => res.status(400).send());
  */
  User.findByCredentials(body.email, body.password).then((user) => {
    user.generateAuthToken().then((token) => {
      res.header('x-auth', token).send(user);
    });
  }).catch((e) => {
    res.status(400).send();
  });
});

app.delete('/users/me/token', authenticate, (req, res) => {
  req.user.removeToken(req.token).then(() => {
    res.status(200).send();
  }, () => {
    res.status(400).send();
  });
});

app.listen(process.env.PORT, () => {
  console.log('Started on port 3000');
});

module.exports = { app };
