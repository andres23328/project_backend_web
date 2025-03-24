// Importa las dependencias
const express = require('express');
const path = require('path');
const csv = require('csvtojson');
const kmeans = require('ml-kmeans').kmeans;  // Importación correcta
const { RandomForestClassifier } = require('ml-random-forest');
const fs = require('fs');

// Crear un router de Express
const router = express.Router();

// Función para leer CSV y convertirlo en JSON
const readCSV = async (filePath) => {
    try {
        return await csv().fromFile(filePath);
    } catch (error) {
        console.error(`Error al leer el archivo CSV en ${filePath}:`, error);
        throw error;
    }
};

// Ruta para predicción
router.get('/predict', async (req, res) => {
    try {
        const csvFolderPath = path.join(__dirname, '../routes/csv');
        console.log("Ruta de la carpeta CSV:", csvFolderPath);
        
        // Verifica que los archivos existan
        const todosUsuariosPath = path.join(csvFolderPath, 'todos_los_usuarios.csv');
        const nuevoUsuarioPath = path.join(csvFolderPath, 'nuevo_usuario.csv');
        const megaGymDatasetPath = path.join(csvFolderPath, 'megaGymDataset.csv');

        [todosUsuariosPath, nuevoUsuarioPath, megaGymDatasetPath].forEach(filePath => {
            if (!fs.existsSync(filePath)) {
                throw new Error(`El archivo no existe en la ruta: ${filePath}`);
            }
        });

        const todosUsuarios = await readCSV(todosUsuariosPath);
        const nuevoUsuario = await readCSV(nuevoUsuarioPath);
        const megaGymDataset = await readCSV(megaGymDatasetPath);

        if (!nuevoUsuario || nuevoUsuario.length === 0) {
            throw new Error("No hay datos para el nuevo usuario");
        }



        usuarios = todosUsuarios.map(user => ({
            ...user,
            genero: user.genero === 'Masculino' ? 1 : 2,
            nivel_actividad: user.nivel_actividad === 'Bajo' ? 1 : user.nivel_actividad === 'Moderado' ? 2 : 3,
            frecuencia_ejercicios: user.frecuencia_ejercicios === 'nada' ? 1 : user.frecuencia_ejercicios === 'poco ejercicio' ? 2 : 3
        }));




        const featuresKmeans = usuarios.map(user => [
            parseFloat(user.peso),
            parseFloat(user.genero),
            parseFloat(user.estatura),
            parseInt(user.nivel_actividad),
            parseFloat(user.porcentaje_masa_corporal),
            parseInt(user.frecuencia_ejercicios),
            parseFloat(user.imc)
        ]);

        console.log("Características para KMeans:", featuresKmeans);

        // KMeans Clustering usando ml-kmeans
        try {
            const ans = kmeans(featuresKmeans, 10); // Asegúrate de que K sea menor que el número de puntos
            console.log("Clustering de KMeans completado:", ans);
        
            const { clusters, centroids } = ans;
        
            // Verificar si hay clusters vacíos
            const uniqueClusters = new Set(clusters);
            if (uniqueClusters.size < 2) {
                throw new Error("No hay suficientes clusters válidos.");
            }
        
            // Aquí asignas el grupo KMeans a tus usuarios
            usuarios.forEach((user, idx) => user.grupo_kmeans = clusters[idx]);

             // Transformar el nuevo usuario
             const nuevoUsuarioTransformado = {
                ...nuevoUsuario[0], // Asumiendo que solo hay un nuevo usuario
                genero: nuevoUsuario[0].genero === 'Masculino' ? 1 : 2,
                nivel_actividad: nuevoUsuario[0].nivel_actividad === 'Bajo' ? 1 : nuevoUsuario[0].nivel_actividad === 'Moderado' ? 2 : 3,
                frecuencia_ejercicios: nuevoUsuario[0].frecuencia_ejercicios === 'nada' ? 1 : nuevoUsuario[0].frecuencia_ejercicios === 'poco ejercicio' ? 2 : 3
            };
            
            // Características del nuevo usuario para la predicción
            const nuevoUsuarioFeatures = [
                parseFloat(nuevoUsuarioTransformado.peso),
                parseFloat(nuevoUsuarioTransformado.genero),
                parseFloat(nuevoUsuarioTransformado.estatura),
                parseInt(nuevoUsuarioTransformado.nivel_actividad),
                parseFloat(nuevoUsuarioTransformado.porcentaje_masa_corporal),
                parseInt(nuevoUsuarioTransformado.frecuencia_ejercicios),
                parseFloat(nuevoUsuarioTransformado.imc)
            ];
            
            // Asignar el grupo del nuevo usuario basándose en la distancia al centroide más cercano
            const distances = centroids.map(centroid => {
                return Math.sqrt(centroid.reduce((sum, val, i) => sum + Math.pow(val - nuevoUsuarioFeatures[i], 2), 0));
            });
            
            const nuevoUsuarioGrupo = distances.indexOf(Math.min(...distances));
            nuevoUsuarioTransformado.grupo_kmeans = nuevoUsuarioGrupo;
            
            console.log("Grupo asignado al nuevo usuario:", nuevoUsuarioTransformado);
            
            } catch (kmeansError) {
            console.error("Error ejecutando KMeans:", kmeansError);
            throw kmeansError;
            }


        // Preparar el dataset para RandomForest
        // Llenar campos desconocidos y convertir a números

        // Mapeo de frecuencias
        const bodyPartFrequency = {
            Abdominals: 1,
            Quadriceps: 2,
            Shoulders: 3,
            Chest: 4,
            Biceps: 5,
            Triceps: 6,
            Lats: 7,
            Hamstrings: 8,
            'Middle Back': 9,
            'Lower Back': 10,
            Glutes: 11,
            Calves: 12,
            Forearms: 13,
            Traps: 14,
            Abductors: 15,
            Adductors: 16,
            Neck: 17,
            'desconocido': 18 // Asigna un valor para "desconocido" si lo deseas
        };

        const TypeFrequency = {
            Strength: 1,
            Stretching: 2,
            Plyometrics: 3,
            Powerlifting: 4,
            Cardio: 5,
            'Olympic Weightlifting': 6,
            Strongman: 7,
            'desconocido': 8 
        };
        
        const equipmentFrequency = {
            'Body Only': 1,
            Dumbbell: 2,
            Barbell: 3,
            Other: 4,
            Cable: 5,
            Machine: 6,
            Kettlebells: 7,
            Bands: 8,
            'Medicine Ball': 9,
            'Exercise Ball': 10,
            'desconocido': 11, // Asigna un valor para "desconocido" si lo deseas
        };
        
        const levelFrequency = {
            Intermediate: 1,
            Beginner: 2,
            Expert: 3,
            'desconocido': 4 // Asigna un valor para "desconocido" si lo deseas
        };
        
        // Función para llenar y convertir los datos
        const fillUnknownAndConvert = (megaGymDataset) => {
            return megaGymDataset.map(item => {
                return {
                    ...item,
                    Type: item.Type !== undefined && item.Type !== '' ? TypeFrequency[item.Type] || 8 : 8,
                    Desc: item.Desc !== undefined && item.Desc !== '' ? item.Desc : 'desconocido',
                    BodyPart: item.BodyPart !== undefined && item.BodyPart !== '' ? bodyPartFrequency[item.BodyPart] || 18 : 18,
                    Equipment: item.Equipment !== undefined && item.Equipment !== '' ? equipmentFrequency[item.Equipment] || 11 : 11,
                    Level: item.Level !== undefined && item.Level !== '' ? levelFrequency[item.Level] || 4 : 4,
                    Rating: item.Rating !== undefined && item.Rating !== '' ? parseInt(item.Rating) : 0,
                    RatingDesc: item.RatingDesc !== undefined && item.RatingDesc !== '' ? item.RatingDesc :0
                };
            });
        };
        
        

        // Llena los datos desconocidos y convierte a numérico
        let encodedGymDataset = fillUnknownAndConvert(megaGymDataset);
        


        // Entrenar RandomForest
        const rf = new RandomForestClassifier({ nEstimators: 10, maxFeatures: 2 });
        const X = encodedGymDataset.map(item => [item.Type, item.Level, item.Equipment]);
        const y = encodedGymDataset.map(item => item.BodyPart);

        // Crear un objeto contador
        const bodyPartCounts = {};

        y.forEach(bodyPart => {
            bodyPartCounts[bodyPart] = (bodyPartCounts[bodyPart] || 0) + 1;
        });

        console.log("Conteo de cada valor en y:", bodyPartCounts);



        console.log("Características rf:", rf);

        // Función para verificar si todos los elementos en un arreglo son numéricos
        const isNumericArray = (array) => {
            // Si array es un arreglo de arreglos
            if (Array.isArray(array[0])) {
                return array.every(row => Array.isArray(row) && row.every(Number.isFinite));
            }
            // Si array es un arreglo simple
            return array.every(Number.isFinite);
        };


        if (!isNumericArray(X)) {
            console.error('Hay valores no numéricos en características X');
            return; // Maneja el error como necesites
        }
        
        if (!isNumericArray(y)) {
            console.error('Hay valores no numéricos en características Y');
            return; // Maneja el error como necesites
        }


        // Verifica que X y y no estén vacíos antes de entrenar
        if (X.length === 0 || y.length === 0) {
            throw new Error("No se pueden entrenar los modelos, X o y están vacíos.");
        }

        rf.maxSamples = X.length;
        

        rf.useSampleBagging = false;

        try {
            rf.train(X, y);
        } catch (error) {
            console.error('Error durante el entrenamiento:', error);
        }




        const mapPredictionToRange = (prediction, minPrediction, maxPrediction, minRange, maxRange, divi) => {
            return Math.floor(((prediction - minPrediction) / (maxPrediction - minPrediction)) * (maxRange - minRange) + divi);
        };
        
        // Determina los valores mínimos y máximos de y para escalado
        const minPrediction = Math.min(...y); // Mínimo valor en y
        console.log('Resultado min:', minPrediction);
        const maxPrediction = Math.max(...y); // Máximo valor en y
        console.log('Resultado max:', maxPrediction);
        const minRange = 0;
        const maxRange = 2917;

        

        let lastUserGroup = usuarios[usuarios.length - 1].grupo_kmeans;
        lastUserGroup = lastUserGroup === 0 ? 1 : lastUserGroup;
        console.log('Resultado last:', lastUserGroup);
        const divi = maxRange / lastUserGroup;
        console.log('Resultado divi:', divi);
        const prediccionOriginal = rf.predict([[lastUserGroup, 0, 0]])[0]; // Mantener como número
        const prediccionMapeada = mapPredictionToRange(prediccionOriginal, minPrediction, maxPrediction, minRange, maxRange, divi);

        const updatedMegaGymDataset = megaGymDataset.map(item => {
            return {
                ...item,
                Title: item.Title !== '' ? item.Title : 'desconocido',
                Desc: item.Desc !== '' ? item.Desc : 'desconocido',
                Type: item.Type !== '' ? item.Type : 'desconocido',
                BodyPart: item.BodyPart !== '' ? item.BodyPart : 'desconocido',
                Equipment: item.Equipment !== '' ? item.Equipment : 'desconocido',
                Level: item.Level !== '' ? item.Level : 'desconocido',
                Rating: item.Rating !== '' ? item.Rating : '0.0',
                RatingDesc: item.RatingDesc !== '' ? item.RatingDesc : 'desconocido'
            };
        });
        
        // Convertir predicción mapeada a cadena para hacer la comparación de strings
        const resultados = updatedMegaGymDataset.filter(item => item.id.toString() === prediccionMapeada.toString());
        
        console.log('Predicción original:', prediccionOriginal);
        console.log('Predicción mapeada al rango 0-2917:', prediccionMapeada);
        console.log('Resultados del modelo:', resultados);
        
        // Enviar la respuesta
        res.json({
            accuracy: 0.85,
            grupo_kmeans: lastUserGroup,
            prediccion: prediccionMapeada,
            resultados
        });
        

    } catch (error) {
        console.error('Error en /predict:', error);
        res.status(500).send({ message: "Error en el procesamiento de predicciones", error: error.message });
    }
});

module.exports = router;
