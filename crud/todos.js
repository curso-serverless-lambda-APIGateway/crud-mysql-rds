const connection = require('../connection');
const queryString = require('querystring');

module.exports.findAll = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const sql = 'SELECT * FROM todos';
  connection.query(sql, (error, rows) => {
    if (error) {
      callback({
        statusCode: 500,
        body: JSON.stringify(error)
      })
    } else {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          todos: rows
        })
      })
    }
  })
};

module.exports.findOne = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const sql = 'SELECT * FROM todos WHERE id = ?';
  connection.query(sql, [event.pathParameters.todoId], (error, row) => {
    if (error) {
      callback({
        statusCode: 500,
        body: JSON.stringify(error)
      })
    } else {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          todo: row
        })
      })
    }
  })
};

module.exports.create = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const body = queryString.parse(event['body']);
  const data = {
    todo: body.todo
  }

  const sql = 'INSERT INTO todos SET ?';
  connection.query(sql, [data], (error, result) => {
    if (error) {
      callback({
        statusCode: 500,
        body: JSON.stringify(error)
      })
    } else {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          res: `Tarea insertada correctamente con id ${result.insertId}`
        })
      })
    }
  })
};

module.exports.update = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const body = queryString.parse(event['body']);

  const sql = 'UPDATE todos SET todo = ? WHERE id = ?';
  connection.query(sql, [body.todo, event.pathParameters.todoId], (error, result) => {
    if (error) {
      callback({
        statusCode: 500,
        body: JSON.stringify(error)
      })
    } else {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          res: `Tarea actualizada correctamente`
        })
      })
    }
  })
};

module.exports.delete = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const sql = 'DELETE FROM todos WHERE id = ?';
  connection.query(sql, [event.pathParameters.todoId], (error, result) => {
    if (error) {
      callback({
        statusCode: 500,
        body: JSON.stringify(error)
      })
    } else {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          res: `Tarea eliminada correctamente`
        })
      })
    }
  })
};