package nuri.business.domain.log;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserLogRepositoryCustom {
    Page<UserLog> searchUserLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable);

    void deleteOldLogs(int months);

    /**
     * 일자별 사용자 활동 카운터를 <b>누적</b>한다(UPSERT). 행이 없으면 만들고, 있으면 델타를 더한다.
     *
     * <p>[왜 네이티브인가] {@code tb_user_log}는 (일자, 사용자, 서비스, 메서드) 복합 PK의 카운터
     * 테이블이라 "읽고-더해-쓰기"를 JPA로 하면 두 인스턴스가 동시에 flush 할 때 한쪽 증분이 사라진다.
     * 단일 upsert 문장은 그 경합을 DB가 직렬화한다.
     *
     * <p>[COALESCE 가 필요한 이유] 카운터 컬럼은 모두 nullable 이고 과거 데이터에 NULL 이 있을 수
     * 있다. {@code NULL + 1 = NULL} 이므로 감싸지 않으면 누적이 조용히 NULL 로 리셋된다.
     *
     * @return 영향받은 행 수(항상 1)
     */
    int upsertActivityCounts(String ocrnYmd, String dmndUserId, String srvcNm, String mthdNm,
            long crtCnt, long mdfcnCnt, long inqCnt, long delCnt, long otptCnt, long errCnt);
}
