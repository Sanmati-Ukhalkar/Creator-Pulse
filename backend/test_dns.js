const dns = require('dns');
dns.lookup('db.qpsmgcsbabgfncwrypmb.supabase.co', (err, address, family) => {
  if (err) {
    console.error("Error:", err);
  } else {
    console.log("Address:", address, "Family:", family);
  }
});
