const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/userRoutes');  
const mongoRoutes = require('./routes/mongo');  
const machine = require('./models/kmeansModel');
const { exec } = require('child_process');

const app = express();
const port = 5000;

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5000'],  // Asegúrate de incluir todos los orígenes que estás usando
    credentials: true,  // Si estás utilizando cookies
}));

app.use(bodyParser.json());

// Ruta para el endpoint raíz
app.get('/', (req, res) => {
    res.send('Bienvenido a la API de TrainSmart!');
});

// Rutas para los usuarios
app.use('/api', userRoutes);
app.use('/api', machine);
app.use('/mongo', mongoRoutes);

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
