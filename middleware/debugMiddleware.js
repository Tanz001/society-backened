const debugMiddleware = (req, res, next) => {
  console.log('\n🔍 Debug Information:');
  console.log('📍 URL:', req.method, req.originalUrl);
  console.log('🔑 Headers:', {
    'content-type': req.headers['content-type'],
    'authorization': req.headers['authorization'] ? 'Present' : 'Missing',
  });
  console.log('📦 Body:', req.body);
  console.log('📎 Files:', req.files ? Object.keys(req.files) : 'No files');
  next();
};

module.exports = debugMiddleware;
