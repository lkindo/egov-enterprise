#!/bin/sh
# ==========================================================================
# eGov Enterprise Git Pre-Push Hook Installer (Linux/macOS)
# Automatically installs local database schema integrity guardian to pre-push hook.
# ==========================================================================

echo "🛡️ [Harness Installer] Git Pre-Push 정합성 가디언 설치를 시작합니다..."

GIT_DIR="../.git"
if [ ! -d "$GIT_DIR" ]; then
    GIT_DIR=".git"
fi

if [ ! -d "$GIT_DIR" ]; then
    echo "❌ [Error] .git 디렉토리를 찾을 수 없습니다. 프로젝트 루트 디렉토리에서 실행해 주세요."
    exit 1
fi

HOOKS_DIR="$GIT_DIR/hooks"
if [ ! -d "$HOOKS_DIR" ]; then
    mkdir -p "$HOOKS_DIR"
fi

HOOK_FILE="$HOOKS_DIR/pre-push"

echo "🔨 [Harness Installer] $HOOK_FILE 생성 중..."

cat << 'EOF' > "$HOOK_FILE"
#!/bin/sh
# ==========================================================================
# eGov Enterprise Local Integrity Pre-Push Hook
# Strictly validates JPA Entities and Flyway H2 DDL schemas before Git Push.
# ==========================================================================

echo "🔍 [Pre-Push Hook] Git Push 전 로컬 데이터베이스 스키마 및 Entity 정합성을 검증합니다..."
echo ""

# 1. foundation 단위 테스트 및 ddl-auto validate 엄격 실행
./gradlew :foundation:test

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ [Push Rejected] Entity 구조와 H2 DDL 마이그레이션 명세가 일치하지 않거나 단위 테스트가 실패했습니다."
    echo "👉 해결 방법:"
    echo "   1) 변경된 Entity 규격을 V1__init_test_schema.sql에 정상 덤프/반영했는지 확인하세요."
    echo "   2) 로컬에서 ./gradlew :foundation:test를 실행하여 오류 로그를 확인하세요."
    echo ""
    exit 1
fi

echo "✅ [Pre-Push Hook] JPA Entity <-> DDL 정합성 정밀 무결성 통과! PUSH를 계속 진행합니다."
exit 0
EOF

# 실행 권한 부여
chmod +x "$HOOK_FILE"

echo ""
echo "=========================================================================="
echo "🎉 [Success] Git Pre-Push 정합성 하네스 가디언이 성공적으로 로컬 저장소에 바인딩되었습니다!"
echo "이제 오타나 정합성이 맞지 않는 백엔드 빌드는 원천적으로 PUSH가 불가능합니다."
echo "=========================================================================="
echo ""
