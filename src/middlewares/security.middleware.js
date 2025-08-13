import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Rate limiting para login - Deshabilitado
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Límite muy alto para efectivamente deshabilitar
  message: {
    error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => true, // Saltar el rate limiting completamente
});

// Rate limiting general para API - Completamente deshabilitado
export const apiLimiter = (req, res, next) => {
  // Sin límites de peticiones - acceso libre
  next();
};

// Configuración de helmet para headers de seguridad
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      // Permitir conexiones a Vercel y localhost
      connectSrc: [
        "'self'",
        "https://brayamsac-frontend.vercel.app",
        "https://brayamsac-frontend-git-main-brayamsactls-projects.vercel.app",
        "https://brayamsac-frontend-brayamsactls-projects.vercel.app",
        "http://localhost:*"
      ],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      // Permitir iframes en desarrollo, bloquear en producción
      frameSrc: process.env.NODE_ENV === 'development' ? ["'self'", "http://localhost:*"] : ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Necesario para algunos casos de CORS
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Permitir recursos cross-origin
  // Configurar X-Frame-Options para permitir iframes en desarrollo
  frameguard: process.env.NODE_ENV === 'development' ? { action: 'sameorigin' } : { action: 'deny' },
});
