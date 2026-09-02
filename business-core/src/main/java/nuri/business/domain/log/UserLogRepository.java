package nuri.business.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserLogRepository extends JpaRepository<UserLog, UserLogId>, UserLogRepositoryCustom {

    /**
     * 사용자 삭제 시 해당 사용자의 사용통계 로그를 일괄 정리한다.
     * <p>키 규약상 {@code tb_user_log.dmnd_user_id} 는 esntl_id(FK, ①계층)이며 개인 단위
     * 사용통계이므로 파기 대상이다. @IdClass 복합키 엔티티라 파생 deleteBy(로드-후-건별삭제)가 아닌
     * 벌크 JPQL 로 명시해 결정적으로 삭제한다(대량 시에도 안전). — fk_tb_user_log_tb_user_info 잠복 결함 해소.
     */
    @Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM UserLog u WHERE u.dmndUserId IN :esntlIds")
    int deleteByDmndUserIdIn(@Param("esntlIds") List<String> esntlIds);

    /**
     * 일자별 사용자 활동 카운터를 <b>누적</b>한다(UPSERT). 행이 없으면 만들고, 있으면 델타를 더한다.
     *
     * <p>[왜 네이티브인가] {@code tb_user_log}는 (일자, 사용자, 서비스, 메서드) 복합 PK의 카운터
     * 테이블이라 "읽고-더해-쓰기"를 JPA로 하면 두 인스턴스가 동시에 flush 할 때 한쪽 증분이 사라진다.
     * {@code ON CONFLICT ... DO UPDATE}는 단일 문장이라 그 경합을 DB가 직렬화한다.
     *
     * <p>[COALESCE 가 필요한 이유] 카운터 컬럼은 모두 nullable 이고 과거 데이터에 NULL 이 있을 수
     * 있다. {@code NULL + 1 = NULL} 이므로 감싸지 않으면 누적이 조용히 NULL 로 리셋된다.
     *
     * <p>충돌 대상은 제약 이름 {@code pk_tb_user_log}로 지정한다 — 컬럼 목록으로 쓰면 나중에 PK 컬럼
     * 순서가 바뀔 때 조용히 다른 인덱스를 잡을 수 있다.
     *
     * @return 영향받은 행 수(항상 1)
     */
    @Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query(value = """
            INSERT INTO tb_user_log (
                ocrn_ymd, dmnd_user_id, srvc_nm, mthd_nm,
                crt_cnt, mdfcn_cnt, inq_cnt, del_cnt, otpt_cnt, err_cnt,
                crt_dt, mdfcn_dt)
            VALUES (
                :ocrnYmd, :dmndUserId, :srvcNm, :mthdNm,
                :crtCnt, :mdfcnCnt, :inqCnt, :delCnt, :otptCnt, :errCnt,
                now(), now())
            ON CONFLICT ON CONSTRAINT pk_tb_user_log DO UPDATE SET
                crt_cnt   = COALESCE(tb_user_log.crt_cnt, 0)   + EXCLUDED.crt_cnt,
                mdfcn_cnt = COALESCE(tb_user_log.mdfcn_cnt, 0) + EXCLUDED.mdfcn_cnt,
                inq_cnt   = COALESCE(tb_user_log.inq_cnt, 0)   + EXCLUDED.inq_cnt,
                del_cnt   = COALESCE(tb_user_log.del_cnt, 0)   + EXCLUDED.del_cnt,
                otpt_cnt  = COALESCE(tb_user_log.otpt_cnt, 0)  + EXCLUDED.otpt_cnt,
                err_cnt   = COALESCE(tb_user_log.err_cnt, 0)   + EXCLUDED.err_cnt,
                mdfcn_dt  = now()
            """, nativeQuery = true)
    int upsertActivityCounts(
            @Param("ocrnYmd") String ocrnYmd,
            @Param("dmndUserId") String dmndUserId,
            @Param("srvcNm") String srvcNm,
            @Param("mthdNm") String mthdNm,
            @Param("crtCnt") long crtCnt,
            @Param("mdfcnCnt") long mdfcnCnt,
            @Param("inqCnt") long inqCnt,
            @Param("delCnt") long delCnt,
            @Param("otptCnt") long otptCnt,
            @Param("errCnt") long errCnt);

    /**
     * 날짜별 사용자 활동 통계
     */
    @org.springframework.data.jpa.repository.Query(value = """
            SELECT ocrn_ymd as statsDate,
                   SUM(crt_cnt) as creatCo,
                   SUM(inq_cnt) as inqCnt
            FROM tb_user_log
            WHERE ocrn_ymd BETWEEN :fromDate AND :toDate
            GROUP BY ocrn_ymd
            ORDER BY ocrn_ymd ASC
            """, nativeQuery = true)
    List<Object[]> countByDate(@Param("fromDate") String fromDate, @Param("toDate") String toDate);
}
