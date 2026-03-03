import requests
import json
import sys

menu_no = sys.argv[1] if len(sys.argv) > 1 else '50'
try:
    response = requests.get(f"http://localhost:8080/api/v1/menu/left?menuNo={menu_no}")
    if response.status_code == 200:
        data = response.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print(f"Error: {response.status_code}")
except Exception as e:
    print(f"Failed to connect: {e}")
