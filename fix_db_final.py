
import psycopg2
import os

def update_db():
    try:
        conn = psycopg2.connect(host="aws-1-ap-southeast-2.pooler.supabase.com", database="postgres", user="postgres.kmtcbkxvrbnfijvbdsrx", password="s5isI0KE48Bd9kD1", port=6543)
        cur = conn.cursor()
        
        # 1. Update NPROGRMLIST URLs to be distinct
        print("--- Updating NPROGRMLIST URLs ---")
        cur.execute("UPDATE NPROGRMLIST SET URL = '/admin/system/menus' WHERE PROGRM_FILE_NM = 'EgovMenuListSelect'")
        cur.execute("UPDATE NPROGRMLIST SET URL = '/admin/system/menus/batch' WHERE PROGRM_FILE_NM = 'EgovMenuManageSelect'")
        cur.execute("UPDATE NPROGRMLIST SET URL = '/admin/system/menus/by-authority' WHERE PROGRM_FILE_NM = 'EgovMenuCreatManageSelect'")
        cur.execute("UPDATE NPROGRMLIST SET URL = '/admin/system/menus' WHERE PROGRM_FILE_NM = 'EgovSiteMapng'")
        
        # 2. Update NMENUINFO modem_route and names (trying to fix encoding if possible)
        print("--- Updating NMENUINFO Routes and Names ---")
        # In case the names are causing a match issue in ICON_MAP or others
        # We'll use Korean strings. Python psycopg2 usually handles them fine.
        cur.execute("UPDATE NMENUINFO SET MENU_NM = '메뉴리스트관리', MODERN_ROUTE = '/admin/system/menus' WHERE MENU_NO = 6130000")
        cur.execute("UPDATE NMENUINFO SET MENU_NM = '메뉴관리리스트', MODERN_ROUTE = '/admin/system/menus/batch' WHERE MENU_NO = 6140000")
        cur.execute("UPDATE NMENUINFO SET MENU_NM = '메뉴생성관리', MODERN_ROUTE = '/admin/system/menus/by-authority' WHERE MENU_NO = 6150000")
        cur.execute("UPDATE NMENUINFO SET MENU_NM = '사이트맵', MODERN_ROUTE = '/admin/system/menus' WHERE MENU_NO = 6160000")
        
        conn.commit()
        print("Successfully updated DB.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_db()
