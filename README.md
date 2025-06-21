# Speech to Text con ElevenLabs

Aplicación web para convertir voz a texto en tiempo real utilizando la API de ElevenLabs y Google Cloud Functions.

## Características

- 🎙️ Grabación de voz en tiempo real
- ⚡ Transcripción en tiempo real con Web Audio API
- 📝 Visualización de transcripción continua
- 🌊 Visualización de ondas de sonido
- ☁️ Procesamiento en la nube con Google Cloud Run
- 🔒 Configuración segura con variables de entorno
- 🎨 Interfaz de usuario moderna y responsiva

## Requisitos previos

- Node.js (v16 o superior)
- npm o yarn
- Cuenta de Google Cloud Platform (para desplegar la Cloud Function)
- API Key de ElevenLabs

## 🚀 Características en Tiempo Real

La aplicación ahora soporta transcripción en tiempo real con las siguientes características:

- **Grabación por fragmentos**: Procesa el audio en fragmentos pequeños para baja latencia
- **WebSocket opcional**: Soporte para actualizaciones en tiempo real
- **Buffer inteligente**: Manejo eficiente de la transmisión de audio
- **Reconexión automática**: Manejo robusto de errores de red

## Configuración del entorno

### Backend (Cloud Function)

1. Navega al directorio `functions`:
   ```bash
   cd functions
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env` en el directorio `functions` con las siguientes variables:
   ```
   ELEVEN_LABS_API_KEY=tu_api_key_de_elevenlabs
   ELEVEN_LABS_VOICE_ID=id_de_la_voz_por_defecto
   ```

4. Para probar localmente:
   ```bash
   npm run serve
   ```

5. Para desplegar a Google Cloud usando el script de despliegue:
   ```bash
   # Dar permisos de ejecución al script
   chmod +x deploy-function.sh
   
   # Ejecutar el script con tu API key
   ./deploy-function.sh tu_api_key_de_elevenlabs
   ```
   
   O manualmente con gcloud:
   ```bash
   gcloud run deploy stt-function \
     --source ./functions \
     --region=europe-west1 \
     --platform=managed \
     --allow-unauthenticated \
     --project=tu-proyecto \
     --set-env-vars="ELEVEN_LABS_API_KEY=tu_api_key_de_elevenlabs"
   ```
   ```bash
   gcloud functions deploy stt-function --gen2 --runtime=nodejs18 --region=europe-west1 --source=. --entry-point=sttHandler --trigger-http --allow-unauthenticated
   ```

### Frontend

1. Navega al directorio `frontend`:
   ```bash
   cd frontend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

4. Abre tu navegador en [http://localhost:3000](http://localhost:3000)

## Estructura del proyecto

```
stt/
├── functions/           # Código de la Cloud Function
│   ├── src/
│   │   └── index.ts    # Punto de entrada de la función
│   ├── package.json      # Dependencias del backend
│   └── tsconfig.json    # Configuración de TypeScript
│
└── frontend/           # Aplicación web
    ├── public/          # Archivos estáticos
    ├── src/
    │   ├── components/ # Componentes de React
    │   ├── App.tsx     # Componente principal
    │   ├── main.tsx    # Punto de entrada de la aplicación
    │   └── index.css   # Estilos globales
    ├── package.json    # Dependencias del frontend
    └── vite.config.ts  # Configuración de Vite
```

## Uso

1. Haz clic en el botón "Grabar" para comenzar a grabar tu voz.
2. Habla claramente al micrófono.
3. La grabación se detendrá automáticamente después de 30 segundos o puedes detenerla manualmente.
4. La transcripción aparecerá en la pantalla.

## Despliegue

### Backend

1. Asegúrate de tener instalado el SDK de Google Cloud y estar autenticado:
   ```bash
   gcloud auth login
   gcloud config set project TU_PROYECTO_ID
   ```

2. Despliega la Cloud Function:
   ```bash
   cd functions
   npm run deploy
   ```

### Frontend

Puedes desplegar el frontend en cualquier servicio de hosting estático como Vercel, Netlify o Firebase Hosting.

## Variables de entorno

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `ELEVEN_LABS_API_KEY` | Tu API Key de ElevenLabs | Sí |
| `ELEVEN_LABS_VOICE_ID` | ID de la voz a utilizar (opcional) | No |

## Licencia

Este proyecto está bajo la Licencia MIT. stt
