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
    
    # 1. Create NKNOWLEDGE
    print("Creating NKNOWLEDGE table if not exists...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS NKNOWLEDGE (
            KNO_ID VARCHAR(20) PRIMARY KEY,
            ORGNZT_ID VARCHAR(20),
            EMPLYR_ID VARCHAR(20),
            KNO_TYPE_CD VARCHAR(20),
            KNO_NM VARCHAR(255) NOT NULL,
            KNO_CN TEXT,
            OTHBC_AT CHAR(1),
            COL_YMD VARCHAR(20),
            ATCH_FILE_ID VARCHAR(20),
            FRST_REGISTER_ID VARCHAR(20),
            LAST_UPDUSR_ID VARCHAR(20),
            FRST_REGIST_PNTTM TIMESTAMP,
            LAST_UPDT_PNTTM TIMESTAMP
        );
    """)

    # 2. Add Audit Columns to NSYSLOG
    print("Checking NSYSLOG columns...")
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'nsyslog';")
    cols = [r[0].lower() for r in cur.fetchall()]
    
    missing_cols = [
        ('FRST_REGISTER_ID', 'VARCHAR(20)'),
        ('LAST_UPDUSR_ID', 'VARCHAR(20)'),
        ('FRST_REGIST_PNTTM', 'TIMESTAMP'),
        ('LAST_UPDT_PNTTM', 'TIMESTAMP')
    ]
    
    for col_name, col_type in missing_cols:
        if col_name.lower() not in cols:
            print(f"Adding column {col_name} to NSYSLOG...")
            cur.execute(f"ALTER TABLE NSYSLOG ADD COLUMN {col_name} {col_type};")

    # 3. Add Audit Columns to NWEBLOG (Web Log) - also often audited
    print("Checking NWEBLOG columns...")
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'nweblog';")
    cols = [r[0].lower() for r in cur.fetchall()]
    for col_name, col_type in missing_cols:
        if col_name.lower() not in cols:
            print(f"Adding column {col_name} to NWEBLOG...")
            cur.execute(f"ALTER TABLE NWEBLOG ADD COLUMN {col_name} {col_type};")

    conn.commit()
    print("Migrations complete.")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
