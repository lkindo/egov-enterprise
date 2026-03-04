package com.company.project.domain.monitoring;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TrsmrcvMonitoringRepository extends JpaRepository<TrsmrcvMonitoring, String> {

    @Query(value = "SELECT A.CNTC_ID, A.TEST_CLASS_NM, " +
            "A.MNGR_NM, A.MNGR_EMAIL_ADRES, A.MNTRNG_STTUS, " +
            "A.LAST_UPDT_PNTTM, A.LAST_UPDUSR_ID, " +
            "A.FRST_REGISTER_ID, A.FRST_REGIST_PNTTM, " +
            "A.CREAT_DT, " +
            "B.CODE_NM MNTRNG_STTUS_NM, C.CNTC_NM, " +
            "D.INSTT_NM PROVD_INSTT_NM, E.SYS_NM PROVD_SYS_NM, F.SVC_NM PROVD_SVC_NM, " +
            "G.INSTT_NM REQUST_INSTT_NM, H.SYS_NM REQUST_SYS_NM " +
            "FROM NTRSMRCVMNTRNG A, CCMMNDETAILCODE B, NSYSTEMCNTC C, " +
            "NCNTCINSTT D, NCNTCSYSTEM E, NCNTCSERVICE F, " +
            "NCNTCINSTT G, NCNTCSYSTEM H " +
            "WHERE B.CODE_ID = 'COM046' " +
            "AND A.MNTRNG_STTUS = B.CODE " +
            "AND A.CNTC_ID = C.CNTC_ID " +
            "AND D.INSTT_ID = C.PROVD_INSTT_ID " +
            "AND E.INSTT_ID = C.PROVD_INSTT_ID " +
            "AND E.SYS_ID = C.PROVD_SYS_ID " +
            "AND F.INSTT_ID = C.PROVD_INSTT_ID " +
            "AND F.SYS_ID = C.PROVD_SYS_ID " +
            "AND F.SVC_ID = C.PROVD_SVC_ID " +
            "AND G.INSTT_ID = C.REQUST_INSTT_ID " +
            "AND H.INSTT_ID = C.REQUST_INSTT_ID " +
            "AND H.SYS_ID = C.REQUST_SYS_ID " +
            "AND (:searchCondition = '0' AND C.CNTC_NM LIKE %:searchKeyword% OR " +
            "     :searchCondition = '1' AND A.CNTC_ID LIKE %:searchKeyword% OR " +
            "     :searchCondition = '2' AND A.MNGR_NM LIKE %:searchKeyword% OR " +
            "     :searchCondition = '3' AND B.CODE_NM LIKE %:searchKeyword% OR " +
            "     :searchCondition IS NULL OR :searchCondition = '')", nativeQuery = true)
    Page<Object[]> selectTrsmrcvMntrngList(@Param("searchCondition") String searchCondition,
            @Param("searchKeyword") String searchKeyword, Pageable pageable);

    @Query(value = "SELECT A.CNTC_ID, A.TEST_CLASS_NM, " +
            "A.MNGR_NM, A.MNGR_EMAIL_ADRES, A.MNTRNG_STTUS, " +
            "A.LAST_UPDT_PNTTM, A.LAST_UPDUSR_ID, " +
            "A.FRST_REGISTER_ID, A.FRST_REGIST_PNTTM, " +
            "A.CREAT_DT, " +
            "B.CODE_NM MNTRNG_STTUS_NM, C.CNTC_NM, " +
            "D.INSTT_NM PROVD_INSTT_NM, E.SYS_NM PROVD_SYS_NM, F.SVC_NM PROVD_SVC_NM, " +
            "G.INSTT_NM REQUST_INSTT_NM, H.SYS_NM REQUST_SYS_NM " +
            "FROM NTRSMRCVMNTRNG A, CCMMNDETAILCODE B, NSYSTEMCNTC C, " +
            "NCNTCINSTT D, NCNTCSYSTEM E, NCNTCSERVICE F, " +
            "NCNTCINSTT G, NCNTCSYSTEM H " +
            "WHERE B.CODE_ID = 'COM046' " +
            "AND A.MNTRNG_STTUS = B.CODE " +
            "AND A.CNTC_ID = C.CNTC_ID " +
            "AND D.INSTT_ID = C.PROVD_INSTT_ID " +
            "AND E.INSTT_ID = C.PROVD_INSTT_ID " +
            "AND E.SYS_ID = C.PROVD_SYS_ID " +
            "AND F.INSTT_ID = C.PROVD_INSTT_ID " +
            "AND F.SYS_ID = C.PROVD_SYS_ID " +
            "AND F.SVC_ID = C.PROVD_SVC_ID " +
            "AND G.INSTT_ID = C.REQUST_INSTT_ID " +
            "AND H.INSTT_ID = C.REQUST_INSTT_ID " +
            "AND H.SYS_ID = C.REQUST_SYS_ID " +
            "AND A.CNTC_ID = :cntcId", nativeQuery = true)
    Object[] selectTrsmrcvMntrng(@Param("cntcId") String cntcId);

    @Query(value = "SELECT A.CNTC_ID, A.CNTC_NM, A.CNTC_TY, " +
            "A.PROVD_INSTT_ID, A.PROVD_SYS_ID, A.PROVD_SVC_ID, " +
            "A.REQUST_INSTT_ID, A.REQUST_SYS_ID, " +
            "C1.INSTT_NM PROVD_INSTT_NM, D1.SYS_NM PROVD_SYS_NM, E.SVC_NM PROVD_SVC_NM, " +
            "C2.INSTT_NM REQUST_INSTT_NM, D2.SYS_NM REQUST_SYS_NM " +
            "FROM NSYSTEMCNTC A, NCNTCINSTT C1, NCNTCINSTT C2, " +
            "NCNTCSYSTEM D1, NCNTCSYSTEM D2, NCNTCSERVICE E " +
            "WHERE A.PROVD_INSTT_ID = C1.INSTT_ID " +
            "AND A.PROVD_INSTT_ID = D1.INSTT_ID " +
            "AND A.PROVD_SYS_ID = D1.SYS_ID " +
            "AND A.PROVD_INSTT_ID = E.INSTT_ID " +
            "AND A.PROVD_SYS_ID = E.SYS_ID " +
            "AND A.PROVD_SVC_ID = E.SVC_ID " +
            "AND A.REQUST_INSTT_ID = C2.INSTT_ID " +
            "AND A.REQUST_INSTT_ID = D2.INSTT_ID " +
            "AND A.REQUST_SYS_ID = D2.SYS_ID " +
            "AND (:searchCondition = '0' AND A.CNTC_NM LIKE %:searchKeyword% OR " +
            "     :searchCondition IS NULL OR :searchCondition = '')", nativeQuery = true)
    Page<Object[]> selectCntcList(@Param("searchCondition") String searchCondition,
            @Param("searchKeyword") String searchKeyword, Pageable pageable);
}