package nuri.business.repository.code;

import nuri.business.domain.code.InstitutionCode;
import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 기관코드 검색 범위 계약.
 *
 * <p>── 왜 저장소 계층인가 ──────────────────────────────────────────────────────
 * 서비스 단위 테스트는 저장소를 mock 하므로 <b>이 결함을 원리적으로 잡을 수 없다.</b> 검색어가
 * 저장소로 전달되는지까지는 mock 으로 확인되지만, 그 검색어가 <b>어느 컬럼에 걸리는지</b>는
 * 질의가 실제로 실행돼야 드러난다.
 *
 * <p>── 무엇이 틀려 있었나 ──────────────────────────────────────────────────────
 * {@code searchInstitutionCodes} 가 {@code findByAllInstNmContaining} 하나만 불러 <b>기관명만</b>
 * 검색했다. 그런데 화면 목록의 첫 열이 '식별 코드'(instCd)이고, 조회 조건 라벨은 '기관명 · 코드',
 * placeholder 는 '기관명 또는 코드를 입력하세요' 다. 사용자가 눈앞에 보이는 코드를 그대로 치면
 * 기관명 LIKE 가 0건이 되어 <b>존재하는 기관이 '검색 결과가 없습니다'로 사라졌다</b>.
 *
 * <p>검색이 통째로 무시되던 종전 상태(전체 목록이 그대로 남음)와는 다른 형태지만, 사용자에게는
 * 더 나쁘다 — 없다고 단정하기 때문이다.
 */
@DisplayName("InstitutionCodeRepository 검색 범위 통합 테스트")
class InstitutionCodeSearchTest extends PersistenceTestSupport {

    @Autowired
    private InstitutionCodeRepository institutionCodeRepository;

    private static final PageRequest FIRST_PAGE = PageRequest.of(0, 10);

    @BeforeEach
    void setUp() {
        institutionCodeRepository.deleteAll();
        institutionCodeRepository.save(InstitutionCode.builder()
                .instCd("6110000").allInstNm("서울특별시").build());
        institutionCodeRepository.save(InstitutionCode.builder()
                .instCd("6260000").allInstNm("부산광역시").build());
        institutionCodeRepository.save(InstitutionCode.builder()
                .instCd("1741000").allInstNm("교육부").build());
    }

    @Test
    @DisplayName("기관명으로 찾는다 — 종전에도 되던 축이다")
    void findsByName() {
        Page<InstitutionCode> result = institutionCodeRepository
                .searchInstitutionCodes(null, "서울", FIRST_PAGE);

        assertThat(result.getContent()).extracting(InstitutionCode::getInstCd)
                .containsExactly("6110000");
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("코드로도 찾는다 — 목록 첫 열이 코드라 사용자가 그것을 친다")
    void findsByCode() {
        Page<InstitutionCode> result = institutionCodeRepository
                .searchInstitutionCodes(null, "1741000", FIRST_PAGE);

        assertThat(result.getContent()).extracting(InstitutionCode::getAllInstNm)
                .containsExactly("교육부");
    }

    @Test
    @DisplayName("코드 일부만 쳐도 찾힌다")
    void findsByCodePrefix() {
        Page<InstitutionCode> result = institutionCodeRepository
                .searchInstitutionCodes(null, "626", FIRST_PAGE);

        assertThat(result.getContent()).extracting(InstitutionCode::getAllInstNm)
                .containsExactly("부산광역시");
    }

    @Test
    @DisplayName("검색어가 비면 전체를 돌려준다")
    void blankKeywordReturnsAll() {
        assertThat(institutionCodeRepository.searchInstitutionCodes(null, "", FIRST_PAGE)
                .getTotalElements()).isEqualTo(3);
        // null 이 그대로 흘러도 질의가 죽지 않는다 — 호출부가 값을 안 실을 수 있다.
        assertThat(institutionCodeRepository.searchInstitutionCodes(null, null, FIRST_PAGE)
                .getTotalElements()).isEqualTo(3);
    }

    @Test
    @DisplayName("총건수도 같은 조건에서 나온다 — 페이저가 거짓말하지 않는다")
    void totalMatchesTheSameCondition() {
        Page<InstitutionCode> result = institutionCodeRepository
                .searchInstitutionCodes(null, "광역시", FIRST_PAGE);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
    }
}
