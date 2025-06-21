import * as functions from '@google-cloud/functions-framework';
import express, { Request, Response } from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import FormData from 'form-data';
// ES Modules type declarations

// ES Modules compatibility
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

// Cargar variables de entorno
dotenv.config();

// Inicializar Express
const app = express();

// Configuración de CORS más permisiva
const allowedOrigins = [
  'http://localhost:3000',
  'https://stt-function-gjoom7xsla-ew.a.run.app'
];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Permitir solicitudes sin origen (como aplicaciones móviles o curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  maxAge: 86400 // 24 horas
};

// Aplicar CORS a todas las rutas
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Habilitar preflight para todas las rutas

// Agregar headers manualmente para asegurar que se apliquen
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Manejar solicitudes preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Llamar a next() para continuar con el siguiente middleware
  return next();
});

// Middleware para parsear el cuerpo de la solicitud como buffer
app.use(express.raw({
  type: ['audio/*', 'application/octet-stream'],
  limit: '10mb'
}));

// Configuración de ElevenLabs
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY || '';
// Configuración de la API de Speech-to-Text
const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1/speech-to-text';
const ELEVEN_LABS_MODEL_ID = 'scribe_v1'; // Modelo de transcripción de ElevenLabs
const ELEVEN_LABS_LANGUAGE = 'es'; // Código de idioma (español)

// Interfaz para la respuesta de la API de ElevenLabs
type ElevenLabsResponse = {
  text?: string;
  results?: {
    transcripts?: Array<{
      transcript: string;
    }>;
  };
  // Allow any other properties since we're not sure about the exact structure
  [key: string]: any;
};

// Ruta para manejar la transcripción de audio
app.post('/transcribe', async (req: Request, res: Response) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  console.log(`[${requestId}] Solicitud de transcripción recibida`);
  console.log(`[${requestId}] Headers:`, JSON.stringify(req.headers, null, 2));
  
  try {
    if (!req.body || req.body.length === 0) {
      console.error(`[${requestId}] Error: No se proporcionó ningún audio`);
      return res.status(400).json({ error: 'No se proporcionó ningún audio' });
    }
    
    console.log(`[${requestId}] Tamaño del audio recibido: ${req.body.length} bytes`);
    
    // Verificar que hay datos en el cuerpo
    if (!req.body || req.body.length === 0) {
      console.error('No se proporcionó ningún audio');
      return res.status(400).json({ error: 'No se proporcionó ningún audio' });
    }

    // Verificar que la API key esté configurada
    if (!ELEVEN_LABS_API_KEY) {
      console.error('Falta la clave de API de ElevenLabs');
      return res.status(500).json({ error: 'Error de configuración del servidor' });
    }

    // Obtener el buffer de audio del cuerpo de la solicitud
    const audioBuffer = req.rawBody || Buffer.from(JSON.stringify(req.body));
    console.log(`[${requestId}] Buffer de audio preparado, longitud: ${audioBuffer.length} bytes`);
    
    // Crear el formulario con el archivo de audio
    const form = new FormData();
    
    // Añadir el archivo de audio al formulario usando 'file' como nombre de campo
    form.append('file', audioBuffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm',
      knownLength: audioBuffer.length
    });
    
    // Añadir parámetros adicionales como campos del formulario
    form.append('model_id', ELEVEN_LABS_MODEL_ID);
    form.append('language_code', ELEVEN_LABS_LANGUAGE);
    
    // Obtener los headers del formulario
    const formHeaders = form.getHeaders();
    
    console.log(`[${requestId}] Enviando audio a ElevenLabs...`);
    console.log(`[${requestId}] URL: ${ELEVEN_LABS_API_URL}`);
    console.log(`[${requestId}] Tamaño del formulario: ${form.getLengthSync()} bytes`);
    
    try {
      // Llamar a la API de ElevenLabs para la transcripción
      const apiResponse = await fetch(ELEVEN_LABS_API_URL, {
        method: 'POST',
        headers: {
          ...formHeaders,  // Incluir los headers del formulario
          'Accept': 'application/json',
          'xi-api-key': ELEVEN_LABS_API_KEY,
        },
        // @ts-ignore - El tipo de form es compatible con BodyInit
        body: form
      });

      console.log(`[${requestId}] Código de estado de ElevenLabs: ${apiResponse.status}`);
      
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`[${requestId}] Error de ElevenLabs:`, errorText);
        return res.status(apiResponse.status).json({ 
          error: 'Error al procesar el audio', 
          details: errorText,
          requestId
        });
      }
      
      const result = await apiResponse.json() as ElevenLabsResponse;
      console.log(`[${requestId}] Respuesta de ElevenLabs:`, JSON.stringify(result, null, 2));
      
      const transcriptText = result?.text || 
                           result?.results?.transcripts?.[0]?.transcript || 
                           'No se pudo transcribir el audio';
      console.log(`[${requestId}] Transcripción exitosa:`, transcriptText);
      
      return res.json({ 
        text: transcriptText, 
        status: 'success',
        requestId
      });
    } catch (apiError) {
      console.error(`[${requestId}] Error al llamar a la API de ElevenLabs:`, apiError);
      throw apiError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`[${requestId}] Error en el servidor:`, error);
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: errorMessage,
      requestId
    });
  }
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Exportar la función de Cloud Functions
functions.http('sttHandler', app);

export const sttHandler = functions.http('sttHandler', app);