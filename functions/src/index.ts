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

// Configuración de CORS más permisiva para desarrollo
const corsOptions = {
  origin: '*', // En producción, reemplaza con la URL de tu frontend
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Habilitar preflight para todas las rutas

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
  try {
    console.log('Solicitud de transcripción recibida');
    
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
    console.log(`Tamaño del audio recibido: ${audioBuffer.length} bytes`);
    
    console.log('Enviando audio a la API de ElevenLabs...');
    
    try {
      // Importar módulos necesario
      
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
      
      console.log('Enviando petición a ElevenLabs...');
      
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

      console.log('Respuesta de la API de ElevenLabs:', apiResponse.status, apiResponse.statusText);
      
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('Error en la API de ElevenLabs:', apiResponse.status, errorText);
        return res.status(apiResponse.status).json({ 
          error: 'Error al procesar el audio', 
          details: errorText 
        });
      }
      
      const result = await apiResponse.json() as ElevenLabsResponse;
      
      const transcriptText = result?.text || 
                           result?.results?.transcripts?.[0]?.transcript || 
                           'No se pudo transcribir el audio';
      
      console.log('Transcripción exitosa:', transcriptText);
      
      return res.json({ 
        text: transcriptText,
        status: 'success' 
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error al llamar a la API de ElevenLabs:', error);
      return res.status(500).json({ 
        error: 'Error al conectar con el servicio de transcripción',
        details: errorMessage 
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error procesando la solicitud:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: errorMessage 
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