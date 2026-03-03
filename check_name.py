
import psycopg2
import os

def check_db():
    try:
        conn = psycopg2.connect(host="aws-1-ap-southeast-2.pooler.supabase.com", database="postgres", user="postgres.kmtcbkxvrbnfijvbdsrx", password="s5isI0KE48Bd9kD1", port=6543)
        cur = conn.cursor()
        
        # Check USER_NM and USER_ID
        print("--- User Name Check for 'webmaster' ---")
        cur.execute("SELECT EMPLYR_ID, USER_NM, ESNTL_ID FROM NEMPLYRINFO WHERE EMPLYR_ID = 'webmaster'")
        row = cur.fetchone()
        if row:
            # Try to decode if it looks like bytes or just print representation
            print(f"USER_ID: {row[0]}")
            print(f"USER_NM: {row[1]}")
            print(f"ESNTL_ID: {row[2]}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db()
