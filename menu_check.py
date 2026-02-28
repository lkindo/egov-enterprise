import requests
import json
import sys

try:
    response = requests.get('http://localhost:8080/api/v1/menu/head')
    data = response.json()
    menus = data.get('data', {}).get('list', [])
    print(f"Total root menus: {len(menus)}")
    for m in menus:
        print(f"ID: {m.get('menuNo')} | Name: {m.get('menuNm')} | Upper: {m.get('upperMenuNo')}")
except Exception as e:
    print(f"Error: {e}")
