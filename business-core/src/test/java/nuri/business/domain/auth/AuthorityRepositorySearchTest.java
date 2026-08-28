package nuri.business.domain.auth;

import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 권한 검색·정렬 계약.
 *
 * <p>── 왜 이 테스트가 저장소 계층에 있어야 하는가 ────────────────────────────────
 * 서비스 단위 테스트는 저장소를 mock 하므로 <b>이 결함을 원리적으로 잡을 수 없다.</b>
 * 실제로 그랬다 — 서비스가 {@code findAll} 대신 {@code searchAuthorities} 를 부르도록
 * 배선하고 검색어 전달을 검증해도, 저장소 구현이 그 검색어를 버리면 테스트는 전부 green 인데
 * 화면 검색은 여전히 죽어 있다. 조건은 여기서만 실행되므로 검사도 여기 있어야 한다(H5).
 *
 * <p>── 무엇이 틀려 있었나 ──────────────────────────────────────────────────────
 * {@code conditionEq} 가 {@code searchCondition == "1"} 일 때만 술어를 만들고 그 밖에는
 * {@code null} 을 돌려줬다. QueryDSL 의 {@code where(null)} 은 <b>조건 없음</b>이므로 검색어가
 * 통째로 무시됐다. 그런데 권한 목록 화면은 {@code searchCondition} 을 보내지 않는다
 * (SecurityHubClient 의 권한 질의는 {@code pageIndex}·{@code searchKeyword} 만 싣는다).
 * 즉 화면에서 검색은 항상 전체 목록을 돌려줬고, 실패가 아니라 "결과가 원래 그렇다"로 보였다.
 *
 * <p>정렬 축도 함께 고정한다. 종전 구현은 {@code authrtCrtYmd desc} 를 하드코딩해 호출자가 실은
 * Sort 를 넘겨도 무시했다 — 이 메서드를 목록 경로에 배선하는 순간 같은 엔드포인트를 쓰는 다른
 * 소비자들의 표시 순서가 조용히 뒤집힌다.
 */
@DisplayName("AuthorityRepository 검색·정렬 통합 테스트")
class AuthorityRepositorySearchTest extends PersistenceTestSupport {

    @Autowired
    private AuthorityRepository authorityRepository;

    private static final PageRequest FIRST_PAGE =
            PageRequest.of(0, 10, Sort.by("authrtCd").ascending());

    @BeforeEach
    void setUp() {
        authorityRepository.deleteAll();
        authorityRepository.save(Authority.builder()
                .authrtCd("ROLE_ADMIN").authrtNm("관리자 권한").authrtCrtYmd("20260101").build());
        authorityRepository.save(Authority.builder()
                .authrtCd("ROLE_USER").authrtNm("일반 사용자").authrtCrtYmd("20260301").build());
        authorityRepository.save(Authority.builder()
                .authrtCd("ROLE_GUEST").authrtNm("손님").authrtCrtYmd("20260201").build());
    }

    @Test
    @DisplayName("searchCondition 없이도 검색어가 필터로 걸린다 — 화면이 실제로 보내는 형태다")
    void keywordFiltersWithoutSearchCondition() {
        Page<Authority> result = authorityRepository.searchAuthorities(null, "관리자", FIRST_PAGE);

        assertThat(result.getContent()).extracting(Authority::getAuthrtCd)
                .containsExactly("ROLE_ADMIN");
        // 총건수도 같은 조건에서 나와야 페이저가 거짓말하지 않는다.
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("권한 코드로도 찾힌다 — 목록이 코드 열을 보여 주므로 사용자가 그것을 친다")
    void keywordMatchesAuthorityCode() {
        Page<Authority> result = authorityRepository.searchAuthorities(null, "GUEST", FIRST_PAGE);

        assertThat(result.getContent()).extracting(Authority::getAuthrtCd)
                .containsExactly("ROLE_GUEST");
    }

    @Test
    @DisplayName("searchCondition=1 은 명칭 한정 검색을 유지한다 — 기존 호출 계약 보존")
    void conditionOneKeepsNameOnlyScope() {
        // 코드에만 있는 문자열은 명칭 한정 검색에서 걸리지 않아야 한다.
        assertThat(authorityRepository.searchAuthorities("1", "GUEST", FIRST_PAGE).getContent())
                .isEmpty();
        assertThat(authorityRepository.searchAuthorities("1", "손님", FIRST_PAGE).getContent())
                .extracting(Authority::getAuthrtCd).containsExactly("ROLE_GUEST");
    }

    @Test
    @DisplayName("검색어가 없으면 전체를 돌려준다")
    void blankKeywordReturnsAll() {
        assertThat(authorityRepository.searchAuthorities(null, "  ", FIRST_PAGE).getTotalElements())
                .isEqualTo(3);
    }

    @Test
    @DisplayName("호출자가 준 정렬을 따른다 — 하드코딩된 생성일 역순으로 되돌아가면 red")
    void honoursCallerSort() {
        assertThat(authorityRepository.searchAuthorities(null, null, FIRST_PAGE).getContent())
                .extracting(Authority::getAuthrtCd)
                .containsExactly("ROLE_ADMIN", "ROLE_GUEST", "ROLE_USER");

        Page<Authority> byNewest = authorityRepository.searchAuthorities(
                null, null, PageRequest.of(0, 10, Sort.by("authrtCrtYmd").descending()));
        assertThat(byNewest.getContent()).extracting(Authority::getAuthrtCd)
                .containsExactly("ROLE_USER", "ROLE_GUEST", "ROLE_ADMIN");
    }

    @Test
    @DisplayName("정렬이 비어 있으면 권한코드 오름차순이 기본이다 — 순서가 실행마다 흔들리지 않는다")
    void unsortedFallsBackToStableOrder() {
        Page<Authority> result = authorityRepository.searchAuthorities(
                null, null, PageRequest.of(0, 10, Sort.unsorted()));

        assertThat(result.getContent()).extracting(Authority::getAuthrtCd)
                .containsExactly("ROLE_ADMIN", "ROLE_GUEST", "ROLE_USER");
    }

    @Test
    @DisplayName("알 수 없는 정렬 키는 기본 순서로 수렴한다 — 임의 컬럼을 정렬로 노출하지 않는다")
    void unknownSortKeyFallsBack() {
        Page<Authority> result = authorityRepository.searchAuthorities(
                null, null, PageRequest.of(0, 10, Sort.by("authrtExpln").descending()));

        assertThat(result.getContent()).extracting(Authority::getAuthrtCd)
                .containsExactly("ROLE_ADMIN", "ROLE_GUEST", "ROLE_USER");
    }
}
