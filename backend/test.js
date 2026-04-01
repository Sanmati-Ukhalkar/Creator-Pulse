const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres:nopass%401@localhost:5432/creatorpulse' }); 
client.connect()
  .then(() => client.query("SELECT id, user_id, upstream_id from drafts WHERE status='published'"))
  .then(res => { console.log(res.rows); client.end(); })
  .catch(console.error);
