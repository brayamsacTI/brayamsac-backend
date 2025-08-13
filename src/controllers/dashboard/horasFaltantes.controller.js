import * as HorasFaltantesService from '../../services/dashboard/horasFaltantes.service.js';

// Función para crear timeout en promesas
const withTimeout = (promise, timeoutMs = 15000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: La consulta tardó demasiado')), timeoutMs)
    )
  ]);
};

// Endpoint para obtener el ranking de trabajadores con horas faltantes (con fallback)
export const obtenerHorasFaltantes = async (req, res) => {
  try {
    console.log('Iniciando consulta de horas faltantes...');
    
    // Intentar consulta principal con timeout de 15 segundos
    let rows;
    try {
      rows = await withTimeout(HorasFaltantesService.obtenerHorasFaltantes(), 15000);
      console.log(`Consulta principal exitosa: ${rows.length} registros`);
    } catch (primaryError) {
      console.warn('Consulta principal falló, intentando consulta rápida:', primaryError.message);
      
      // Fallback: usar consulta rápida con timeout de 8 segundos
      try {
        rows = await withTimeout(HorasFaltantesService.obtenerHorasFaltantesRapido(), 8000);
        console.log(`Consulta rápida exitosa: ${rows.length} registros`);
        
        // Agregar header para indicar que se usó fallback
        res.setHeader('X-Fallback-Used', 'true');
      } catch (fallbackError) {
        console.error('Ambas consultas fallaron:', {
          primary: primaryError.message,
          fallback: fallbackError.message
        });
        
        // Último recurso: retornar array vacío con mensaje informativo
        return res.status(200).json({
          data: [],
          message: 'Servicio temporalmente no disponible. Los datos se están procesando.',
          fallback: true,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Validar que rows sea un array
    if (!Array.isArray(rows)) {
      console.warn('Resultado no es un array:', typeof rows);
      rows = [];
    }
    
    res.json({
      data: rows,
      count: rows.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error crítico en obtenerHorasFaltantes:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener las horas faltantes',
      timestamp: new Date().toISOString()
    });
  }
};
