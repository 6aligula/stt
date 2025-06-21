import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import config from './config';

const App = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const animationRef = useRef<number>();
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Inicializar el analizador de audio
  const initAudioAnalyser = async (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 1024;

    microphone.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    scriptProcessor.onaudioprocess = () => {
      const array = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(array);
      
      const arraySum = array.reduce((a, b) => a + b, 0);
      const average = arraySum / array.length;
      
      // Escalar el valor para que sea más visible
      const scaledVolume = Math.min(Math.max(average / 2, 0), 100);
      setVolume(scaledVolume);
    };

    return () => {
      scriptProcessor.disconnect();
      analyser.disconnect();
      microphone.disconnect();
    };
  };

  // Iniciar la grabación
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Inicializar el analizador de audio
      await initAudioAnalyser(stream);
      
      // Configurar el MediaRecorder para usar formato webm por defecto
      const options = { mimeType: 'audio/webm;codecs=opus' };
      
      try {
        mediaRecorder.current = new MediaRecorder(stream, options);
      } catch (e) {
        console.warn('No se pudo usar el formato webm/opus, usando formato por defecto', e);
        mediaRecorder.current = new MediaRecorder(stream);
      }
      
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        console.log('Datos de audio disponibles, tamaño:', event.data.size);
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      
      mediaRecorder.current.onstop = async () => {
        setIsProcessing(true);
        try {
          const audioBlob = new Blob(audioChunks.current, { type: 'audio/mp3' });
          await sendAudioToBackend(audioBlob);
        } catch (err) {
          setError('Error al procesar el audio. Por favor, inténtalo de nuevo.');
          console.error('Error processing audio:', err);
        } finally {
          setIsProcessing(false);
          setVolume(0);
        }
      };
      
      mediaRecorder.current.start();
      setIsRecording(true);
      
      // Detener la grabación después de 30 segundos como máximo
      setTimeout(() => {
        if (mediaRecorder.current?.state === 'recording') {
          stopRecording();
        }
      }, 30000);
      
    } catch (err) {
      setError('No se pudo acceder al micrófono. Asegúrate de otorgar los permisos necesarios.');
      console.error('Error accessing microphone:', err);
    }
  };

  // Detener la grabación
  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      // Detener la grabación y esperar a que se dispare el evento ondataavailable
      mediaRecorder.current.stop();
      
      // Detener todas las pistas de audio
      if (mediaRecorder.current.stream) {
        mediaRecorder.current.stream.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      }
      
      setIsRecording(false);
      
      // Procesar el audio grabado
      setTimeout(async () => {
        if (audioChunks.current.length > 0) {
          setIsProcessing(true);
          try {
            // Usar el tipo MIME correcto basado en lo que soporte el navegador
            const mimeType = mediaRecorder.current?.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunks.current, { type: mimeType });
            console.log('Tamaño del blob de audio:', audioBlob.size, 'bytes');
            console.log('Tipo MIME del blob:', mimeType);
            
            await sendAudioToBackend(audioBlob);
          } catch (err) {
            console.error('Error al procesar el audio:', err);
            setError('Error al procesar el audio. Por favor, inténtalo de nuevo.');
          } finally {
            setIsProcessing(false);
            setVolume(0);
            audioChunks.current = [];
          }
        } else {
          setError('No se capturó ningún audio. Intenta de nuevo.');
        }
      }, 100); // Pequeño retraso para asegurar que se procesen todos los chunks
    }
  };

  // Enviar el audio al backend para su procesamiento
  const sendAudioToBackend = async (audioBlob: Blob) => {
    try {
      console.log('Enviando audio al backend...');
      
      // Convertir el Blob a ArrayBuffer
      const audioBuffer = await audioBlob.arrayBuffer();
      
      // Usar directUrl en producción, apiUrl en desarrollo
      const apiUrl = import.meta.env.PROD ? config.directUrl : config.apiUrl;
      
      console.log('Enviando audio a:', apiUrl);
      console.log('Tamaño del audio:', audioBuffer.byteLength, 'bytes');
      console.log('Tipo MIME del audio:', audioBlob.type);
      
      // Determinar el tipo de contenido basado en el tipo MIME del blob
      const contentType = audioBlob.type || 'audio/webm';
      
      // Enviar el audio al endpoint configurado
      const response = await axios.post(apiUrl, audioBuffer, {
        headers: {
          'Content-Type': contentType,
          'Accept': 'application/json',
          // Agregar un ID de solicitud para seguimiento
          'X-Request-ID': `frontend-${Date.now()}`
        },
        responseType: 'json',
        withCredentials: false, // Importante para evitar problemas con CORS
        timeout: 30000 // Timeout de 30 segundos
      });
      
      console.log('Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      
      console.log('Respuesta del backend:', response.data);
      
      if (response.data && response.data.text) {
        setTranscript(prev => prev + ' ' + response.data.text);
        return true;
      } else {
        setError('No se pudo transcribir el audio. Inténtalo de nuevo.');
        return false;
      }
    } catch (err) {
      console.error('Error al enviar audio al backend:', err);
      if (axios.isAxiosError(err)) {
        console.error('Error response:', err.response?.data);
        setError(`Error del servidor: ${err.response?.data?.error || err.message}`);
      } else {
        setError('Error al procesar el audio. Por favor, inténtalo de nuevo.');
      }
      return false;
    }
  };

  // Manejar el clic en el botón de grabación
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Limpiar al desmontar el componente
  useEffect(() => {
    return () => {
      if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
        mediaRecorder.current.stop();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Renderizar la interfaz de usuario
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Speech to Text
          </h1>
          <p className="mt-3 text-xl text-gray-500">
            Graba tu voz y conviértela en texto en tiempo real
          </p>
        </div>
        
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          {/* Botón de grabación */}
          <div className="flex justify-center">
            <button
              onClick={toggleRecording}
              disabled={isProcessing}
              className={`record-button flex items-center justify-center w-24 h-24 rounded-full bg-blue-500 text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isRecording ? 'recording' : 'hover:bg-blue-600'
              }`}
            >
              {isRecording ? (
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-white rounded-full mr-2"></span>
                  Detener
                </span>
              ) : (
                'Grabar'
              )}
            </button>
          </div>

          {/* Indicador de grabación */}
          {isRecording && (
            <div className="mt-8">
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                <span>Grabando... (máx. 30 segundos)</span>
              </div>
              
              {/* Visualización de ondas de sonido */}
              <div className="sound-wave">
                {[1, 2, 3, 4, 5].map((_, index) => (
                  <div 
                    key={index}
                    style={{
                      height: `${10 + volume * 1.5}px`,
                      transition: 'height 0.1s ease-out',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Indicador de procesamiento */}
          {isProcessing && (
            <div className="mt-6 text-center text-blue-600">
              <p>Procesando audio...</p>
              <div className="inline-block mt-2 w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          )}

          {/* Transcripción */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Transcripción:</h2>
            <div className="transcript-container">
              {transcript ? (
                <p className="whitespace-pre-wrap">{transcript}</p>
              ) : (
                <p className="text-gray-400 italic">La transcripción aparecerá aquí...</p>
              )}
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Presiona el botón para comenzar a grabar. La grabación se detendrá automáticamente después de 30 segundos.</p>
        </div>
      </div>
    </div>
  );
};

export default App;