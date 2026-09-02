package nuri.business.service.log;

import nuri.business.domain.log.LoginLogRepository;
import nuri.business.domain.log.PrivacyLogRepository;
import nuri.business.domain.log.SysLogRepository;
import nuri.business.domain.log.UserLogRepository;
import nuri.business.domain.log.WebLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.function.IntConsumer;

/**
 * 로그 보존기간 만료 정리 배치.
 *
 * <p><b>접속기록</b>(web/sys/login)은 개인정보 보호법상 삭제 자유보다 <b>보존 의무</b>(개인정보의 안전성
 * 확보조치 기준 제8조: 접속기록 최소 1년, 고유식별정보 처리 등은 2년)가 우선한다. 따라서 만료 <b>이전</b>
 * 데이터만 파기하며(PIPA 제21조 파기 원칙 소명), <b>월수가 법정 최저({@value #LEGAL_MIN_MONTHS}) 미만이면
 * 해당 테이블 삭제를 건너뛴다</b>. 이는 {@code enabled=true} 인데 월수 미설정(기본 0)/오설정(음수)으로
 * cutoff 가 '오늘'이 되어 <b>접속기록 전량이 파기되는 사고</b>(또는 설정 탈취 공격)를 코드 레벨에서 차단한다.
 *
 * <p>기본 <b>비활성</b>({@code nuri.log.retention.enabled=false}) — 인수처가 보존기간 수치를 확정한 뒤
 * 명시적으로 켠다. 테이블별 보존월은 {@code nuri.log.retention.{web,sys,login,user,privacy}-months}.
 * (사용자 삭제 시 tb_user_log 는 즉시 정리되므로 user 보존은 잔여 백스톱이다.)
 *
 * <p>정책 문서: {@code docs/04-operations/log-retention-policy.md}.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "nuri.log.retention.enabled", havingValue = "true")
@RequiredArgsConstructor
public class LogRetentionScheduler {

    /** 접속기록 법정 최소 보존월(안전성 확보조치 기준 제8조 기본 1년). 이 미만 설정은 삭제하지 않는다. */
    static final int LEGAL_MIN_MONTHS = 12;

    private final WebLogRepository webLogRepository;
    private final SysLogRepository sysLogRepository;
    private final LoginLogRepository loginLogRepository;
    private final UserLogRepository userLogRepository;
    /**
     * [2026-09-02] 개인정보 접근 로그를 파기 대상에 편입한다.
     *
     * <p>종전에는 이 테이블만 스케줄러 밖이었다. 조회 서비스 javadoc 이 "삭제는 보존기간 정책이
     * 담당한다" 고 적어 두었지만 실제 경로는 없었고, 같은 날 리스너가 기록을 시작했으므로
     * 파기 없이는 접근 증적이 무한히 쌓인다. 개인정보 접속기록은 법정 <b>최저</b> 보존기간이
     * 있으므로 {@link #purge} 의 하한 가드가 그대로 적용된다 — 짧게 설정해 전량파기하는 경로는 막힌다.
     */
    private final PrivacyLogRepository privacyLogRepository;

    @Value("${nuri.log.retention.web-months:0}")
    private int webMonths;
    @Value("${nuri.log.retention.sys-months:0}")
    private int sysMonths;
    @Value("${nuri.log.retention.login-months:0}")
    private int loginMonths;
    @Value("${nuri.log.retention.privacy-months:0}")
    private int privacyMonths;

    @Value("${nuri.log.retention.user-months:0}")
    private int userMonths;

    /**
     * 매일 04:00(Asia/Seoul) 만료 로그 정리. cron 은 {@code nuri.log.retention.cron} 으로 재정의 가능.
     */
    @Scheduled(cron = "${nuri.log.retention.cron:0 0 4 * * *}", zone = "Asia/Seoul")
    public void purgeExpiredLogs() {
        log.info("[log-retention] 만료 로그 정리 시작 (web={}m sys={}m login={}m user={}m privacy={}m)",
                webMonths, sysMonths, loginMonths, userMonths, privacyMonths);
        purge("web_log", webMonths, webLogRepository::deleteOldLogs);
        purge("sys_log", sysMonths, sysLogRepository::deleteOldLogs);
        purge("login_log", loginMonths, loginLogRepository::deleteOldLogs);
        purge("user_log", userMonths, userLogRepository::deleteOldLogs);
        purge("privacy_log", privacyMonths, privacyLogRepository::deleteOldLogs);
    }

    private void purge(String table, int months, IntConsumer deleter) {
        if (months < LEGAL_MIN_MONTHS) {
            // 미설정(0)·음수·법정 최저 미만 → 전량파기 방지. skip.
            log.warn("[log-retention] {} 보존월={} 이 법정 최저({}) 미만 → 삭제 건너뜀(전량파기 방지)",
                    table, months, LEGAL_MIN_MONTHS);
            return;
        }
        deleter.accept(months);
        log.info("[log-retention] {} {}개월 이전 로그 정리 완료", table, months);
    }
}
