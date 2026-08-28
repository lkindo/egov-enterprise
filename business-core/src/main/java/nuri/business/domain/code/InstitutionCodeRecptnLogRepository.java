package nuri.business.domain.code;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import nuri.business.domain.code.InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId;

public interface InstitutionCodeRecptnLogRepository
        extends JpaRepository<InstitutionCodeRecptnLog, InstitutionCodeRecptnLogId> {
    Page<InstitutionCodeRecptnLog> findByAllInstNmContainingAndProcSe(String allInstNm, String procSe, Pageable pageable);
    Page<InstitutionCodeRecptnLog> findByAllInstNmContaining(String allInstNm, Pageable pageable);

    /**
     * 기관명 또는 기관코드로 수신 이력을 찾는다.
     *
     * <p>수신 이력 탭은 목록 탭과 <b>같은 검색창</b>을 공유한다(화면이 debounce 된 keyword 하나를
     * 두 질의에 함께 싣는다). 그래서 라벨이 약속하는 범위도 같아야 한다 — 목록만 코드를 찾고
     * 이력은 못 찾으면, 탭을 옮기는 것만으로 같은 검색어가 다른 뜻이 된다.
     *
     * <p>{@code instCd} 는 복합 키 안에 있으므로 경로가 {@code id.instCd} 다.
     */
    Page<InstitutionCodeRecptnLog> findByAllInstNmContainingOrIdInstCdContainingIgnoreCase(
            String allInstNm, String instCd, Pageable pageable);
}
