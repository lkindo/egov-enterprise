# Module Workspace (사용자 협업 도구)

## 1. 개요
본 모듈은 사용자의 개인 업무 생산성 향상과 팀 내 커뮤니케이션을 지원하는 핵심 비즈니스 모듈입니다.

## 2. 주요 책임 (Responsibilities)
- **개인 생산성**: 일정(Schedule) 관리, 메모(Memo) 및 할 일.
- **커뮤니케이션**: 쪽지(Note) 전송/수신, 주소록(AddressBook) 관리.
- **콘텐츠 소비**: 게시판(Board) 목록 조회/상세/작성, 커뮤니티(Community) 참여.
- **보고 체계**: 주간/월간 업무 보고 관리.

## 3. 리팩토링 결과 (Refactoring Status)
- 게시판/커뮤니티의 **기능 마스터 설정(Admin)** 로직은 `module-system-admin`으로 이관되었습니다.
- 배너/팝업(Banner/Popup) 관리 로직은 제거되었으며, 사용자는 콘텐츠 소모자(Consumer)로서의 기능만 수행합니다.

## 4. 데이터 계층 (Data Layer)
- 게시글 엔티티(`BoardArticle`)는 이 모듈에서 소유하며, 관리자가 마스터 속성을 변경하면 즉시 영향을 받도록 설계되었습니다.
