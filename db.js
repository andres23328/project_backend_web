const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',  // Cambia esto por tu usuario de MySQL
    password: '',  // Cambia esto por tu contraseña de MySQL
    database: 'vida_fit2'  // Cambia esto por el nombre de tu base de datos
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

module.exports = connection;
