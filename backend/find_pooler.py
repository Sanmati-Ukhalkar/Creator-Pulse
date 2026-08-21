import socket
import ssl

regions = [
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
    "ap-south-1", "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1",
    "eu-central-2", "sa-east-1"
]

project_ref = "qpsmgcsbabgfncwrypmb"
user = f"postgres.{project_ref}"

for region in regions:
    host = f"aws-0-{region}.pooler.supabase.com"
    print(f"Testing {region} ({host})...")
    try:
        # We can just try to connect to port 6543 and read the initial PG response
        # or resolve it
        ips = socket.getaddrinfo(host, 6543)
        ipv4s = [ip[4][0] for ip in ips if ip[0] == socket.AF_INET]
        if not ipv4s:
            print(f"  No IPv4 for {region}")
            continue
        
        # Connect to port 6543
        s = socket.create_connection((ipv4s[0], 6543), timeout=3)
        
        # Send PG StartupMessage
        # Packet length: 4 (len) + 4 (protocol version) + len(user) + len(database) etc.
        # Let's construct a minimal PG startup message to see what the pooler responds.
        # Actually, if we just connect and send a dummy packet, we can see if it closes/rejects
        # or we can use pg connection logic.
        # But we can also just use a simpler method: use pg in node to test.
        # Wait, since python is faster to run in a loop, let's write a simple postgres startup packet:
        # StartupMessage format:
        # Int32: packet length
        # Int32: protocol version (196608)
        # Name/Value pairs: user\0postgres.qpsmgcsbabgfncwrypmb\0database\0postgres\0\0
        user_bytes = f"postgres.{project_ref}".encode('utf-8')
        db_bytes = b"postgres"
        payload = b"\x00\x03\x00\x00" + b"user\x00" + user_bytes + b"\x00database\x00" + db_bytes + b"\x00\x00"
        packet_len = len(payload) + 4
        packet = packet_len.to_bytes(4, byteorder='big') + payload
        
        s.sendall(packet)
        resp = s.recv(1024)
        s.close()
        
        # Parse PG response
        # If tenant/user not found, it responds with ErrorResponse (starts with 'E') containing the message
        # If it asks for password, it responds with AuthenticationOk ('R') or AuthenticationMD5Password / AuthenticationCleartextPassword
        if resp.startswith(b'E'):
            # Error message
            msg = resp[5:].decode('utf-8', errors='ignore')
            if "tenant/user" in msg and "not found" in msg:
                # print(f"  Tenant not found")
                pass
            else:
                print(f"  -> Match? Error response: {msg}")
        elif resp.startswith(b'R') or resp.startswith(b'S'):
            print(f"  -> SUCCESS! Found pooler region: {region}")
            break
        else:
            print(f"  -> Unknown response: {resp}")
    except Exception as e:
        print(f"  Failed: {e}")
