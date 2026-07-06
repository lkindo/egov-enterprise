# Task: 주소록 도메인(addressbook) 연관 관계 개선 및 무결성 수립

본 태스크는 `egov-enterprise` 프로젝트 내 주소록 도메인의 `AddressBook`과 `AddressBookUser` 간의 단순 String ID 단방향 참조를 JPA `@ManyToOne` 및 `@OneToMany` 양방향 연관 관계로 개선하여 영속성 전이(Cascade) 삭제 및 조회 성능을 공고히 하는 L1 등급 리팩토링 태스크입니다.

---

## 체크리스트 (Ralph Loop Checklist)

- [x] **1단계: 기존 주소록 도메인 소스 분석 및 영향 범위 파악**
  - [x] `AddressBook.java`, `AddressBookUser.java` 물리 코드 및 매핑 상세 분석
  - [x] `AddressBookService`, `AddressBookRepository`, 관련 테스트 내 참조 관계 스캔
- [x] **2단계: JPA 양방향 연관 관계 매핑 리팩토링**
  - [x] `AddressBookUser.java`에 `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "adbk_id")` 추가 및 String `adbkId` 제거/동기화
  - [x] `AddressBook.java`에 `@OneToMany(mappedBy = "addressBook", cascade = CascadeType.ALL, orphanRemoval = true)` 목록 추가
  - [x] Repository, Service 내 관련 ID 맵핑 코드 및 빌더 체인 정교하게 조정
- [x] **3단계: 컴파일 검증 및 테스트 성공 증명**
  - [x] `./gradlew compileJava`를 통한 빌드 무결성 확인
  - [x] `./gradlew test`를 통한 단위/통합 테스트 그린 패스 입증
