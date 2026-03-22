# E2E Test Failures Summary (2026-03-23)

> 3시간 47분이 넘는 시간 동안 `--workers=1` 옵션으로 72개의 테스트를 구동한 후 확인된 실패 내역입니다. `networkidle` 로딩 무한 대기로 인한 수많은 테스트들의 타임아웃은 제거 및 해결되었으나, 아래의 테스트들에서 세부적인 렌더링 딜레이 및 특정 컴포넌트 평가 타임아웃이 발생했습니다. 

## 🚨 실패한 테스트 파일 및 항목 (Failed Tests)

1. **`e2e/banner-admin.spec.ts`**
   - 실패 항목: `Switch between Banner and Popup tabs`
   - 문제 추정: 한 화면 안에서 탭 클릭 시 뜨는 팝업 리스트 컴포넌트 렌더링 시간 지연 (혹은 Locator 이름 불일치)

2. **`e2e/dashboard_advanced.spec.ts`**
   - 실패 항목: `should verify statistical summary cards`
   - 문제 추정: 차트(Chart) 컴포넌트 데이터 페치에 따른 비동기 대기 시간 부족(타임아웃). DOM 로딩과 실제 Canvas 렌더링의 시점 차이

3. **`e2e/dashboard.spec.ts`**
   - 실패 항목: `should verify quick links`
   - 문제 추정: 메인 대시보드에서 퀵 링크 UI 트리 요소가 그려지기 전 `expect` 평가가 진행됨

4. **`e2e/menu-admin-hierarchical.spec.ts`**
   - 실패 항목: `should manage menu hierarchy`
   - 문제 추정: 메뉴 트리(Tree) 계층별 노드가 펼쳐지는 애니메이션 전환 시간에 따른 Playwright 동작 타임아웃 발생

5. **`e2e/health.spec.ts`**
   - 실패 항목: `should be able to access /`
   - 문제 추정: 정규 루트 경로(`/`) 진입 시 서버 로딩 혹은 리다이렉션 단순 딜레이 

6. **`e2e/rbac_rigorous.spec.ts`**
   - 실패 항목: `Denied access to /admin/system/common-code for regular user` 외 일반 유저 접근 통제 테스트들 모음
   - 문제 추정: 일반 사용자 권한 시 미들웨어나 서버에서 `Unauthorized(권한이 없습니다)`로 리다이렉트하는 경로/형태가 기존 스펙과 다름 혹은 레이아웃의 DOM Locator(`div.message`, `toast` 등) 확인 불일치

---

## 💡 다음 작업 계획 (Next Steps)

프로젝트 코드 베이스가 방대하므로 E2E 전체를 돌려 확인하는 대신, 위 6개의 개별 테스트 파일들만 수정하며 바로바로 점검하는 전략을 사용합니다.

**실행 명령어 (족집게 재검증):**
```bash
npx playwright test e2e/banner-admin.spec.ts e2e/dashboard_advanced.spec.ts e2e/dashboard.spec.ts e2e/menu-admin-hierarchical.spec.ts e2e/health.spec.ts e2e/rbac_rigorous.spec.ts
```

**수정 방향 (Fixing Strategy):**
- **대기/DOM 관찰**: `.waitForTimeout()` 보다는 `locator.waitFor({ state: 'visible', timeout: 30000 })` 등의 명시적인 DOM 인지를 활용
- **RBAC 점검**: 실제 일반 유저 환경에서 관리자 페이지 시도 시 반환되는 Toast 메시지 혹은 Unauthorized Boundary UI 화면 스냅샷 대조 후 로케이터 업데이트
