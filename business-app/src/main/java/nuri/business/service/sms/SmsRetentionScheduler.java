package nuri.business.service.sms;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.sms.SmsRecptnRepository;
import nuri.business.domain.sms.SmsRepository;
import nuri.foundation.core.util.ServiceTime;

/**
 * SMS 발송 이력({@code tb_sms_info}·{@code tb_sms_rcptn}) 보존·파기 스케줄러.
 *
 * <p>[2026-11-21] 발송 이력에는 수신 번호(수신자 표의 기본 키)와 본문(최대 4000자)이 남는데, 지우거나 보존 기간으로
 * 파기하는 경로가 앱에 없었다. 읽은 알림 정리({@code NotificationRetentionScheduler}, DEC-OPS-038)와 같은 모양으로
 * 파기 경로를 두되 <b>기본 비활성</b>({@code nuri.sms.retention.enabled=false})이다 — 보존 기간은 도입 기관이
 * 개인정보 처리방침으로 정할 값이다.
 *
 * <p>안전 가드: {@code months} 가 {@value #MIN_MONTHS} 미만(미설정 0·음수)이면 켜져 있어도 지우지 않고 WARN 만 남긴다.
 * 한 묶음({@value #BATCH_SIZE}건)마다 따로 커밋하고 한 번에 {@value #MAX_BATCHES_PER_RUN}묶음까지만 지워, 쌓인 이력이
 * 많아도 긴 트랜잭션·잠금을 만들지 않는다(남은 것은 다음 실행이 이어 지운다). 지운 발송 건의 내구 작업이 남아 있어도
 * 실행기는 발송 건이 없으면 아무것도 하지 않는다({@code SmsDeliveryWorkHandler}).
 *
 * <p>정책 문서: {@code docs/04-operations/log-retention-policy.md} 의 'SMS 발송 이력 보존' 절.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "nuri.sms.retention.enabled", havingValue = "true")
public class SmsRetentionScheduler {
    /** 이 미만의 보존월은 미설정으로 본다 — 지우지 않는다. */
    static final int MIN_MONTHS = 1;
    static final int BATCH_SIZE = 500;
    static final int MAX_BATCHES_PER_RUN = 20;

    private final SmsRepository smsRepository;
    private final SmsRecptnRepository recipientRepository;
    private final TransactionTemplate transaction;

    @Value("${nuri.sms.retention.months:0}")
    private int months;

    public SmsRetentionScheduler(SmsRepository smsRepository, SmsRecptnRepository recipientRepository,
                                 PlatformTransactionManager transactionManager) {
        this.smsRepository = smsRepository;
        this.recipientRepository = recipientRepository;
        this.transaction = new TransactionTemplate(transactionManager);
    }

    /** 매일 04:45(Asia/Seoul) — 로그 파기(04:00)·읽은 알림 정리(04:30) 뒤에 돈다. */
    @Scheduled(cron = "${nuri.sms.retention.cron:0 45 4 * * *}", zone = "Asia/Seoul")
    public void purgeExpiredHistory() {
        if (months < MIN_MONTHS) {
            log.warn("[sms-retention] months={} 가 {} 미만 → SMS 발송 이력 정리를 건너뜀(전량파기 방지)", months, MIN_MONTHS);
            return;
        }
        LocalDateTime cutoff = ServiceTime.now().minusMonths(months);
        long transmissions = 0;
        long recipients = 0;
        for (int batch = 0; batch < MAX_BATCHES_PER_RUN; batch++) {
            int[] deleted = transaction.execute(status -> purgeBatch(cutoff));
            if (deleted == null || deleted[0] == 0) {
                break;
            }
            transmissions += deleted[0];
            recipients += deleted[1];
            if (deleted[0] < BATCH_SIZE) {
                break;
            }
        }
        log.info("[sms-retention] {} 이전 SMS 발송 {}건·수신자 {}건 정리 (months={})",
                cutoff, transmissions, recipients, months);
    }

    private int[] purgeBatch(LocalDateTime cutoff) {
        List<Long> ids = smsRepository.findIdsCreatedBefore(cutoff, PageRequest.of(0, BATCH_SIZE));
        if (ids.isEmpty()) {
            return new int[] {0, 0};
        }
        int recipientCount = recipientRepository.deleteBySmsTrsmSnIn(ids);
        int transmissionCount = smsRepository.deleteByIdIn(ids);
        return new int[] {transmissionCount, recipientCount};
    }
}
