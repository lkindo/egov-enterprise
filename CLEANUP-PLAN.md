# 🧹 프로젝트 정리 계획

## 📋 분석 결과

### 제거 대상 파일/폴더

#### 1. 임시 및 빌드 산출물
- ✅ `build/` - Gradle 빌드 결과물
- ✅ `.gradle/` - Gradle 캐시
- ✅ `encoding-logs/` - UTF-8 변환 로그 (일회성)
- ✅ `frontend/.next/` - Next.js 빌드 결과물
- ✅ `frontend/node_modules/` - npm 의존성

#### 2. 중복 설정 템플릿
- ✅ `utf8-project-template/` - `config-templates` 로 통합됨
- ✅ `config-templates/` - GitHub 저장소로 분리 예정

#### 3. 일회성 스크립트
- ✅ `convert-all-to-utf8.py` - UTF-8 변환 완료됨
- ✅ `convert-all-utf8-recovery.py` - UTF-8 변환 완료됨
- ✅ `convert-encoding.py` - UTF-8 변환 완료됨
- ✅ `convert-service-encoding.py` - UTF-8 변환 완료됨
- ✅ `convert-service-to-utf8.py` - UTF-8 변환 완료됨

#### 4. 레거시 코드 (선택)
- ⚠️ `legacy/` - 레거시 eGovFrame 원본 (참조용)
  - 제거 시: 용량 감소, Git 히스토리 깔끔함
  - 유지 시: 과거 코드 참조 가능

#### 5. AI 도구 폴더 (선택)
- ⚠️ `.agent/` - AI 에이전트 설정
- ⚠️ `.Jules/` - AI 도구 설정
  - 팀에서 사용하지 않으면 제거

#### 6. Git 병합 충돌
- ⚠️ `.gitignore` - 병합 충돌 마커 제거 필요

---

## 🎯 정리 작업 계획

### 1 단계: Git .gitignore 정리

```bash
# .gitignore 파일에서 병합 충돌 마커 제거
<<<<<<< HEAD
=======
>>>>>>> dev1
```

### 2 단계: 임시 파일 삭제

```bash
# Gradle 빌드 결과물
Remove-Item -Recurse -Force build\
Remove-Item -Recurse -Force .gradle\

# UTF-8 변환 로그
Remove-Item -Recurse -Force encoding-logs\

# Frontend 빌드 결과물
Remove-Item -Recurse -Force frontend\.next\
Remove-Item -Recurse -Force frontend\node_modules\
```

### 3 단계: 중복 템플릿 삭제

```bash
# utf8-project-template (config-templates 로 통합)
Remove-Item -Recurse -Force utf8-project-template\

# config-templates (GitHub 저장소로 분리)
Remove-Item -Recurse -Force config-templates\
```

### 4 단계: 일회성 스크립트 삭제

```bash
Remove-Item convert-all-to-utf8.py
Remove-Item convert-all-utf8-recovery.py
Remove-Item convert-encoding.py
Remove-Item convert-service-encoding.py
Remove-Item convert-service-to-utf8.py
```

### 5 단계: 선택 항목 (팀과 상의)

```bash
# 레거시 코드 (참조 불필요 시)
Remove-Item -Recurse -Force legacy\

# AI 도구 폴더 (사용 안 함)
Remove-Item -Recurse -Force .agent\
Remove-Item -Recurse -Force .Jules\
```

---

## ✅ 유지해야 할 파일

### 프로젝트 필수
- `build.gradle` - Gradle 빌드 설정
- `settings.gradle` - Gradle 프로젝트 설정
- `gradle.properties` - Gradle 속성
- `gradlew.bat` - Gradle Wrapper
- `gradle/wrapper/` - Gradle Wrapper 파일

### 소스 코드
- `api-server/` - Spring Boot API 서버
- `common-core/` - 공통 코어
- `common-domain/` - 공통 도메인
- `common-security/` - 공통 보안
- `common-service/` - 공통 서비스
- `frontend/` - Next.js 프론트엔드 (소스만)

### 설정
- `.gitignore` - Git ignore (정리 필요)
- `.editorconfig` - EditorConfig
- `.gitattributes` - Git attributes
- `.vscode/` - VSCode 설정

### 문서
- `README.md` - 프로젝트 설명
- `docs/` - 문서 (PRD, TRD, LLD 등)

### 테스트
- `e2e/` - E2E 테스트
- `playwright.config.ts` - Playwright 설정

### 인프라
- `docker-compose.yml` - Docker 설정

---

## 📊 예상 효과

### 삭제 전
```
프로젝트 크기: 약 2.5 GB
- node_modules: 800 MB
- .next: 300 MB
- build: 200 MB
- legacy: 500 MB
- 기타: 700 MB
```

### 삭제 후
```
프로젝트 크기: 약 400 MB
- 소스 코드: 200 MB
- 문서: 50 MB
- 설정: 150 MB
```

### 효과
- ✅ Git 속도 향상 (약 80% 감소)
- ✅ 빌드 시간 단축 (불필요 파일 없음)
- ✅ 저장소 관리 용이
- ✅ 팀원 온보딩 간소화

---

## ⚠️ 주의사항

1. **백업**: 삭제 전 Git 에 커밋
   ```bash
   git add .
   git commit -m "Before cleanup"
   ```

2. **공유**: 팀원들에게 알림
   - 삭제 목록 공유
   - 레거시 코드 유지 여부 상의

3. **복구**: 실수 시 Git 으로 복구
   ```bash
   git reset --hard HEAD~1
   ```

---

## 🚀 실행 명령어

### 안전 모드 (미리보기)

```powershell
# 삭제될 파일 목록만 확인
.\cleanup-project.ps1 -WhatIf
```

### 실제 삭제

```powershell
# 실제 삭제 실행
.\cleanup-project.ps1

# 레거시도 함께 삭제
.\cleanup-project.ps1 -IncludeLegacy

# AI 도구 폴더도 삭제
.\cleanup-project.ps1 -IncludeAIFolders
```

---

**생성일**: 2026-02-20  
**버전**: 1.0
