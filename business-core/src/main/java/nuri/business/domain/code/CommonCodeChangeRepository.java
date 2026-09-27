package nuri.business.domain.code;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/** 공통코드 변경 이력 저장소(2026-09-27 DIP B5 F11). 최신순으로만 읽는다. */
public interface CommonCodeChangeRepository extends JpaRepository<CommonCodeChange, Long> {

    /** 한 그룹(그 그룹과 상세 코드)의 이력. */
    Page<CommonCodeChange> findByCdIdOrderByCrtDtDescComCdChgHstrySnDesc(String cdId, Pageable pageable);

    /** 한 분류 자신의 이력(그 분류에 속한 그룹·상세 코드의 이력은 포함하지 않는다). */
    Page<CommonCodeChange> findByChgTrgtTypeCdAndClsfCdOrderByCrtDtDescComCdChgHstrySnDesc(
            String chgTrgtTypeCd, String clsfCd, Pageable pageable);

    /** 전체 이력. */
    Page<CommonCodeChange> findAllByOrderByCrtDtDescComCdChgHstrySnDesc(Pageable pageable);
}
