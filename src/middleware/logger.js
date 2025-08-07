export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  // Логируем входящий запрос
  console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
  
  // Перехватываем завершение ответа
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    const size = Buffer.byteLength(body || '', 'utf8');
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - ${size} bytes`);
    
    return originalSend.call(this, body);
  };

  next();
};

export const webhookLogger = (req, res, next) => {
  console.log('=== WEBHOOK REQUEST ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('========================');
  next();
};

export default requestLogger;