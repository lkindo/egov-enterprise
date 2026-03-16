import requests
import json

url = 'http://127.0.0.1:8080/api/v1/auth/login'
data = {'id': 'webmaster', 'password': '1'}
headers = {'Content-Type': 'application/json'}

try:
    response = requests.post(url, data=json.dumps(data), headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
