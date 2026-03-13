import requests
import json

url = "http://localhost:8080/api/v1/auth/login"
data = {"userId": "webmaster", "password": "egov1234"}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Body: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
except Exception as e:
    print(f"Error: {e}")
