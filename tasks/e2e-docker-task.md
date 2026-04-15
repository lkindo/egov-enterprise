# E2E Docker 기반 테스트 태스크

## Loop 상태

### Think (분석)
- Supabase DB에서 전체 dump 필요 (public 스키마: 테이블, 시퀀스, 함수, 프로시저 모두)
- pg_dump 로컬 없음 → Docker postgres:17 이미지로 실행
- Supabase pooler(pgBouncer) 트랜잭션 모드(6543)는 pg_dump 불가 → 직접 연결(5432) 필요
- Supabase 프로젝트 ID: kmtcbkxvrbnfijvbdsrx
- 직접 호스트: db.kmtcbkxvrbnfijvbdsrx.supabase.co:5432

### Plan (계획)
1. [x] Docker로 Supabase pg_dump (--schema=public, 전체 객체+데이터)
2. [ ] docker-compose.e2e.yml 작성 (로컬 postgres + 덤프 자동 주입)
3. [ ] .env.e2e 환경 파일 작성 (로컬 DB 연결용)  
4. [ ] API 서버 빌드 + 기동 (로컬 DB 연결)
5. [ ] Frontend 기동 (localhost:3001 → API localhost:8080)
6. [ ] E2E 테스트 실행
7. [ ] 결과 보고

### Implement (구현)
- [ ] 진행 중

### Test (검증)
- [ ] 대기 중

### Summarize (요약)
- [ ] 대기 중
