
import psycopg2
import os

def check_menus():
    try:
        conn = psycopg2.connect(host="aws-1-ap-southeast-2.pooler.supabase.com", database="postgres", user="postgres.kmtcbkxvrbnfijvbdsrx", password="s5isI0KE48Bd9kD1", port=6543)
        cur = conn.cursor()
        
        print("--- Checking Menu mapping for Management items ---")
        cur.execute("""
            SELECT MENU_NO, MENU_NM, MODERN_ROUTE, PROGRM_FILE_NM 
            FROM NMENUINFO 
            WHERE MENU_NM LIKE '%메뉴%' OR MENU_NM LIKE '%사이트맵%' 
            ORDER BY MENU_NO
        """)
        rows = cur.fetchall()
        for r in rows:
            print(f"NO: {r[0]}, NM: {r[1]}, ROUTE: {r[2]}, PROGRM: {r[3]}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_menus()
