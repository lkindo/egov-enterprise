
import psycopg2
import os

def fix_db():
    try:
        conn = psycopg2.connect(host="aws-1-ap-southeast-2.pooler.supabase.com", database="postgres", user="postgres.kmtcbkxvrbnfijvbdsrx", password="s5isI0KE48Bd9kD1", port=6543)
        cur = conn.cursor()
        
        # Update USER_NM to 'Admin' or '관리자'
        # Let's try to set it to '관리자' explicitly.
        print("--- Updating USER_NM to '관리자' for webmaster ---")
        cur.execute("UPDATE NEMPLYRINFO SET USER_NM = '관리자' WHERE EMPLYR_ID = 'webmaster'")
        conn.commit()
        
        cur.execute("SELECT EMPLYR_ID, USER_NM FROM NEMPLYRINFO WHERE EMPLYR_ID = 'webmaster'")
        row = cur.fetchone()
        print(f"Verified -> USER_ID: {row[0]}, USER_NM: {row[1]}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_db()
