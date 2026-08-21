import urllib.request
import json
import ipaddress

ip = ipaddress.ip_address("2406:da12:5ca:b702:27a5:979d:be86:235a")
url = "https://ip-ranges.amazonaws.com/ip-ranges.json"

try:
    response = urllib.request.urlopen(url)
    data = json.loads(response.read().decode())
    found = False
    for prefix in data.get("ipv6_prefixes", []):
        net = ipaddress.ip_network(prefix["ipv6_prefix"])
        if ip in net:
            print(f"Matched Prefix: {prefix['ipv6_prefix']}")
            print(f"Region: {prefix['region']}")
            print(f"Service: {prefix['service']}")
            found = True
            break
    if not found:
        print("Not found in official list")
except Exception as e:
    print("Error:", e)
