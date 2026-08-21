const { Client } = require('pg');

const regions = [
  "ap-northeast-2",
  "us-east-1",
  "ap-southeast-1",
  "eu-central-1",
  "ap-south-1"
];

async function testRegions() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    console.log(`Testing region ${region} (${host})...`);
    const client = new Client({
      host: host,
      port: 6543,
      database: 'postgres',
      user: 'postgres.qpsmgcsbabgfncwrypmb',
      password: 'LOkBSScR4wqigGim',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });
    try {
      await client.connect();
      console.log(`  -> SUCCESS! Connected to ${region}`);
      const res = await client.query('SELECT version()');
      console.log(`  -> Version:`, res.rows[0].version);
      await client.end();
      return;
    } catch (e) {
      console.log(`  -> Failed: Code=${e.code}, Message=${e.message}`);
    }
  }
}

testRegions().catch(console.error);
