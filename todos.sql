CREATE DATABASE IF NOT EXISTS curso_sls;

CREATE TABLE curso_sls.todos (
  id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  todo VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
);