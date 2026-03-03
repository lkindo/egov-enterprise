
import psycopg2
import os

def update_db_comprehensive():
    try:
        conn = psycopg2.connect(host="aws-1-ap-southeast-2.pooler.supabase.com", database="postgres", user="postgres.kmtcbkxvrbnfijvbdsrx", password="s5isI0KE48Bd9kD1", port=6543)
        cur = conn.cursor()
        
        # 1. Update NPROGRMLIST URLs to be distinct
        print("--- Updating NPROGRMLIST URLs ---")
        program_mappings = {
            'EgovMenuListSelect': '/admin/system/menus',
            'EgovMenuManageSelect': '/admin/system/menus/batch',
            'EgovMenuCreatManageSelect': '/admin/system/menus/by-authority',
            'EgovSiteMapng': '/admin/system/menus', # Still no page, but keeping distinct for now if needed? No, use menus
            'EgovProgramListManageSelect': '/admin/system/programs',
            'EgovProgramChangeRequstSelect': '/admin/system/programs/requests',
            'EgovProgramChangeRequstProcessListSelect': '/admin/system/programs/requests/process',
            'EgovProgramChgHstListSelect': '/admin/system/programs/history',
        }
        
        for prog, url in program_mappings.items():
            cur.execute("UPDATE NPROGRMLIST SET URL = %s WHERE PROGRM_FILE_NM = %s", (url, prog))
        
        # 2. Update NMENUINFO modem_route and names
        print("--- Updating NMENUINFO Routes and Names ---")
        menu_mappings = [
            (6130000, '메뉴리스트관리', '/admin/system/menus'),
            (6140000, '메뉴관리리스트', '/admin/system/menus/batch'),
            (6150000, '메뉴생성관리', '/admin/system/menus/by-authority'),
            (6160000, '사이트맵', '/admin/system/menus'), # Using menus temporarily
            (6180000, '프로그램리스트관리', '/admin/system/programs'),
        ]
        
        for m_no, m_nm, m_route in menu_mappings:
            cur.execute("UPDATE NMENUINFO SET MENU_NM = %s, MODERN_ROUTE = %s WHERE MENU_NO = %s", (m_nm, m_route, m_no))
        
        # 3. Clean up other items in the 5300 block if any
        # (This is the "메뉴 구성 및 프로그램 설정" block)
        
        conn.commit()
        print("Successfully updated DB with distinct URLs and Korean names.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_db_comprehensive()
