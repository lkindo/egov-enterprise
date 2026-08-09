package nuri.business.domain.code;

import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import jakarta.persistence.EntityManager;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 공통코드 3계층(분류 → 그룹 → 상세)의 <b>검색조건 빌더</b> 테스트.
 *
 * <p>[2026-08-09 신설] PIT 이 이 세 {@code RepositoryImpl} 의 {@code conditionEq} 에서
 * 13개를 살려 보냈다. 이 메서드들은 QueryDSL {@code where} 절에 들어갈 조건을 만드는데,
 * <b>{@code null} 을 돌려주면 조건이 통째로 빠진다</b> — QueryDSL 의 {@code where(null)} 은
 * 오류가 아니라 "조건 없음" 이다.
 *
 * <p>그래서 이 자리에서 살아남은 뮤턴트는 전부 같은 결말을 가진다:
 * <b>검색어를 넣었는데 필터가 걸리지 않고 전체가 조회된다.</b>
 * 예외도 나지 않고 화면도 정상으로 보이므로, 목록이 많아지기 전까지 아무도 눈치채지 못한다.
 *
 * <p>기존 테스트가 이걸 못 잡은 이유는 단순하다 — 이 세 저장소에는
 * <b>테스트가 하나도 없었다</b>. 서비스 계층 테스트는 저장소를 목(mock)으로 두고
 * {@code any()} 매처로 넘겨서, 조건이 무엇이든 통과했다.
 *
 * <p>검증 방식: 매칭 1건 + 비매칭 1건을 넣고 <b>비매칭이 제외되는지</b>를 본다.
 * 매칭만 확인하면 "필터가 아예 없는" 뮤턴트도 그대로 통과한다(전체 조회에 매칭도 포함되므로).
 */
@DisplayName("공통코드 검색조건 빌더 테스트")
class CodeSearchConditionTest extends PersistenceTestSupport {

    private static final Pageable PAGE = PageRequest.of(0, 50);

    @Autowired private CommonCodeRepository commonCodeRepository;
    @Autowired private CommonCodeGroupRepository commonCodeGroupRepository;
    @Autowired private CommonCodeCategoryRepository commonCodeCategoryRepository;
    @Autowired private EntityManager em;

    @BeforeEach
    void setUp() {
        // 분류 2종 — 하나는 사용중지(useYn='N') 로 두어 조인 필터도 함께 검증한다.
        commonCodeCategoryRepository.save(CommonCodeCategory.builder()
                .clsfCd("CLS_MATCH").clsfCdNm("일치분류").clsfCdExpln("설명").useYn("Y").build());
        commonCodeCategoryRepository.save(CommonCodeCategory.builder()
                .clsfCd("CLS_OTHER").clsfCdNm("기타분류").clsfCdExpln("설명").useYn("Y").build());
        commonCodeCategoryRepository.save(CommonCodeCategory.builder()
                .clsfCd("CLS_OFF").clsfCdNm("중지분류").clsfCdExpln("설명").useYn("N").build());

        // 그룹 3종 — CLS_OFF 소속 그룹은 조인 필터에서 빠져야 한다.
        commonCodeGroupRepository.save(CommonCodeGroup.builder()
                .cdId("GRP_MATCH").cdIdNm("일치그룹").clsfCd("CLS_MATCH").useYn("Y").build());
        commonCodeGroupRepository.save(CommonCodeGroup.builder()
                .cdId("GRP_OTHER").cdIdNm("기타그룹").clsfCd("CLS_OTHER").useYn("Y").build());
        commonCodeGroupRepository.save(CommonCodeGroup.builder()
                .cdId("GRP_HIDDEN").cdIdNm("숨은그룹").clsfCd("CLS_OFF").useYn("Y").build());

        // 상세코드 2종 — 그룹 useYn='N' 인 것도 하나 만들어 조인 필터를 검증한다.
        commonCodeGroupRepository.save(CommonCodeGroup.builder()
                .cdId("GRP_DISABLED").cdIdNm("비활성그룹").clsfCd("CLS_MATCH").useYn("N").build());

        commonCodeRepository.save(CommonCode.builder()
                .cdId("GRP_MATCH").dtlCd("DTL_MATCH").dtlCdNm("일치상세").useYn("Y").build());
        commonCodeRepository.save(CommonCode.builder()
                .cdId("GRP_OTHER").dtlCd("DTL_OTHER").dtlCdNm("기타상세").useYn("Y").build());
        commonCodeRepository.save(CommonCode.builder()
                .cdId("GRP_DISABLED").dtlCd("DTL_HIDDEN").dtlCdNm("숨은상세").useYn("Y").build());

        em.flush();
        em.clear();
    }

    // ── 분류(Category) ────────────────────────────────────────────────────────

    @Nested
    @DisplayName("코드분류 검색")
    class CategorySearch {

        @Test
        @DisplayName("조건 1 은 분류코드로 좁힌다 (비매칭이 실제로 빠진다)")
        void condition1FiltersByClassificationCode() {
            List<String> codes = categoryCodes("1", "MATCH");

            // 조건이 null 로 바뀌면(뮤턴트) 전체가 나와 CLS_OTHER 가 포함된다 → 죽는다.
            assertThat(codes).containsExactly("CLS_MATCH");
        }

        @Test
        @DisplayName("조건 2 는 분류명으로 좁힌다 — 분류코드로는 안 잡히는 검색어를 쓴다")
        void condition2FiltersByClassificationName() {
            // "일치분류" 는 clsfCdNm 에만 있고 clsfCd 에는 없다.
            // 조건 분기를 1↔2 로 뒤바꾼 뮤턴트도 여기서 죽는다.
            assertThat(categoryCodes("2", "일치분류")).containsExactly("CLS_MATCH");
        }

        @Test
        @DisplayName("검색어가 비어 있으면 조건 없이 전체를 돌려준다")
        void blankKeywordReturnsEverything() {
            assertThat(categoryCodes("1", null)).hasSize(3);
            assertThat(categoryCodes("1", "")).hasSize(3);
            assertThat(categoryCodes("1", "   ")).hasSize(3);
        }

        @Test
        @DisplayName("알 수 없는 조건값은 필터 없이 전체를 돌려준다 (현행 거동 고정)")
        void unknownConditionAppliesNoFilter() {
            // ⚠ 검색어를 줬는데 조건값이 이상하면 **전체가 나온다**. 빈 결과가 아니다.
            //   현행 거동을 고정해 두어, 향후 바꿀 때 의도적 변경임이 드러나게 한다.
            assertThat(categoryCodes("99", "MATCH")).hasSize(3);
        }

        private List<String> categoryCodes(String condition, String keyword) {
            return commonCodeCategoryRepository
                    .searchCommonCodeCategories(condition, keyword, PAGE)
                    .getContent().stream().map(CommonCodeCategory::getClsfCd).sorted().toList();
        }
    }

    // ── 그룹(Group) ───────────────────────────────────────────────────────────

    @Nested
    @DisplayName("코드그룹 검색")
    class GroupSearch {

        @Test
        @DisplayName("조건 1 은 그룹코드로 좁힌다")
        void condition1FiltersByGroupCode() {
            assertThat(groupIds("1", "MATCH")).containsExactly("GRP_MATCH");
        }

        @Test
        @DisplayName("조건 2 는 그룹명으로 좁힌다 — 그룹코드로는 안 잡히는 검색어를 쓴다")
        void condition2FiltersByGroupName() {
            assertThat(groupIds("2", "일치그룹")).containsExactly("GRP_MATCH");
        }

        @Test
        @DisplayName("사용중지 분류에 속한 그룹은 검색되지 않는다")
        void groupsUnderDisabledCategoryAreExcluded() {
            // GRP_HIDDEN 은 CLS_OFF(useYn='N') 소속이다.
            // 조인 조건 `commonCodeCategory.useYn.eq("Y")` 를 지운 뮤턴트가 여기서 죽는다.
            assertThat(groupIds("1", null)).doesNotContain("GRP_HIDDEN");
        }

        @Test
        @DisplayName("검색어가 비어 있으면 조건 없이 (분류 필터만 적용해) 돌려준다")
        void blankKeywordAppliesOnlyJoinFilter() {
            assertThat(groupIds("1", "  ")).containsExactly("GRP_DISABLED", "GRP_MATCH", "GRP_OTHER");
        }

        private List<String> groupIds(String condition, String keyword) {
            return commonCodeGroupRepository
                    .searchCommonCodeGroups(condition, keyword, PAGE)
                    .getContent().stream().map(CommonCodeGroupProjection::getCdId).sorted().toList();
        }
    }

    // ── 상세(Detail) ──────────────────────────────────────────────────────────

    @Nested
    @DisplayName("상세코드 검색")
    class DetailSearch {

        @Test
        @DisplayName("조건 1 은 그룹코드로, 2 는 상세코드로, 3 은 상세코드명으로 좁힌다")
        void eachConditionFiltersItsOwnColumn() {
            // 세 검색어를 서로 다른 컬럼에만 존재하는 값으로 골라, 분기 뒤바뀜까지 잡는다.
            assertThat(detailCodes("1", "GRP_MATCH")).containsExactly("DTL_MATCH");
            assertThat(detailCodes("2", "DTL_MATCH")).containsExactly("DTL_MATCH");
            assertThat(detailCodes("3", "일치상세")).containsExactly("DTL_MATCH");
        }

        @Test
        @DisplayName("조건 3 은 코드값이 아니라 코드명을 본다")
        void condition3LooksAtNameNotCode() {
            // "DTL_MATCH" 는 dtlCd 에만 있고 dtlCdNm 에는 없다 →
            // 조건 3 이 dtlCd 를 보도록 바뀐 뮤턴트는 여기서 죽는다.
            assertThat(detailCodes("3", "DTL_MATCH")).isEmpty();
        }

        @Test
        @DisplayName("사용중지 그룹의 상세코드는 검색되지 않는다")
        void detailsUnderDisabledGroupAreExcluded() {
            // 조인 조건 `commonCodeGroup.useYn.eq("Y")` 를 지운 뮤턴트가 여기서 죽는다.
            assertThat(detailCodes("1", null)).doesNotContain("DTL_HIDDEN");
        }

        @Test
        @DisplayName("검색어가 비어 있으면 조건 없이 (그룹 필터만 적용해) 돌려준다")
        void blankKeywordAppliesOnlyJoinFilter() {
            assertThat(detailCodes("1", "")).containsExactly("DTL_MATCH", "DTL_OTHER");
        }

        @Test
        @DisplayName("총건수도 같은 조건으로 세어야 한다 (본문과 카운트의 조건 불일치 방지)")
        void totalCountUsesTheSameCondition() {
            Page<CommonCodeDetailProjection> page =
                    commonCodeRepository.searchCommonCodeDetails("1", "GRP_MATCH", PAGE);

            // 카운트 쿼리에서만 조건이 빠지면 목록 1건인데 총건수 2건이 되어 페이징이 깨진다.
            assertThat(page.getTotalElements()).isEqualTo(page.getContent().size());
            assertThat(page.getTotalElements()).isEqualTo(1);
        }

        private List<String> detailCodes(String condition, String keyword) {
            return commonCodeRepository
                    .searchCommonCodeDetails(condition, keyword, PAGE)
                    .getContent().stream().map(CommonCodeDetailProjection::getDtlCd).sorted().toList();
        }
    }
}
