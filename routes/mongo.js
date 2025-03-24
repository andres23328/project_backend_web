
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { connectDB, uploadImage } = require('../mondb');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

const multer = require('multer');


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const imageDirectory = path.join(__dirname, 'imagene_mongo'); 
        cb(null, imageDirectory); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);  
        cb(null, uniqueSuffix + path.extname(file.originalname)); 
    }
});

// Filtrar los tipos de archivos permitidos (por ejemplo, solo imágenes)
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (JPEG, PNG, JPG)'));
    }
};

// Crear el middleware de Multer
const upload = multer({ storage: storage, fileFilter: fileFilter });




router.post('/registrar', upload.single('imagen'), async (req, res) => {
    try {
        const db = await connectDB();
        const {
            nombre, apellido, peso, estatura, fecha_nacimiento, genero,
            nivel_actividad, objetivo, frecuencia_ejercicios, correo
        } = req.body;

        const loginCollection = db.collection('login');
        const usuarioLogin = await loginCollection.findOne({ correo });

        let id_usuarios = usuarioLogin ? usuarioLogin.id_usuarios : 1;
        const heightInMeters = estatura / 100;
        const imc = (peso / (heightInMeters * heightInMeters)).toFixed(2);
        let masaCorporalMagra = genero === 'Masculino' 
            ? (0.407 * peso) + (0.267 * estatura) - 19.2
            : (0.252 * peso) + (0.473 * estatura) - 48.3;
        const porcentajeMasaCorporal = ((masaCorporalMagra / peso) * 100).toFixed(2);

        let imagenId = null;
        if (req.file) {
            const result = await uploadImage(req); // Obtén el resultado de uploadImage
            imagenId = result.fileId; // Almacena el fileId
        }
        const imagenPath = req.file ? req.file.path : null; 

        const foto = imagenId ? 1 : 0;

        const usuarioData = {
            nombre, apellido, peso, estatura, fecha_nacimiento,
            genero, nivel_actividad, objetivo, frecuencia_ejercicios,
            masa_corporal: masaCorporalMagra, porcentaje_masa_corporal: porcentajeMasaCorporal,
            imc, id_usuarios, foto, fecha_registro: new Date(), imagen: imagenId, image: imagenPath
        };

        const usuariosCollection = db.collection('usuarios');
        await usuariosCollection.insertOne(usuarioData);

        const fields = ['nombre', 'apellido', 'peso', 'estatura', 'fecha_nacimiento', 
                        'genero', 'nivel_actividad', 'porcentaje_masa_corporal', 'objetivo', 
                        'masa_corporal', 'frecuencia_ejercicios', 'imc', 'id_usuarios', 'foto', 'imagen', 'image'];
        const json2csvParser = new Parser({ fields });
        const newUserCsv = json2csvParser.parse([usuarioData]);

        const newUserFilePath = path.join(__dirname, 'csv/nuevos_usuarios.csv');
        fs.writeFileSync(newUserFilePath, newUserCsv);

        const allUsers = await usuariosCollection.find().toArray();
        const allUsersCsv = json2csvParser.parse(allUsers);
        const allUsersFilePath = path.join(__dirname, 'csv/todos_los_usuarios1.csv');
        fs.writeFileSync(allUsersFilePath, allUsersCsv);

        res.status(201).json({
            message: 'Usuario registrado y archivos CSV sobrescritos exitosamente',
            newUserFile: newUserFilePath,
            allUsersFile: allUsersFilePath,
            imagenId // Incluir el ID de la imagen de GridFS en la respuesta
        });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Error al registrar el usuario' });
    }
});






router.post('/registrarusuario', async (req, res) => {
    try {
        const db = await connectDB();
        const loginCollection = db.collection('login');
        const { correo, contraseña, usuario } = req.body;

        // Verificar si ya existe un usuario con el correo dado
        const existingUser = await loginCollection.findOne({ correo });
        if (existingUser) {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }

        // Encriptar la contraseña y registrar el usuario
        const hashedPassword = await bcrypt.hash(contraseña, 10);
        const result = await loginCollection.insertOne({ correo, contraseña: hashedPassword, usuario });

        res.status(201).json({ message: 'Usuario registrado exitosamente', user_id: result.insertedId });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Error al registrar el usuario' });
    }
});



router.post('/iniciarsesion', async (req, res) => {
    try {
        const db = await connectDB();
        const loginCollection = db.collection('login');
        const { correo, contraseña } = req.body;

        // Consultar si el usuario existe por correo
        const usuario = await loginCollection.findOne({ correo });
        if (!usuario) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }

        // Comparar la contraseña
        const match = await bcrypt.compare(contraseña, usuario.contraseña);
        if (!match) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }

        // Generar token JWT
        const token = jwt.sign(
            { user_id: usuario._id, correo: usuario.correo },
            secretKey,
            { expiresIn: '1h' }
        );

        res.json({
            message: 'Inicio de sesión exitoso',
            token: token
        });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Error al iniciar sesión' });
    }
});


router.get('/user', async (req, res) => {
    const { correo } = req.query;

    if (!correo) {
        return res.status(400).json({ message: 'Correo es requerido' });
    }

    try {
        const db = await connectDB();
        
        // Primero, buscar el id_usuarios en la colección `login`
        const loginCollection = db.collection('login');
        const loginResult = await loginCollection.findOne({ correo });

        if (!loginResult) {
            return res.status(404).json({ message: 'Usuario no encontrado en login' });
        }

        const idUsuario = loginResult.id_usuarios;

        // Ahora buscar en la colección `usuarios` el registro más reciente para este usuario
        const usuariosCollection = db.collection('usuarios');
        const userResult = await usuariosCollection.find({ id_usuarios: idUsuario })
            .sort({ fecha_registro: -1 }) // Ordenar por `fecha_registro` en orden descendente
            .limit(1) // Obtener solo el último registro
            .toArray();

        if (userResult.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado en usuarios' });
        }

        // Devolver el registro más reciente del usuario
        res.json(userResult[0]);

    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Error al obtener el usuario' });
    }
});



router.get('/download-csv', async (req, res) => {
    try {
        const db = await connectDB();
        const usuariosCollection = db.collection('usuarios');
        const usuarios = await usuariosCollection.find().toArray();

        // Definir las columnas para el CSV
        const fields = ['nombre', 'apellido', 'peso', 'estatura', 'fecha_nacimiento', 
                        'genero', 'nivel_actividad', 'porcentaje_masa_corporal', 'objetivo', 
                        'masa_corporal', 'frecuencia_ejercicios', 'imc', 'id_usuarios', 'foto', 'imagen', 'image'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(usuarios);

        // Define el nombre del archivo CSV
        const filePath = path.join(__dirname, 'csv', 'todos_los_usuarios.csv');
        
        // Guardar el CSV en el servidor (opcional, solo si deseas almacenarlo)
        fs.writeFileSync(filePath, csv);

        // Enviar el archivo CSV como respuesta
        res.header('Content-Type', 'text/csv');
        res.attachment('todos_los_usuarios.csv'); // Nombre del archivo al descargarse
        res.send(csv); // Enviar el CSV como respuesta
    } catch (err) {
        console.error('Error al generar el CSV:', err);
        res.status(500).json({ message: 'Error al generar el archivo CSV' });
    }
});



module.exports = router;