# eGov Enterprise Modernization - Frontend

전자정부 표준프레임워크 5.0 기반 엔터프라이즈 모더니제이션 프로젝트의 **Next.js 16 (App Router)** 프런트엔드 애플리케이션입니다.

## 🛠 주요 기술 스택

- **Framework**: Next.js 16.4.x (App Router, 요청별 CSP nonce 로 전 페이지 동적 렌더 — PPR 은 쓰지 않는다, DEC-OPS-011)
- **Library**: React 19.3.x
- **Styling**: Tailwind CSS 4, 시맨틱 디자인 토큰
- **Data Fetching**: Axios(동일 출처 `/api/v1` 프록시), TanStack Query 5.x
- **State Management**: Zustand, React Context
- **Real-time**: STOMP over SockJS (동일 출처 `/ws` 프록시). sockjs-client 1.6.1 은 페이지 이탈 감지를 `unload` 대신 `pagehide` 로 바꾼 pnpm 패치(`patches/sockjs-client@1.6.1.patch`)로 쓴다 — 판을 올릴 때는 upstream 이 고쳤는지 보고 패치를 걷거나 다시 만든 뒤 `src/contexts/__tests__/sockjs-pagehide-patch.test.ts` 를 돌린다. 마지막 패치를 걷으면 그 시험의 등록 단언, `Dockerfile` 의 `COPY patches`, UI 기준선 빌드 입력(`scripts/ui-quality-baseline-build.mjs` 의 `patches`)도 함께 정리하고, 페이지 이탈 동작 단언은 남긴다.
- **Validation**: Zod + React Hook Form
- **Language**: 한국어 UI (`html lang="ko"`), API 오류 ko/en 협상은 백엔드가 담당

## 🚀 시작하기

### 1. 의존성 설치
```bash
pnpm install
```

### 2. 개발 서버 실행
```bash
pnpm dev
```

`dev`·`build`·`start` 는 `scripts/next-cli.mjs` 를 지난다. 셸에 백엔드용 서명 키링(`JWT_SIGNING_*`)이나 `JWT_SECRET` 이 있어도 Next 에는 넘기지 않는다 — Next 는 `JWT_VERIFY_KEYS_JSON` 공개키로만 검증한다(ADR-0060). 이 폴더의 `.env`·`.env.local`·`.env.<mode>[.local]` 에 그 이름이 있으면 시작하지 않으므로(1차 전환 때 넣은 `JWT_SECRET` 줄 등) 그 줄을 지운다. `dev` 는 `127.0.0.1:3001` 에 띄우며, 다른 기기에서 열려면 자체 키쌍을 준 뒤 `pnpm dev -H 0.0.0.0` 처럼 주소를 직접 지정한다.

### 3. 빌드 및 타입 체크
```bash
pnpm type-check
pnpm build
```

### 4. UI 기본 컴포넌트 추가(shadcn CLI)
`src/components/ui` 의 기본 컴포넌트는 shadcn CLI 로 가져온 소스를 저장소가 직접 소유한다. CLI 는 의존성으로 두지 않는다 — 상시 설치하면 쓰지 않는 하위 트리가 보안 override 를 늘린다(2026-10-07 제거). 컴포넌트를 추가할 때만 버전을 고정해 실행한다. 설정은 `components.json` 이다.
```bash
pnpm dlx shadcn@<고정버전> add <component>
```

## 📂 주요 구조

- `src/app`: App Router 기반 페이지 구성. 화면 공용 조합 부품은 `src/app/components/ui`(standard-*·picker·toast)
- `src/components`: 기본 부품(`ui` — 서비스·라우터·인증 문맥을 모른다)과 업무 컴포넌트
- `src/services`: API 통신 레이어, `src/queries`: TanStack Query 조회 옵션·키. 여러 파일이 함께 쓰는 쿼리 키는 `src/queries/<도메인>-keys.ts`(import 없는 계층형 팩토리)에 두고, 리터럴 키 이름공간은 한 파일만 쓴다 — 무효화 키가 조회 키와 맞는지와 함께 [쿼리 키 계약](src/__tests__/query-key-consistency.test.ts)이 본다
- `src/types`: TypeScript 인터페이스 정의(`generated-*` 는 생성물)
- `src/hooks`: 서비스·권한을 아는 공용 훅, `src/lib/hooks`: 화면·업무를 모르는 범용 훅(예외: 알림 훅)

폴더별 허용·금지 의존은 [디자인 시스템 §5](../docs/02-architecture/frontend-design-system.md#5-component-ownership)가 정본이며 ESLint 가 막는다.

---
