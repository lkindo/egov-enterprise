import psycopg2
import sys

try:
    conn = psycopg2.connect(
        host="aws-1-ap-southeast-2.pooler.supabase.com",
        port=6543,
        database="postgres",
        user="postgres.kmtcbkxvrbnfijvbdsrx",
        password="s5isI0KE48Bd9kD1",
        sslmode="require",
        options="-c search_path=public"
    )
    cur = conn.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
    rows = cur.fetchall()
    print("All tables in public schema:")
    for r in rows:
        print(f"- {r[0]}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
