"""Quick script to connect to WebRTC and dump raw stats."""
import requests, json, time, sys

BASE = "http://127.0.0.1:3000"
CLIENT_ID = "debug-test-001"

try:
    r = requests.get(f"{BASE}/health", timeout=3)
    print("Server health:", r.json())
except Exception as e:
    print(f"Server not reachable: {e}")
    sys.exit(1)

caps = requests.get(f"{BASE}/rtpCapabilities").json()

r = requests.post(f"{BASE}/createTransport", json={"clientId": CLIENT_ID})
transport_info = r.json()
print("\nTransport created:", json.dumps(transport_info, indent=2)[:500])

time.sleep(2)
try:
    r = requests.get(f"{BASE}/stats/{CLIENT_ID}", timeout=3)
    stats = r.json()
    print("\n=== RAW TRANSPORT STATS ===")
    if 'transport' in stats and stats['transport']:
        for i, entry in enumerate(stats['transport']):
            if isinstance(entry, dict):
                print(f"\nTransport entry {i}:")
                for k, v in sorted(entry.items()):
                    print(f"  {k}: {v}")
    print("\n=== RAW CONSUMER STATS ===")
    if 'consumer' in stats and stats['consumer']:
        for i, entry in enumerate(stats['consumer']):
            if isinstance(entry, dict):
                print(f"\nConsumer entry {i}:")
                for k, v in sorted(entry.items()):
                    print(f"  {k}: {v}")
    else:
        print("No consumer stats (not consuming yet)")
except Exception as e:
    print(f"Stats error: {e}")

requests.post(f"{BASE}/disconnect", json={"clientId": CLIENT_ID})
print("\nDisconnected.")
