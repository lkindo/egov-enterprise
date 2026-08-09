package nuri.business.domain.user.repository;

import nuri.business.domain.user.entity.DeptManage;
import nuri.business.domain.user.entity.Role;
import nuri.business.domain.user.entity.User;
import nuri.business.service.user.dto.UserSearchDto;
import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import jakarta.persistence.EntityManager;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 사용자·부서 검색의 <b>조건 빌더와 열거 방어</b> 테스트.
 *
 * <p>[2026-08-09] 종전 이 클래스는 사용자정보 조회 저장소도 함께 검증했으나,
 * 그 저장소는 프로덕션 호출부가 0건인 죽은 코드였고 별건으로 삭제했다.
 * 해당 테스트도 함께 걷어냈다 — 지워진 코드를 지키는 테스트는 유지 비용만 남긴다.
 *
 * <p>[2026-08-09 신설] 기존 {@code UserRepositoryTest} 는 조건별로
 * {@code assertThat(result.getContent()).isNotEmpty()} 만 확인했다.
 * 이 단언은 <b>필터를 통째로 없앤 뮤턴트도 통과시킨다</b> —
 * 조건이 사라지면 전체가 나오고, 전체에는 매칭 행도 들어 있으니 여전히 non-empty 다.
 * 그래서 검색조건 뮤턴트가 그대로 살아남았다.
 *
 * <p>여기서는 매칭 1건 + <b>비매칭 1건</b>을 넣고 <b>비매칭이 빠지는지</b>를 본다.
 * "찾아지는가" 가 아니라 "안 찾아져야 할 것이 안 찾아지는가" 를 물어야 필터를 검증하는 것이다.
 *
 * <p>{@code searchAssignableUsers} 는 별도로 다룬다. 이 메서드는 일반 사용자에게 열려 있고,
 * 소스 주석이 <b>계정 열거 방어</b>를 명시적으로 설계 의도로 적어 두었는데
 * (빈 키워드 전체반환 금지 · 로그인 ID 매칭 금지) <b>테스트가 하나도 없었다</b>.
 * 방어를 지워도 아무도 모르는 상태였다.
 */
@DisplayName("사용자·부서 검색조건 테스트")
class UserSearchConditionTest extends PersistenceTestSupport {

    private static final Pageable PAGE = PageRequest.of(0, 50);

    @Autowired private UserRepository userRepository;
    @Autowired private DeptManageRepository deptManageRepository;
    @Autowired private EntityManager em;

    @BeforeEach
    void setUp() {
        deptManageRepository.save(DeptManage.builder()
                .ognzId("ORG_MATCH").ognzNm("기획재정부").ognzExpln("설명").sortOrdr(1).build());
        deptManageRepository.save(DeptManage.builder()
                .ognzId("ORG_OTHER").ognzNm("행정안전부").ognzExpln("설명").sortOrdr(2).build());

        userRepository.save(User.builder()
                .esntlId("ESNTL_MATCH").userId("kim01").userNm("김일치").pswd("pw")
                .officeTelno("02-1111-1111").emlAddr("a@example.com")
                .ognzId("ORG_MATCH").role(Role.USER).build());
        userRepository.save(User.builder()
                .esntlId("ESNTL_OTHER").userId("park99").userNm("박기타").pswd("pw")
                .officeTelno("02-9999-9999").emlAddr("b@example.com")
                .ognzId("ORG_OTHER").role(Role.ADMIN).build());

        em.flush();
        em.clear();
    }

    // ── 관리자 사용자 검색 ─────────────────────────────────────────────────────

    @Nested
    @DisplayName("사용자 목록 검색조건")
    class UserSearch {

        @Test
        @DisplayName("조건별로 서로 다른 컬럼을 본다 — 비매칭이 실제로 빠진다")
        void eachConditionFiltersItsOwnColumn() {
            // 검색어를 해당 컬럼에만 존재하는 값으로 골라, 조건 분기 뒤바뀜까지 잡는다.
            assertThat(userIds("USER_ID", "kim01")).containsExactly("kim01");
            assertThat(userIds("0", "kim01")).containsExactly("kim01");
            assertThat(userIds("USER_NM", "김일치")).containsExactly("kim01");
            assertThat(userIds("1", "김일치")).containsExactly("kim01");
            assertThat(userIds("OFFM_TELNO", "1111")).containsExactly("kim01");
            assertThat(userIds("OFFICE_TELNO", "1111")).containsExactly("kim01");
        }

        @Test
        @DisplayName("조건이 다르면 같은 검색어로도 잡히지 않는다")
        void conditionSelectsTheColumnNotJustAnyColumn() {
            // "김일치" 는 userNm 에만 있다 — 조건 USER_ID 로는 0건이어야 한다.
            // 조건을 무시하고 아무 컬럼이나 보는 뮤턴트는 여기서 죽는다.
            assertThat(userIds("USER_ID", "김일치")).isEmpty();
            // "kim01" 은 userId 에만 있다 — 조건 USER_NM 으로는 0건이어야 한다.
            assertThat(userIds("USER_NM", "kim01")).isEmpty();
        }

        @Test
        @DisplayName("검색어가 비면 조건 없이 전체를 돌려준다 (관리자 전용 화면의 현행 거동)")
        void blankKeywordReturnsEverything() {
            assertThat(userIds("USER_ID", null)).containsExactlyInAnyOrder("kim01", "park99");
            assertThat(userIds("USER_ID", "  ")).containsExactlyInAnyOrder("kim01", "park99");
        }

        @Test
        @DisplayName("가입상태 조건은 권한(Role)으로 좁히고, 0·미지정·잘못된 값은 필터 없음이다")
        void statusConditionFiltersByRole() {
            assertThat(userIdsWithStatus("ADMIN")).containsExactly("park99");
            assertThat(userIdsWithStatus("USER")).containsExactly("kim01");
            // "0"(전체)·빈값·열거에 없는 값은 조건을 걸지 않는다 — 예외로 죽지 않아야 한다.
            assertThat(userIdsWithStatus("0")).hasSize(2);
            assertThat(userIdsWithStatus(null)).hasSize(2);
            assertThat(userIdsWithStatus("NOT_A_ROLE")).hasSize(2);
        }

        private List<String> userIds(String condition, String keyword) {
            return userRepository.searchUsers(null, condition, keyword, PAGE)
                    .getContent().stream().map(User::getUserId).toList();
        }

        private List<String> userIdsWithStatus(String status) {
            return userRepository.searchUsers(status, "USER_ID", null, PAGE)
                    .getContent().stream().map(User::getUserId).toList();
        }
    }

    // ── 담당자 지정 검색 (열거 방어) ────────────────────────────────────────────

    @Nested
    @DisplayName("담당자 지정 검색의 열거 방어")
    class AssignableUserSearch {

        @Test
        @DisplayName("성명으로 검색하면 esntlId·성명·부서명을 돌려준다")
        void searchesByNameAndReturnsDeptName() {
            List<UserSearchDto> found = userRepository.searchAssignableUsers("김일치", 10);

            // `replaced return value with Collections.emptyList` 뮤턴트가 여기서 죽는다.
            assertThat(found).hasSize(1);
            assertThat(found.get(0).esntlId()).isEqualTo("ESNTL_MATCH");
            assertThat(found.get(0).userNm()).isEqualTo("김일치");
            // 동명이인 오지정을 막기 위한 부서명 — 조인이 빠지면 null 이 된다.
            assertThat(found.get(0).deptNm()).isEqualTo("기획재정부");
        }

        @Test
        @DisplayName("로그인 ID 로는 검색되지 않는다 — 계정 열거 창구 차단")
        void doesNotMatchLoginId() {
            // 소스 주석이 설계 의도로 명시한 방어다:
            //   "userId(로그인 ID)로도 매칭하면 'kim01' 로 조회해 로그인 ID ↔ 실명을 이어 붙이는
            //    계정 열거 창구가 된다."
            // 검색 축에 userId 를 추가하는 회귀는 이 단언에서 잡힌다.
            assertThat(userRepository.searchAssignableUsers("kim01", 10)).isEmpty();
        }

        @Test
        @DisplayName("빈 키워드는 전체를 돌려주지 않고 빈 목록으로 끝난다")
        void blankKeywordReturnsEmptyNotEverything() {
            // 조건 분기를 뒤집은 뮤턴트는 where 절 없이 **전 사용자 명단**을 반환한다 —
            // 이 메서드는 일반 사용자에게 열려 있으므로 그것이 곧 명부 유출이다.
            assertThat(userRepository.searchAssignableUsers(null, 10)).isEmpty();
            assertThat(userRepository.searchAssignableUsers("", 10)).isEmpty();
            assertThat(userRepository.searchAssignableUsers("   ", 10)).isEmpty();
            // 공백만 있는 키워드는 trim 후 빈 문자열이 된다.
            assertThat(userRepository.searchAssignableUsers("\t\n ", 10)).isEmpty();
        }

        @Test
        @DisplayName("limit 이 0 이하면 조회하지 않는다")
        void nonPositiveLimitReturnsEmpty() {
            // `limit <= 0` 의 경계를 옮긴 뮤턴트가 여기서 죽는다.
            assertThat(userRepository.searchAssignableUsers("김일치", 0)).isEmpty();
            assertThat(userRepository.searchAssignableUsers("김일치", -1)).isEmpty();
            // 경계 바로 위는 조회된다.
            assertThat(userRepository.searchAssignableUsers("김일치", 1)).hasSize(1);
        }

        @Test
        @DisplayName("키워드 앞뒤 공백은 잘라내고 검색한다")
        void trimsKeywordBeforeSearching() {
            // trim 을 지운 뮤턴트는 " 김일치 " 로 LIKE 검색해 0건이 된다.
            assertThat(userRepository.searchAssignableUsers("  김일치  ", 10)).hasSize(1);
        }

        @Test
        @DisplayName("소속이 없는 사용자도 검색에서 사라지지 않는다 (leftJoin)")
        void userWithoutDeptIsStillFound() {
            userRepository.save(User.builder()
                    .esntlId("ESNTL_NODEPT").userId("solo01").userNm("무소속")
                    .pswd("pw").emlAddr("c@example.com").role(Role.USER).build());
            em.flush();
            em.clear();

            List<UserSearchDto> found = userRepository.searchAssignableUsers("무소속", 10);

            // innerJoin 으로 바뀌면 소속 없는 사용자가 통째로 사라진다.
            assertThat(found).hasSize(1);
            assertThat(found.get(0).deptNm()).isNull();
        }
    }

    // ── 사용자 정보 조회 / 부서 검색 ────────────────────────────────────────────

    @Nested
    @DisplayName("사용자정보·부서 검색조건")
    class OtherSearches {

        @Test
        @DisplayName("부서 검색은 부서명으로 좁히고, 대소문자를 가리지 않는다")
        void deptSearchFiltersByName() {
            assertThat(deptIds("기획")).containsExactly("ORG_MATCH");
            assertThat(deptIds("행정")).containsExactly("ORG_OTHER");
            // 키워드가 없으면 전체 — `keywordContains` 의 삼항 조건을 뒤집은 뮤턴트가 여기서 죽는다.
            assertThat(deptIds(null)).hasSize(2);
            assertThat(deptIds("  ")).hasSize(2);
        }

        @Test
        @DisplayName("부서 검색의 총건수는 목록과 같은 조건으로 센다")
        void deptTotalCountMatchesContent() {
            var page = deptManageRepository.searchDeptManages("기획", PAGE);
            // 카운트 쿼리에서만 조건이 빠지면 목록 1건인데 총건수 2건이 되어 페이징이 깨진다.
            assertThat(page.getTotalElements()).isEqualTo(1);
            assertThat(page.getContent()).hasSize(1);
        }

        private List<String> deptIds(String keyword) {
            return deptManageRepository.searchDeptManages(keyword, PAGE)
                    .getContent().stream().map(DeptManage::getOgnzId).sorted().toList();
        }
    }
}
