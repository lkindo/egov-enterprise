import base64
import hashlib

def egov_encrypt(password, salt):
    combined = password + salt
    h = hashlib.sha256(combined.encode('utf-8')).digest()
    return base64.b64encode(h).decode('utf-8')

# DB password hash target
password_to_test = "1"
salts = ["webmaster", "USRCNFRM_99999999999"]

for salt in salts:
    print(f"Password '{password_to_test}' with Salt '{salt}': {egov_encrypt(password_to_test, salt)}")
