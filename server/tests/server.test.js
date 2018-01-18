const expect = require('expect');
const request = require('supertest');
const { ObjectID } = require('mongodb');

const { app } = require('../server');
const { Todo } = require('../models/Todo');
const { User } = require('../models/User');
const { dummyTodos, populateTodos, dummyUsers, populateUsers } = require('./seed/seed');

beforeEach(populateUsers);
beforeEach(populateTodos);

describe('POST /todos', () => {
  it('should create a new todo', (done) => {
    const text = 'test todo text';
    request(app)
      .post('/todos')
      .set('x-auth', dummyUsers[0].tokens[0].token)
      .send({text})
      .expect(200)
      .expect((res) => {
        expect(res.body.text).toBe(text);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        Todo.find({text}).then((todos) => {
          expect(todos.length).toBe(1);
          expect(todos[0].text).toBe(text);
          done();
        }).catch((e) => {
          return done(e);
        });
      });
  });

  it('should not create todo with invalid data', (done) => {
    var text = '     ';

    request(app)
      .post('/todos')
      .set('x-auth', dummyUsers[0].tokens[0].token)
      .send({text})
      .expect(400)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        Todo.find().then((todos) => {
          expect(todos.length).toBe(2);
          done();
        }).catch((e) => {
          return done(e);
        });
      });
  });
});

describe('GET /todos', () => {
  it('should get all todos', (done) => {
    request(app)
      .get('/todos')
      .set('x-auth', dummyUsers[0].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.todos.length).toBe(1);
      })
      .end(done);
  });
});

describe('GET /todos/:id', () => {
  it('should return todo doc', (done) => {
    request(app)
      .get(`/todos/${dummyTodos[0]._id.toHexString()}`)
      .set('x-auth', dummyUsers[0].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).toBe(dummyTodos[0].text);
      })
      .end(done);
  });

  it('should not return todo doc created by others', (done) => {
    request(app)
      .get(`/todos/${dummyTodos[1]._id.toHexString()}`)
      .set('x-auth', dummyUsers[0].tokens[0].token)
      .expect(404)
      .end(done);
  });

  it('should return 404 if todo not found', (done) => {
    request(app)
      .get(`/todos/${new ObjectID().toHexString()}`)
      .set('x-auth', dummyUsers[0].tokens[0].token)
      .expect(404)
      .end(done);
  });

  it('should return 404 if id is invalid', (done) => {
    request(app)
      .get('/todos/ffff0000')
      .set('x-auth', dummyUsers[0].tokens[0].token)
      .expect(404)
      .end(done);
  });
});

describe('DELETE /todos/:id', () => {
  it('should remove a todo', (done) => {
    request(app)
      .delete(`/todos/${dummyTodos[0]._id.toHexString()}`)
      .set('x-auth', dummyUsers[0].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.todo._id).toBe(dummyTodos[0]._id.toHexString())
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        Todo.findById(res.body.todo._id).then((res) => {
          expect(res).toBe(null);
          done();
        }).catch((e) => {
          done(e);
        });
      });
  });
  
  it('should not remove a todo created by others', (done) => {
    request(app)
      .delete(`/todos/${dummyTodos[1]._id.toHexString()}`)
      .set('x-auth', dummyUsers[0].tokens[0].token)
      .expect(404)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        Todo.findById(dummyTodos[1]._id.toHexString()).then((res) => {
          expect(res).toExist();
          done();
        }).catch((e) => {
          done(e);
        });
      });
  });
  
  it('should return 404 if todo is not found', (done) => {
    request(app)
      .delete(`/todos/${ new ObjectID().toHexString()}`)
      .set('x-auth', dummyUsers[0].tokens[0].token)
      .expect(404)
      .end(done);
  });

  it('should return 404 if id is invalid', (done) => {
    request(app)
      .delete('/todos/fooba')
      .set('x-auth', dummyUsers[0].tokens[0].token)
      .expect(404)
      .end(done);
  });
});

describe('PATCH /todos/:id', () => {
  it('should update todo', (done) => {
    //update the 1st dummy element
    const body = {text: 'test', completed: true};
    request(app)
      .patch(`/todos/${dummyTodos[0]._id.toHexString()}`)
      .set('x-auth', dummyUsers[0].tokens[0].token)
      .send(body)
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).toBe(body.text);
        expect(res.body.todo.completed).toBe(body.completed);
        expect(res.body.todo.completedAt).toBeA('number');
      })
      .end(done);
  });

  it('should clear completedAt when todo is not completed', (done) => {
    request(app)
      .patch(`/todos/${dummyTodos[1]._id.toHexString()}`)
      .set('x-auth', dummyUsers[1].tokens[0].token)
      .send({completed: false})
      .expect(200)
      .expect(res => {
        expect(res.body.todo.completed).toBe(false);
        expect(res.body.todo.completedAt).toBe(null);
      })
      .end(done);
  });
});

describe('GET /usrs/me', () => {
  it('should return user if authenticated', (done) => {
    request(app)
      .get('/users/me')
      .set('x-auth', dummyUsers[0].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body._id).toBe(dummyUsers[0]._id.toHexString());
        expect(res.body.email).toBe(dummyUsers[0].email);
      })
      .end(done);
  });
  
  it('should return 401 if not authenticated', (done) => {
    request(app)
      .get('/users/me')
      .expect(401)
      .end(done);
  });
});

describe('POST /users', () => {
  it('should create a user', (done) => {
    const email = 'hello@wolrd.com';
    const password = 'helloooo';

    request(app)
      .post('/users')
      .send({email, password})
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-auth']).toExist();
        expect(res.body._id).toExist();
        expect(res.body.email).toBe(email);
      })
      .end((err) => {
        if (err) {
          return done(err);
        }
        
        User.findOne({email}).then((user) => {
          expect(user).toExist();
          expect(user.password).toNotBe(password);
          done();
        }).catch((e) => done(e));
      });
  });

  it('should return validation error if request is invalid', (done) => {
    const invalidEmail = 'foo';
    const invalidPass = 'bar';

    request(app)
      .post('/users')
      .send({invalidEmail, invalidPass})
      .expect(400)
      .end(done);
  });

  it('should not create user if email in use', (done) => {
    const dupEmail = dummyUsers[0].email;
    const fakePass = 'hhhhhhhhhh';

    request(app)
      .post('/users')
      .send({dupEmail, fakePass})
      .expect(400)
      .end(done);
  });
});

describe('POST /users/login', () => {
  it('should login user and return auth token', (done) => {
    request(app)
      .post('/users/login')
      .send({
        email: dummyUsers[1].email,
        password: dummyUsers[1].password
      })
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-auth']).toExist();
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        User.findById(dummyUsers[1]._id).then((user) => {
          expect(user.tokens[1]).toInclude({
            access: 'auth',
            token: res.headers['x-auth']
          });
          done();
        }).catch((e) => done(e));
      });
  });

  it('should reject invalid login', (done) => {
    request(app)
      .post('/users/login')
      .send({
        email: dummyUsers[1].email,
        password: 'wrongPassword'
      })
      .expect(400)
      .expect((res) => {
        expect(res.headers['x-auth']).toNotExist();
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        User.findById(dummyUsers[1]._id).then((user) => {
          expect(user.tokens.length).toBe(1);
          done();
        }).catch((e) => {
          done(e);
        });
      });
  });
});

describe('DELETE /users/me/token', () => {
  it('should delete the token if provided correct credentials', (done) => {
    request(app)
      .delete('/users/me/token')
      .set('x-auth', dummyUsers[0].tokens[0].token)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        User.findById(dummyUsers[0]._id).then((user) => {
          expect(user.tokens.length).toBe(0);
          done();
        }).catch((e) => done(e));
      });
  });
});
