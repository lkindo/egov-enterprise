# 기여 가이드 (Contributing to eGov Enterprise)

프로젝트에 기여해 주셔서 감사합니다! 이 문서는 원활한 협업을 위한 가이드라인을 제공합니다.

---

## 📋 목차

1. [개발 환경 설정](#개발-환경-설정)
2. [코드 스타일](#코드-스타일)
3. [브랜치 전략](#브랜치-전략)
4. [커밋 메시지 컨벤션](#커밋-메시지-컨벤션)
5. [Pull Request 프로세스](#pull-request-프로세스)
6. [이슈 템플릿](#이슈-템플릿)
7. [코드 리뷰 체크리스트](#코드-리뷰-체크리스트)

---

## 🛠 개발 환경 설정

### 필수 요구사항
- **Java**: 21 (LTS)
- **Node.js**: 20+
- **Package Manager**: pnpm (`npm install -g pnpm`)
- **Database**: PostgreSQL 14+

### 로컬 설정
```bash
# 1. 저장소 클론
git clone https://github.com/lkindo/egov-enterprise.git
cd egov-enterprise

# 2. 백엔드 설정
cp api-server/src/main/resources/application-dev.yml \
   api-server/src/main/resources/application-local.yml

# 3. 프론트엔드 설정
cd frontend
cp .env.example .env.local
pnpm install

# 4. 빌드 검증
cd ..
./gradlew clean build
cd frontend && pnpm build
```

---

## 📝 코드 스타일

### Java
- **스타일**: [Google Java Style](https://google.github.io/styleguide/javaguide.html)
- **포맷터**: `google-java-format`
- **검증**: `./gradlew checkstyleMain`

```java
// ✅ 좋은 예
public class UserService {
    private final UserRepository userRepository;
    
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}

// ❌ 나쁜 예
public class UserService{
  private UserRepository userRepository;
  public UserService(UserRepository userRepository){
    this.userRepository=userRepository;
  }
}
```

### TypeScript/React
- **린터**: ESLint
- **포맷터**: Prettier
- **검증**: `pnpm lint && pnpm type-check`

```typescript
// ✅ 좋은 예
interface User {
  id: string;
  name: string;
  email: string;
}

export const UserCard: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className="p-4 border rounded">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
};

// ❌ 나쁜 예
type User={id:string,name:string,email:string}
export const UserCard=({user}:any)=><div>{user.name}</div>
```

---

## 🌿 브랜치 전략

### 브랜치 규칙
```
main
  ├── develop (개발 브랜치)
  │     ├── feature/* (기능 개발)
  │     ├── fix/* (버그 수정)
  │     ├── refactor/* (리팩토링)
  │     └── docs/* (문서 수정)
```

### 브랜치 명명 규칙
| 접두사 | 용도 | 예시 |
|:---:|------|------|
| `feature/` | 새로운 기능 | `feature/user-authentication` |
| `fix/` | 버그 수정 | `fix/login-error-handling` |
| `refactor/` | 코드 리팩토링 | `refactor/api-client-structure` |
| `docs/` | 문서 수정 | `docs/update-readme-setup` |
| `chore/` | 설정/빌드 | `chore/update-dependencies` |

---

## ✍️ 커밋 메시지 컨벤션

### 형식
```
<타입>: <간단한 설명>

[본문: 선택사항, 자세한 변경 내용]

[관련 이슈: #123]
```

### 타입 목록
| 타입 | 설명 |
|:---:|------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 코드 리팩토링 (기능 변경 없음) |
| `docs` | 문서 수정 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드/설정 관련 변경 |
| `security` | 보안 관련 변경 |

### 예시
```bash
# 좋은 예
feat: add user search functionality
fix: resolve login redirect loop
refactor: extract duplicate validation logic
docs: update API endpoint documentation

# 나쁜 예
update code
fix bug
small changes
```

---

## 🔄 Pull Request 프로세스

### 1. PR 생성 전 확인
- [ ] 코드가 빌드되는가?
- [ ] 테스트가 통과하는가?
- [ ] 타입 체크가 통과하는가?
- [ ] 코드 포맷이 적용되었는가?

### 2. PR 제목
- 명확하고 간결하게 작성
- 예: `feat: 실시간 대시보드 차트 추가`

### 3. PR 설명 템플릿
```markdown
## 📋 변경 내용
- [ ] 기능 1
- [ ] 기능 2

## 🎯 관련 이슈
- closes #123

## 📸 스크린샷 (선택)
<!-- UI 변경사항이 있을 경우 -->

## ✅ 체크리스트
- [ ] 빌드 성공
- [ ] 테스트 통과
- [ ] 타입 체크 통과
- [ ] 코드 포맷 적용
```

### 4. 코드 리뷰
- 최소 1 명의 승인 필요
- 모든 코멘트 해결 후 병합

---

## 🐛 이슈 템플릿

### 버그 리포트
```markdown
## 🐞 버그 설명
- 어떤 문제가 발생했나요?

## 🔄 재현 단계
1. '...'로 이동
2. '...' 클릭
3. 에러 발생

## ✅ 예상 동작
- 정상적으로 작동하면 어떻게 되어야 하나요?

## 📸 스크린샷
- 가능하면 스크린샷을 첨부하세요

## 🖥 환경
- OS: Windows/Mac/Linux
- 브라우저: Chrome 120
- 버전: v1.0.0
```

### 기능 제안
```markdown
## 🚀 제안하는 기능
- 어떤 기능을 추가하고 싶으신가요?

## 💡 사용 사례
- 이 기능이 어떻게 사용될까요?

## 📚 참고 자료
- 관련 문서나 레퍼런스가 있나요?
```

---

## 🔍 코드 리뷰 체크리스트

### 공통
- [ ] 코드가 명확하고 이해하기 쉬운가?
- [ ] 중복된 코드가 없는가?
- [ ] 적절한 주석이 있는가?
- [ ] 에러 처리가 적절한가?

### 백엔드 (Java)
- [ ] null 체크가 적절한가?
- [ ] 트랜잭션 경계가 적절한가?
- [ ] 로깅이 적절한가?
- [ ] 보안 취약점이 없는가?

### 프론트엔드 (TypeScript/React)
- [ ] 타입이 올바르게 정의되었는가?
- [ ] 컴포넌트가 재사용 가능한가?
- [ ] 상태 관리가 적절한가?
- [ ] 접근성이 고려되었는가?

---

## 📞 문의

- **이슈 트래커**: [GitHub Issues](https://github.com/lkindo/egov-enterprise/issues)
- **토론**: [GitHub Discussions](https://github.com/lkindo/egov-enterprise/discussions)

---

기여해주셔서 감사합니다! 🎉
