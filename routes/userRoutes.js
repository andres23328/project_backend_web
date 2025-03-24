const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const secretKey = 'mi_secreto_super_seguro';

const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');

const multer = require('multer');

// Configuración de Multer para guardar la imagen
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const imageDirectory = path.join(__dirname, 'imagenes');  // Aquí defines la carpeta
        cb(null, imageDirectory); // Guarda en esa carpeta
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);  // Asegura un nombre único
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Usa la extensión original del archivo
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

// Ruta para registrar un nuevo usuario y exportar datos a CSV
router.post('/registrar', upload.single('imagen'), async (req, res) => {
    const {
        nombre,
        apellido,
        peso,
        estatura,
        fecha_nacimiento,
        genero,
        nivel_actividad,
        objetivo,
        frecuencia_ejercicios,
        correo
    } = req.body;

    // Buscar el id_usuario en la tabla de login según el correo
    const selectQuery = 'SELECT id_usuarios FROM login WHERE correo = ?';
    db.query(selectQuery, [correo], (err, results) => {
        if (err) {
            console.error('Error al buscar el usuario:', err);
            return res.status(500).json({ message: 'Error al buscar el usuario' });
        }

        let id_usuarios = 1;
        if (results.length > 0) {
            id_usuarios = results[0].id_usuarios; // Obtener el id_usuarios si existe
        }

        // Calcular el IMC
        const heightInMeters = estatura / 100;
        const imc = (peso / (heightInMeters * heightInMeters)).toFixed(2);

        // Calcular la Masa Corporal Magra según el género
        let masaCorporalMagra;
        if (genero === 'Masculino') {
            masaCorporalMagra = (0.407 * peso) + (0.267 * estatura) - 19.2;
        } else if (genero === 'Femenino') {
            masaCorporalMagra = (0.252 * peso) + (0.473 * estatura) - 48.3;
        } else {
            return res.status(400).json({ message: 'Género inválido' });
        }

        const porcentajeMasaCorporal = ((masaCorporalMagra / peso) * 100).toFixed(2);

        const fecha_nacimiento_format = new Date(fecha_nacimiento).toISOString().split('T')[0]; // Solo extrae YYYY-MM-DD

        // Obtener el nombre de la imagen cargada (si existe)
        const imagenPath = req.file ? req.file.path : null; // El path de la imagen subida

        // Establecer el valor de la columna foto (1 si hay foto, 0 si no)
        const foto = imagenPath ? 1 : 0;

        // Insertar los datos del nuevo usuario en la base de datos
        const query = `INSERT INTO usuarios (nombre, apellido, peso, estatura, fecha_nacimiento, genero, nivel_actividad, objetivo, frecuencia_ejercicios, masa_corporal, porcentaje_masa_corporal, imc, id_usuarios, foto, imagen)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.query(query, [
            nombre,
            apellido,
            peso,
            estatura,
            fecha_nacimiento_format, 
            genero,
            nivel_actividad,
            objetivo,
            frecuencia_ejercicios,
            masaCorporalMagra,
            porcentajeMasaCorporal,
            imc,
            id_usuarios,
            foto ,
            imagenPath
        ], (err, result) => {
            if (err) {
                console.error('Error insertando datos:', err);
                return res.status(500).json({ message: 'Error al guardar los datos del usuario' });
            }

            const selectNewUserByDateQuery = `
                SELECT * 
                FROM usuarios 
                WHERE fecha_registro = (
                    SELECT MAX(fecha_registro) FROM usuarios
                );
            `;
            
            db.query(selectNewUserByDateQuery, (err, newUserResults) => {
                if (err) {
                    console.error('Error al obtener el usuario basado en la fecha de registro:', err);
                    return res.status(500).json({ message: 'Error al obtener los datos del usuario' });
                }

                if (newUserResults.length === 0) {
                    return res.status(404).json({ message: 'No se encontró el usuario según la fecha de registro' });
                }




            // Definición de los campos para el CSV
            const fields = ['nombre', 'apellido', 'peso', 'estatura', 'fecha_nacimiento', 'genero', 'nivel_actividad', 'porcentaje_masa_corporal', 'objetivo', 'masa_corporal', 'frecuencia_ejercicios', 'imc', 'id_usuarios'];
            const json2csvParser = new Parser({ fields });
            
            // Mapeo para transformar los datos y formatear la fecha
            const formattedNewUserResults = newUserResults.map(user => ({
                ...user,
                fecha_nacimiento: typeof user.fecha_nacimiento === 'string' 
                    ? user.fecha_nacimiento.split('T')[0]  // Si ya es una cadena, solo corta la parte de la fecha
                    : new Date(user.fecha_nacimiento).toISOString().split('T')[0],  // Si es un objeto Date, formatea correctamente
            }));
        
            // Convertir los resultados formateados a CSV
            const newUserCsv = json2csvParser.parse(formattedNewUserResults);
        
            const newUserFilePath = path.join(__dirname, 'csv/nuevo_usuario.csv');
            fs.writeFile(newUserFilePath, newUserCsv, (err) => {
                if (err) {
                    console.error('Error al escribir el archivo CSV del nuevo usuario:', err);
                    return res.status(500).json({ message: 'Error al exportar el nuevo dato' });
                }
        
                
                // ** Exportar todos los usuarios a un CSV (sobrescribir archivo) **
                const allUsersQuery = 'SELECT * FROM usuarios';
                db.query(allUsersQuery, (err, allUsersResults) => {
                    if (err) {
                        console.error('Error al obtener los datos de todos los usuarios:', err);
                        return res.status(500).json({ message: 'Error al obtener los datos de todos los usuarios' });
                    }

                    const formattedAllUsers = allUsersResults.map(user => {
                        return {
                            ...user,
                            fecha_nacimiento: typeof user.fecha_nacimiento === 'string' 
                                ? user.fecha_nacimiento.split('T')[0]  // Si ya es una cadena, solo corta la parte de la fecha
                                : new Date(user.fecha_nacimiento).toISOString().split('T')[0],  // Si es un objeto Date, formatea correctamente
                        };
                    });
                    

                    const allUsersCsv = json2csvParser.parse(formattedAllUsers);
                    const allUsersFilePath = path.join(__dirname, 'csv/todos_los_usuarios.csv');
                    fs.writeFile(allUsersFilePath, allUsersCsv, (err) => {
                        if (err) {
                            console.error('Error al escribir el archivo CSV de todos los usuarios:', err);
                            return res.status(500).json({ message: 'Error al exportar todos los datos' });
                        }

                        // Respuesta exitosa
                        res.status(201).json({
                            message: 'Usuario registrado y archivos CSV sobrescritos exitosamente',
                            newUserFile: newUserFilePath,
                            allUsersFile: allUsersFilePath
                        });
                    });
                });
            });
        });
        });
    });
});






//Registrar usuario

// Ruta para registrar un usuario
router.post('/registrarusuario', async (req, res) => {
    console.log('Solicitud de registro recibida:', req.body);
    const { correo, contraseña, usuario } = req.body;

    // Verificar si ya existe un usuario con el correo dado
    const queryCheck = 'SELECT * FROM login WHERE correo = ?';
    db.query(queryCheck, [correo], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error al verificar el correo' });
        }
        if (results.length > 0) {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }

        // Encriptar la contraseña antes de almacenarla
        const hashedPassword = await bcrypt.hash(contraseña, 10);

        // Insertar nuevo usuario en la base de datos
        const queryInsert = 'INSERT INTO login (correo, contraseña, usuario) VALUES (?, ?, ?)';
        db.query(queryInsert, [correo, hashedPassword, usuario], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Error al registrar el usuario' });
            }
            res.status(201).json({ message: 'Usuario registrado exitosamente', user_id: result.insertId });
        });
    });
});


// Ruta para iniciar sesión
router.post('/iniciarsesion', async (req, res) => {
    const { correo, contraseña } = req.body;

    // Consultar si el usuario existe por correo
    const query = 'SELECT * FROM login WHERE correo = ?';
    db.query(query, [correo], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error al verificar el usuario' });
        }
        if (results.length === 0) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }

        const usuario = results[0];

        // Comparar la contraseña proporcionada con la contraseña almacenada en la base de datos (hash)
        const match = await bcrypt.compare(contraseña, usuario.contraseña);

        if (!match) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }

        // Generar el token JWT
        const token = jwt.sign(
            { user_id: usuario.id_usuarios, correo: usuario.correo }, // Payload del token
            secretKey, // Clave secreta
            { expiresIn: '1h' } // El token expira en 1 hora
        );

        // Responder con el token
        res.json({
            message: 'Inicio de sesión exitoso',
            token: token
        });
    });
});


router.get('/user', async (req, res) => {
    const { correo } = req.query; // Obtener el correo desde la URL
  
    // Comprueba si el correo fue proporcionado
    if (!correo) {
      return res.status(400).json({ message: 'Correo es requerido' });
    }
  
    // Primero, obtén el id_usuarios del login
    const queryLogin = 'SELECT id_usuarios FROM login WHERE correo = ?';
    
    db.query(queryLogin, [correo], async (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
  
      if (results.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
  
      // Ahora que tenemos el id_usuarios, obtenemos los detalles del usuario
      const idUsuario = results[0].id_usuarios;
      
      // Modifica la consulta para obtener el usuario más reciente
      const queryUser = `
        SELECT * FROM usuarios 
        WHERE id_usuarios = ? 
        ORDER BY fecha_registro DESC 
        LIMIT 1
      `;
      
      db.query(queryUser, [idUsuario], (err, userResults) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
  
        if (userResults.length > 0) {
          return res.json(userResults[0]); // Devuelve los datos del usuario más reciente
        } else {
          return res.status(404).json({ message: 'Usuario no encontrado' });
        }
      });
    });
  });
  
  




module.exports = router;
