// Middleware para manejo de errores de base de datos
import pool from '../config/db.js';

// Función para verificar el estado de la conexión
export const checkDatabaseHealth = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return { healthy: true, message: 'Database connection is healthy' };
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return { healthy: false, message: error.message };
  }
};

// Middleware para manejar errores de base de datos
export const dbErrorHandler = (error, req, res, next) => {
  console.error('Database Error:', {
    message: error.message,
    code: error.code,
    errno: error.errno,
    sqlState: error.sqlState,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Errores específicos de MySQL
  switch (error.code) {
    case 'PROTOCOL_CONNECTION_LOST':
      return res.status(503).json({
        error: 'Conexión con la base de datos perdida',
        message: 'Reintente la operación en unos momentos',
        code: 'DB_CONNECTION_LOST'
      });
    
    case 'ER_CON_COUNT_ERROR':
      return res.status(503).json({
        error: 'Demasiadas conexiones a la base de datos',
        message: 'El servidor está ocupado, reintente en unos momentos',
        code: 'DB_TOO_MANY_CONNECTIONS'
      });
    
    case 'ECONNREFUSED':
      return res.status(503).json({
        error: 'No se puede conectar a la base de datos',
        message: 'Servicio temporalmente no disponible',
        code: 'DB_CONNECTION_REFUSED'
      });
    
    case 'ETIMEDOUT':
    case 'ESOCKET':
      return res.status(504).json({
        error: 'Timeout en la consulta a la base de datos',
        message: 'La operación tardó demasiado tiempo',
        code: 'DB_TIMEOUT'
      });
    
    case 'ER_ACCESS_DENIED_ERROR':
      return res.status(503).json({
        error: 'Error de autenticación con la base de datos',
        message: 'Credenciales de base de datos inválidas',
        code: 'DB_AUTH_ERROR'
      });
    
    default:
      // Error genérico de base de datos
      return res.status(500).json({
        error: 'Error interno de base de datos',
        message: 'Ha ocurrido un error inesperado',
        code: 'DB_GENERIC_ERROR'
      });
  }
};

// Función para ejecutar consultas con retry automático
export const executeQueryWithRetry = async (query, params = [], maxRetries = 2) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`Ejecutando consulta (intento ${attempt}/${maxRetries + 1})`);
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      lastError = error;
      console.warn(`Intento ${attempt} falló:`, error.message);
      
      // Si es el último intento, lanzar el error
      if (attempt === maxRetries + 1) {
        throw error;
      }
      
      // Esperar antes del siguiente intento (backoff exponencial)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`Esperando ${delay}ms antes del siguiente intento...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Endpoint de health check para la base de datos
export const healthCheckEndpoint = async (req, res) => {
  try {
    const health = await checkDatabaseHealth();
    
    if (health.healthy) {
      res.status(200).json({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        message: health.message
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        message: health.message
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'unknown',
      timestamp: new Date().toISOString(),
      message: error.message
    });
  }
};