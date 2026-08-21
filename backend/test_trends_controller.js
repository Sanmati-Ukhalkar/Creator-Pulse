const { trendsController } = require('./src/controllers/trends.controller');
async function test() {
  const req = {
    user: { id: '2a58b9fd-a732-4a7a-b6ef-1ffa43bd968c' }
  };
  const res = {
    status: (code) => ({ json: (data) => console.log('STATUS', code, data) }),
    json: (data) => console.log('JSON', data)
  };
  
  // mock logger and aiService to avoid initializing full app
  // Wait, I can just compile and run it via ts-node
}
test();
