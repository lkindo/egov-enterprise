package nuri.business.domain.log;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PrivacyLogRepositoryCustom {
    Page<PrivacyLog> searchPrivacyLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable);

    /**
     * 보존기간이 지난 개인정보 접근 로그를 파기한다.
     *
     * <p>[2026-09-02] 종전에는 이 테이블에 파기 경로가 <b>없었다</b>. 형제 로그 4종은
     * {@code LogRetentionScheduler} 가 매일 정리하는데 개인정보 로그만 대상 밖이었고, 조회 서비스의
     * javadoc 은 "삭제는 보존기간 정책이 담당한다" 고 <b>없는 경로를 가리키고</b> 있었다.
     * 같은 날 {@code PrivacyAccessLogListener} 가 실제로 기록을 시작했으므로, 파기 경로가 없으면
     * 접근 증적이 무한히 쌓인다.
     *
     * @param months 이보다 오래된 행을 지운다. 법정 최저 미만 값은 호출 측(스케줄러)이 걸러낸다.
     */
    void deleteOldLogs(int months);
}
