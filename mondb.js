// mondb.js
const { MongoClient, GridFSBucket } = require('mongodb');
const multer = require('multer');
const { Readable } = require('stream');

const username = encodeURIComponent("ardila23328");
const password = encodeURIComponent("Andres23328lun@");
const uri = `mongodb+srv://${username}:${password}@cluster0.2wren.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri);

async function connectDB() {
    await client.connect();
    return client.db("parcial");
}




async function uploadImage(req) {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await connectDB();
            const bucket = new GridFSBucket(db, { bucketName: 'images' });
            const imageBuffer = req.file.buffer;
            const readableStream = new Readable();
            readableStream.push(imageBuffer);
            readableStream.push(null);

            const uploadStream = bucket.openUploadStream(req.file.originalname);
            readableStream.pipe(uploadStream);

            uploadStream.on('finish', () => {
                resolve({ fileId: uploadStream.id });
            });

            uploadStream.on('error', (error) => {
                console.error('Error al guardar la imagen:', error);
                reject(new Error('Error al guardar la imagen en MongoDB'));
            });
        } catch (error) {
            console.error('Error en la conexión con MongoDB:', error);
            reject(new Error('Error en la conexión con MongoDB'));
        }
    });
}

module.exports = { connectDB, uploadImage };
