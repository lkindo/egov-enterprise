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
    
    missing_cols = [
        ('FRST_REGISTER_ID', 'VARCHAR(20)'),
        ('LAST_UPDUSR_ID', 'VARCHAR(20)'),
        ('FRST_REGIST_PNTTM', 'TIMESTAMP'),
        ('LAST_UPDT_PNTTM', 'TIMESTAMP')
    ]
    
    for table_name in ['nbbs', 'nbbsmaster', 'nbbsmasteroptn', 'nbbsuse']:
        print(f"Checking {table_name} columns...")
        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}';")
        cols = [r[0].lower() for r in cur.fetchall()]
        for col_name, col_type in missing_cols:
            if col_name.lower() not in cols:
                print(f"Adding column {col_name} to {table_name}...")
                cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type};")

    conn.commit()
    print("Migrations complete.")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
