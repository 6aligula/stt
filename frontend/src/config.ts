// Configuración para diferentes entornos
const config = {
  development: {
    // Usar /api/transcribe que será redirigido por el proxy de Vite
    apiUrl: '/api/transcribe',
    // URL directa a la función de Cloud Run
    directUrl: 'https://stt-function-gjoom7xsla-ew.a.run.app/transcribe'
  },
  production: {
    // En producción, usar la URL directa a la función de Cloud Run
    apiUrl: 'https://stt-function-gjoom7xsla-ew.a.run.app/transcribe',
    directUrl: 'https://stt-function-gjoom7xsla-ew.a.run.app/transcribe'
  }
};

// Asegurarse de que las URLs terminen con /transcribe
Object.values(config).forEach(env => {
  Object.entries(env).forEach(([key, value]) => {
    if (key === 'apiUrl' || key === 'directUrl') {
      if (!value.endsWith('/transcribe')) {
        env[key] = value.endsWith('/') 
          ? `${value}transcribe` 
          : `${value}/transcribe`;
      }
    }
  });
});

// Determinar el entorno actual (development o production)
const env = import.meta.env.MODE || 'development';

// Exportar configuración basada en el entorno
export default env === 'production' ? config.production : config.development;
