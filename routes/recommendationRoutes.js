const express = require('express');
const router = express.Router();
const { trainModel } = require('../models/kmeansModel');

// Ruta para obtener recomendaciones
router.post('/recommendations', (req, res) => {
    const userData = req.body; // Recibir los datos del usuario
    // Aquí puedes procesar los datos del usuario y pasarlos al modelo KMeans

    // Ejemplo de datos ficticios para el modelo, reemplaza esto con tu lógica
    const data = [
        [userData.peso, userData.estatura], // Datos que se pasan al modelo
        // Añade más datos según sea necesario
    ];

    const result = trainModel(data); // Entrena el modelo con los datos
    res.json(result); // Devuelve el resultado del modelo
});

module.exports = router;
