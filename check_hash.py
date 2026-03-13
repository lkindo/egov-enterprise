import base64
import hashlib

def egov_encrypt(password, salt):
    # Egov encryptPassword usually does something like SHA-256(password + salt)
    # But it depends on the implementation. Let's try common ones.
    
    # Try 1: SHA-256(password + salt)
    combined = password + salt
    h = hashlib.sha256(combined.encode('utf-8')).digest()
    return base64.b64encode(h).decode('utf-8')

# DB hash for webmaster: lR9HSaayoa3L47nbYGT0XbRvrYp2Ldo4g54am6/pS2w=
db_hash = "lR9HSaayoa3L47nbYGT0XbRvrYp2Ldo4g54am6/pS2w="

print(f"Target Hash: {db_hash}")
print(f"Salt 'webmaster':      {egov_encrypt('egov1234', 'webmaster')}")
print(f"Salt 'USRCNFRM_99...': {egov_encrypt('egov1234', 'USRCNFRM_99999999999')}")
