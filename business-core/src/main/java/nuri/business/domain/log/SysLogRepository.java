package nuri.business.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SysLogRepository extends JpaRepository<SysLog, Long>, SysLogRepositoryCustom {

    /** 그 발생일자(yyyyMMdd)에 기록된 실패 요청 수 — 관리자 홈의 운영 신호(OperationalSignalService)가 읽는다. */
    long countByOcrnYmd(String ocrnYmd);
}
