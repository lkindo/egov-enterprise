#!/bin/bash
# CUBRID 데이터베이스 초기화 스크립트
# eGovFrame Enterprise 프로젝트용

set -e

DB_NAME="demodb"
DB_USER="dba"
INIT_DIR="/docker-entrypoint-initdb.d"

echo "=========================================="
echo "CUBRID Database Initialization Script"
echo "Database: $DB_NAME"
echo "=========================================="

# CUBRID 서비스가 준비될 때까지 대기
wait_for_cubrid() {
    echo "Waiting for CUBRID service to be ready..."
    for i in {1..30}; do
        if cubrid server status | grep -q "$DB_NAME"; then
            echo "CUBRID is ready!"
            return 0
        fi
        echo "Attempt $i/30: CUBRID not ready yet..."
        sleep 2
    done
    echo "CUBRID service failed to start"
    return 1
}

# 데이터베이스 생성 (없으면)
create_database() {
    if ! cubrid server status | grep -q "$DB_NAME"; then
        echo "Creating database: $DB_NAME"
        cubrid createdb --db-volume-size=512M --log-volume-size=256M $DB_NAME ko_KR.utf8
        cubrid server start $DB_NAME
    else
        echo "Database $DB_NAME already exists"
    fi
}

# DDL 실행
execute_ddl() {
    if [ -f "$INIT_DIR/all_ebt_ddl_cubrid.sql" ]; then
        echo "Executing DDL script..."
        csql -u $DB_USER $DB_NAME -i "$INIT_DIR/all_ebt_ddl_cubrid.sql"
        echo "DDL execution completed"
    else
        echo "DDL file not found, skipping..."
    fi
}

# 데이터 삽입
execute_data() {
    export LC_ALL=ko_KR.UTF-8
    export LANG=ko_KR.UTF-8
    
    if [ -f "$INIT_DIR/data_utf8_nobom.sql" ]; then
        echo "Executing data insertion script (No BOM)..."
        csql -u $DB_USER $DB_NAME -i "$INIT_DIR/data_utf8_nobom.sql"
        echo "Data insertion completed"
    elif [ -f "$INIT_DIR/all_ebt_data_cubrid_utf8.sql" ]; then
        echo "Executing data insertion script (UTF-8)..."
        csql -u $DB_USER $DB_NAME -i "$INIT_DIR/all_ebt_data_cubrid_utf8.sql"
        echo "Data insertion completed"
    else
        echo "Data file not found, skipping..."
    fi
}

# 뷰 생성
execute_views() {
    if [ -f "$INIT_DIR/recreate_view.sql" ]; then
        echo "Creating views..."
        csql -u $DB_USER $DB_NAME -i "$INIT_DIR/recreate_view.sql"
        echo "View creation completed"
    fi
    
    if [ -f "$INIT_DIR/create_security_compat_views.sql" ]; then
        echo "Creating security compatibility views..."
        csql -u $DB_USER $DB_NAME -i "$INIT_DIR/create_security_compat_views.sql"
        echo "Security views created"
    fi
}

# 메인 실행
main() {
    wait_for_cubrid
    create_database
    execute_ddl
    execute_data
    execute_views
    
    echo "=========================================="
    echo "Database initialization completed!"
    echo "Connection URL: jdbc:cubrid:localhost:33000:$DB_NAME:::?charSet=UTF-8"
    echo "=========================================="
}

# 스크립트가 직접 실행될 때만 main 호출
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main
fi
