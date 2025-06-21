#!/bin/bash

# Script para desplegar la función de Cloud Run con la API key de ElevenLabs
# Uso: ./deploy-function.sh TU_API_KEY_DE_ELEVENLABS

# Verificar que se proporcione la API key
if [ $# -eq 0 ]; then
  echo "Error: Debes proporcionar tu API key de ElevenLabs como argumento"
  echo "Uso: $0 TU_API_KEY_DE_ELEVENLABS"
  exit 1
fi

# Configuración
PROJECT_ID="senderos-dev"
REGION="europe-west1"
SERVICE_NAME="stt-function"
ELEVEN_LABS_API_KEY="$1"

# Construir la función
echo "🔨 Construyendo la función..."
cd functions && npm run build && cd ..

# Desplegar la función con la API key
echo "🚀 Desplegando la función en Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --source ./functions \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --project=$PROJECT_ID \
  --set-env-vars="ELEVEN_LABS_API_KEY=$ELEVEN_LABS_API_KEY" \
  --update-env-vars="ELEVEN_LABS_API_KEY=$ELEVEN_LABS_API_KEY"

# Mostrar información de la función desplegada
echo -e "\n✅ Función desplegada exitosamente"
echo "URL: https://$SERVICE_NAME-gjoom7xsla-ew.a.run.app"

# Mostrar cómo probar la función
echo -e "\n🔍 Para probar la función:"
echo "curl -X GET https://$SERVICE_NAME-gjoom7xsla-ew.a.run.app/health"
echo -e "\nPara probar la transcripción:"
echo "curl -X POST https://$SERVICE_NAME-gjoom7xsla-ew.a.run.app/transcribe \
  -H 'Content-Type: audio/wav' \
  --data-binary @test-audio.wav"

echo -e "\n🔧 Para ver los logs de la función:"
echo "gcloud logging read 'resource.type=cloud_run_revision resource.labels.service_name=$SERVICE_NAME' --limit=50 --project=$PROJECT_ID"
