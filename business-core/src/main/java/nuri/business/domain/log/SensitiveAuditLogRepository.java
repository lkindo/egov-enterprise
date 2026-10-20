package nuri.business.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import java.math.BigInteger;
import java.util.List;

/** 보존 정리 삭제({@code deleteBefore})는 V2_132 트리거에 삭제를 선언해야 하므로 사용자 정의 조각이 맡는다. */
public interface SensitiveAuditLogRepository extends JpaRepository<SensitiveAuditLog, BigInteger>,
        QuerydslPredicateExecutor<SensitiveAuditLog>, SensitiveAuditLogRepositoryCustom {

    /** [2026-10-20] 원장에 남은 작업 이름(중복 없이, 이름 순). 조건 검색의 작업 종류 선택지다. */
    @Query("select distinct a.jobNm from SensitiveAuditLog a order by a.jobNm")
    List<String> findDistinctOperations();
}
