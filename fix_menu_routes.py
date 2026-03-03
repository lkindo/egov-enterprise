
import psycopg2
import os

def fix_menu_routes():
    try:
        conn = psycopg2.connect(host="aws-1-ap-southeast-2.pooler.supabase.com", database="postgres", user="postgres.kmtcbkxvrbnfijvbdsrx", password="s5isI0KE48Bd9kD1", port=6543)
        cur = conn.cursor()
        
        updates = [
            (6130000, '/admin/system/menus'),
            (6140000, '/admin/system/menus/batch'),
            (6150000, '/admin/system/menus/by-authority'),
            (6160000, '/admin/system/menus') # Fallout as no sitemap yet
        ]
        
        print("--- Updating Menu Routes ---")
        for m_no, route in updates:
            print(f"Updating {m_no} to {route}...")
            cur.execute("UPDATE NMENUINFO SET MODERN_ROUTE = %s WHERE MENU_NO = %s", (route, m_no))
        
        conn.commit()
        print("Successfully updated menu routes.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_menu_routes()
