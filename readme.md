# API con Amazon RDS utilizando MySQL

1. [Inicialización del proyecto](#install)
2. [Creacón de instancia MySQL con RDS en AWS](#mysqlInstance)
3. [Creación de la tabla](#createTable)
4. [Configurar security groups desde serverles.yml](#sgConfiguration)
5. [Archivo de configuración para crear la conexión a la base de datos](#connection)
6. [Obtener todos los registros](#findAll)
7. [Obtener un registro](#findOne)
8. [Añadir un registro](#addOne)
9. [Actualizar un registro](#update)
10. [Eliminar un registro](#delete)

<hr>

<a name="install"></a>

## 1. Inicialización del proyecto

Creamos el proyecto mediante el comando

`sls create -t aws-nodejs -n curso-sls-crud-rds`

Iniciamos node con

`npm init -y`

Instalamos las dependencias que vamos a utilizar:

`npm install --save mysql querystring serverless-offline`

<hr>

<a name="mysqInstance"></a>

## 2. Creacón de instancia MySQL con RDS en AWS

Creamos la instancia a través de la consola AWS dentro del servicio RDS como MySQL.

  1. Establecemos el id de la instancia, usuario y contraseña.
  2. Elegimos free tier y mantenemos los parámetros por defecto.
  3. Establecemos que la base de datos sea pública dentro de los parámetros de configuración avanzados para poder trabajar con ella desde un cliente local. En este caso será necesario dar acceso a nuestra máquina mediante el security group por defecto que se ha establecido.

En la lambda, en la pestaña de permisos, creamos un nuevo rol y establecemos la vpc, al menos dos subnets y el security group. Necesitaremos los IDs en el siguiente punto para automatizar este paso en la creación de nuevas lambdas.

<hr>

<a name="createTable"></a>

## 3. Creación de la tabla

Desde un cliente MySQL creamos la tabla:

~~~sql
CREATE DATABASE IF NOT EXISTS curso_sls;

CREATE TABLE curso_sls.todos (
  id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  todo VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NULL
);
~~~

<hr>

<a name="sgConfiguration"></a>

## 4. Configurar security groups desde serverles.yml

Dentro del archivo **serverless.yml** en la sección de *provider* añadimos los datos de la vpc:

~~~yml
provider:
  name: aws
  runtime: nodejs12.x
  vpc:
    securityGroupIds:
      - sg-0f1a58e62dd6456c0
    subnetIds:
      - subnet-05565f251be671231
      - subnet-0cec29573390f4ed7
~~~

<hr>

<a name="connection"></a>

## 5. Archivo de configuración para crear la conexión a la base de datos

Creamos un nuevo archivo **connection.js**.

  1. Definimos las constantes que almacenarán los parámetros para poder realizar la conexión a la base de datos:

  ~~~js
  const mysql = require('mysql')

  const configDB = {
    host: 'curso-sls-rds-mysql.cfuld5lbzlxg.us-east-1.rds.amazonaws.com',
    user: 'curso_sls',
    password: 'secret12',
    port: '3306',
    database: 'curso_sls',
    debug: true
  }
  ~~~

  2. Definimos la función que realizará la conexión:

  ~~~js
  function initializeConnection(config) {
    function addDisconnectHandler(connection) {
      connection.on("error", function (error) {
        if (error instanceof Error) {
          if (error.code === "PROTOCOL_CONNECTION_LOST") {
            console.error(error.stack);
            console.log("Lost connection. Reconnecting...");

            initializeConnection(connection.config);
          } else if (error.fatal) {
            throw error;
          }
        }
      });
    }
    
    const connection = mysql.createConnection(config);

    // Add handlers.
    addDisconnectHandler(connection);

    connection.connect();
    return connection;
  }
  ~~~

  3. Instanciamos la conexión y la exportamos:

  ~~~js
  const connection = initializeConnection(configDB);

  module.exports = connection;
  ~~~

<hr>

<a name="findAll"></a>

## 6. Obtener todos los registros

Para organizar mejor nuestro código, creamos una nueva carpeta *crud* y dentro de ella el archivo **todos.js** que incluirá todas las funciones referentes a la tabla *todos*.

  1. Establecemos las constantes necesarias para trabajar con la base de datos:

  ~~~js
  const connection = require('../connection');
  const queryString = require('querystring');
  ~~~

  2. Definimos la función que realizará la consulta y devolverá los datos:

  ~~~js
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
  ~~~

  3. Definimos la función dentro del archivo **serverless.yml**

  ~~~yml
  functions:
  findAll:
    handler: crud/todos.findAll
    events:
      - http:
          path: todos
          method: get
  ~~~

<hr>

<a name="findOne"></a>

## 7. Obtener un registro

  1. Creamos una nueva función en **todos.js**

~~~js
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
~~~

  2. Añadimos la nueva función al archivo **serverless.yml**

~~~yml
findOne:
  handler: crud/todos.findOne
  events:
    - http:
        path: todos/{todoId}
        method: get
~~~

<hr>

<a name="addOne"></a>

## 8. Añadir un registro

  1. Creamos la función para añadir un registro dentro del archivo **todos.js**

~~~js
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
~~~

  2. Actualizamos el parámetro *functions* dentro del archivo **serverless.yml** para incluir la función que acabamos de definir:

~~~yml
create:
  handler: crud/todos.create
  events:
    - http:
        path: todos
        method: post
~~~

<hr>

<a name="update"></a>

## 9. Actualizar un registro

  1. Añadimos la nueva función al archivo **todos.js**

~~~js
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
~~~

  2. Actualizamos *functions* **serverless.yml** para incluir la nueva función

~~~yml
update:
  handler: crud/todos.update
  events:
    - http:
        path: todos/{todoId}
        method: put
~~~

<hr>

<a name="delete"></a>

## 10. Eliminar un registro

  1. Añadimos la nueva función al archivo **todos.js**

~~~js
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
~~~

  2. Actualizamos *functions* en **serverless.yml** para incluir la nueva función

~~~yml
delete:
  handler: crud/todos.delete
  events:
    - http:
        path: todos/{todoId}
        method: delete
~~~
