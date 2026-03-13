import requests
import json

url = "http://localhost:3001/api/v1/auth/login"
data = {"id": "webmaster", "password": "egov1234"}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
