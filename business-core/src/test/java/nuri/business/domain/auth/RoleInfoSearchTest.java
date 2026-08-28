package nuri.business.domain.auth;

import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 롤 검색 범위 계약.
 *
 * <p>── 왜 저장소 계층인가 ──────────────────────────────────────────────────────
 * 서비스 단위 테스트는 저장소를 mock 하므로 검색어가 전달되는지까지만 확인된다. 그 검색어가
 * <b>어느 컬럼에 걸리는지</b>는 질의가 실제로 실행돼야 드러난다.
 *
 * <p>── 무엇이 틀려 있었나 ──────────────────────────────────────────────────────
 * {@code selectRoleList} 가 {@code roleNm} 만 매칭했다. 그런데 화면의 조회 조건 라벨은
 * '롤코드 · 롤명', placeholder 는 '롤코드 또는 롤명으로 검색' 이고 목록 첫 열도 롤코드다.
 * 사용자가 눈앞에 보이는 롤코드를 그대로 치면 항상 0건이 되어 <b>존재하는 롤이 '그런 롤이
 * 없다'로 보였다</b>. 기관코드 검색(GAP 없음, 같은 커밋 계열)과 같은 모양의 함정이다.
 */
@DisplayName("RoleInfoRepository 검색 범위 통합 테스트")
class RoleInfoSearchTest extends PersistenceTestSupport {

    @Autowired
    private RoleInfoRepository roleInfoRepository;

    private static final PageRequest FIRST_PAGE = PageRequest.of(0, 10);

    @BeforeEach
    void setUp() {
        roleInfoRepository.deleteAll();
        roleInfoRepository.save(RoleInfo.builder()
                .roleId("ROLE_ADMIN").roleNm("시스템 관리자").roleCrtYmd(java.time.LocalDate.of(2026, 1, 1)).build());
        roleInfoRepository.save(RoleInfo.builder()
                .roleId("ROLE_USER").roleNm("일반 사용자").roleCrtYmd(java.time.LocalDate.of(2026, 1, 2)).build());
        roleInfoRepository.save(RoleInfo.builder()
                .roleId("BOARD_MASTER").roleNm("게시판 마스터").roleCrtYmd(java.time.LocalDate.of(2026, 1, 3)).build());
    }

    @Test
    @DisplayName("롤명으로 찾는다 — 종전에도 되던 축이다")
    void findsByName() {
        Page<RoleInfoProjection> result = roleInfoRepository.selectRoleList("관리자", FIRST_PAGE);

        assertThat(result.getContent()).extracting(RoleInfoProjection::getRoleId)
                .containsExactly("ROLE_ADMIN");
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("롤코드로도 찾는다 — 목록 첫 열이 롤코드라 사용자가 그것을 친다")
    void findsByRoleId() {
        Page<RoleInfoProjection> result = roleInfoRepository.selectRoleList("BOARD_MASTER", FIRST_PAGE);

        assertThat(result.getContent()).extracting(RoleInfoProjection::getRoleNm)
                .containsExactly("게시판 마스터");
    }

    @Test
    @DisplayName("롤코드 일부만 쳐도 찾힌다")
    void findsByRoleIdFragment() {
        Page<RoleInfoProjection> result = roleInfoRepository.selectRoleList("BOARD", FIRST_PAGE);

        assertThat(result.getContent()).extracting(RoleInfoProjection::getRoleId)
                .containsExactly("BOARD_MASTER");
    }

    @Test
    @DisplayName("검색어가 비면 전체를 돌려준다")
    void blankKeywordReturnsAll() {
        assertThat(roleInfoRepository.selectRoleList("", FIRST_PAGE).getTotalElements()).isEqualTo(3);
        assertThat(roleInfoRepository.selectRoleList(null, FIRST_PAGE).getTotalElements()).isEqualTo(3);
    }

    @Test
    @DisplayName("총건수도 같은 조건에서 나온다 — 페이저가 거짓말하지 않는다")
    void totalMatchesTheSameCondition() {
        Page<RoleInfoProjection> result = roleInfoRepository.selectRoleList("ROLE_", FIRST_PAGE);

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getTotalElements()).isEqualTo(2);
    }
}
