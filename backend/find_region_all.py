import urllib.request
import json
import ipaddress

ip = ipaddress.ip_address("2406:da12:5ca:b702:27a5:979d:be86:235a")
url = "https://ip-ranges.amazonaws.com/ip-ranges.json"

try:
    response = urllib.request.urlopen(url)
    data = json.loads(response.read().decode())
    matches = []
    for prefix in data.get("ipv6_prefixes", []):
        net = ipaddress.ip_network(prefix["ipv6_prefix"])
        if ip in net:
            matches.append(prefix)
    
    # Sort matches by prefix length (descending) so most specific is first
    matches.sort(key=lambda x: ipaddress.ip_network(x["ipv6_prefix"]).prefixlen, reverse=True)
    
    for m in matches:
        print(f"Prefix: {m['ipv6_prefix']} | Region: {m['region']} | Service: {m['service']}")
except Exception as e:
    print("Error:", e)
