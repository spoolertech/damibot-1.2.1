const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.static('public')); // Servir archivos estáticos desde la carpeta "public"

const PORT = process.env.PORT || 3000;

async function connectToWhatsApp() {
  // Se usa la ruta donde se guardarán las credenciales
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth'); 

  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,  // Desactiva la impresión del QR en la terminal
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // Guardamos el QR generado en la carpeta public
      console.log('Generando QR...');
      fs.writeFileSync(path.join(__dirname, 'public', 'qr.png'), qr);  // Guardar QR en public/
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log('🔁 Reintentando conexión...');
        connectToWhatsApp(); // Reconectar si la conexión se cierra
      } else {
        console.log('❌ Usuario desconectado');
      }
    } else if (connection === 'open') {
      console.log('✅ Conectado a WhatsApp');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

    const response = await handleMessage(from, text.trim().toLowerCase());
    if (response) {
      await sock.sendMessage(from, { text: response });
    }
  });

  return sock;
}

// Inicia el servidor web para servir el QR
app.listen(PORT, () => {
  console.log(`🌐 Servidor web corriendo en puerto ${PORT}`);
  connectToWhatsApp();  // Conectar al bot de WhatsApp al iniciar el servidor
});

// Esta ruta permite acceder al QR generado
app.get('/qr', (req, res) => {
  const qrFilePath = path.join(__dirname, 'public', 'qr.png');
  if (fs.existsSync(qrFilePath)) {
    res.sendFile(qrFilePath);
  } else {
    res.status(404).send('QR no disponible todavía.');
  }
});
