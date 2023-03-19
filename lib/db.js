import mysql from 'mysql2'

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "lolmdr1234",
    database: "delmoo_v3"
})

connection.connect();

export default connection;