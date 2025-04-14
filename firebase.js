const admin = require('firebase-admin');

// Obtener el contenido del archivo de credenciales de Firebase desde la variable de entorno
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);

// Inicializar Firebase Admin con las credenciales
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.database();

module.exports = db;