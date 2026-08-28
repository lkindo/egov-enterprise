package nuri.business.repository.code;

import nuri.business.domain.code.InstitutionCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InstitutionCodeRepository extends JpaRepository<InstitutionCode, String> {
    Page<InstitutionCode> findByAllInstNmContaining(String allInstNm, Pageable pageable);

    Page<InstitutionCode> findByAllInstNmContainingOrInstCdContainingIgnoreCase(
            String allInstNm, String instCd, Pageable pageable);

    /**
     * 기관코드 검색.
     *
     * <p>[2026-08-28] 종전에는 {@code findByAllInstNmContaining} 하나만 불러 <b>기관명만</b>
     * 검색했다. 그런데 목록의 첫 열이 '식별 코드'(instCd)이고 화면 조회 조건 라벨도
     * '기관명 · 코드', placeholder 도 '기관명 또는 코드를 입력하세요' 다. 사용자가 화면에 보이는
     * 코드를 그대로 입력하면 기관명 LIKE 가 0건이 되어, <b>존재하는 기관이 '검색 결과가 없습니다'
     * 로 사라졌다</b> — 검색이 무시되던 종전과는 다른 형태로 여전히 틀린 결과다.
     *
     * <p>{@code searchCondition} 은 이 엔드포인트의 어떤 호출부도 싣지 않는다(화면은
     * searchKeyword·pageIndex·pageUnit 만 보낸다). 조건별 분기를 지어내지 않고, 화면 라벨이
     * 약속하는 범위(기관명 또는 코드)를 그대로 집행한다.
     */
    default Page<InstitutionCode> searchInstitutionCodes(String searchCondition, String searchKeyword, Pageable pageable) {
        String keyword = searchKeyword == null ? "" : searchKeyword;
        return findByAllInstNmContainingOrInstCdContainingIgnoreCase(keyword, keyword, pageable);
    }
}
