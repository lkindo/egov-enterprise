# EGOV Enterprise E2E Testing Guide

본 문서는 전자정부 프레임워크 현대화 프로젝트의 E2E 테스트 안정성 확보를 위한 가이드를 제공합니다.

## 🚀 테스트 실행 환경 최적화

### 1. 좀비 프로세스 정리
윈도우 환경에서 반복적인 테스트 실행 시 `node.exe`와 `chrome.exe`가 메모리에 남을 수 있습니다. 테스트 전 아래 명령어로 정리하십시오.
```powershell
taskkill /F /IM node.exe /T; taskkill /F /IM chrome.exe /T
```

### 2. 서버 포트 고정
Next.js 서버와 백엔드 서버의 도메인을 일치시키십시오.
- 프론트엔드: `http://localhost:3001`
- 백엔드: `http://localhost:8080` (API Proxy 설정 필요)

## 🛡️ 테스트 안정화 전략 (Flaky Test 방지)

### 1. 절차적 로그인 (Procedural Login)
세션 주입이 실패할 경우를 대비하여 테스트 코드 내에서 직접 로그인을 수행하는 패턴을 권장합니다.
```typescript
await page.goto('/login');
await page.fill('#id', 'webmaster');
await page.fill('#password', '1');
await page.click('button[type="submit"]', { force: true });
```

### 2. 강제 이벤트 실행 (Force Events)
모달이나 로딩 오버레이가 버튼을 가리는 경우 `force: true` 옵션을 사용하십시오.
```typescript
await page.click('button:has-text("등록")', { force: true });
```

### 3. 타이핑 신뢰성 확보
복잡한 에디터(ProseMirror 등)는 필드 주입보다는 키보드 시뮬레이션이 더 안정적입니다.
```typescript
const editor = page.locator('.ProseMirror').first();
await editor.click();
await page.keyboard.type('내용 입력...');
```

## 📊 현재 복구된 모듈별 상태
- **BBS (게시판)**: CRUD 전체 흐름 보정 완료 (`bbs.spec.ts`)
- **Common Code (공통코드)**: 계층 트레이스 및 필드 매핑 완료 (`admin-code.spec.ts`)
- **Health Check**: 시스템 가용성 체크용 경량 스크립트 확보 (`health.spec.ts`)

## 🛠️ 향후 과제
- 테스트 타임아웃을 CI 환경에 맞춰 120s 이상으로 넉늘히 설정하십시오.
- `auth.setup.ts`의 도메인을 `localhost`와 `127.0.0.1` 모두에 대해 굽도록 유지하십시오.
