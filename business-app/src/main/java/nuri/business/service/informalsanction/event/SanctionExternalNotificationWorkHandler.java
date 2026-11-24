package nuri.business.service.informalsanction.event;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.informalsanction.InformalSanctionHistory;
import nuri.business.domain.informalsanction.InformalSanctionHistoryId;
import nuri.business.domain.informalsanction.InformalSanctionHistoryRepository;
import nuri.business.domain.informalsanction.SanctionStatus;
import nuri.business.service.user.UserContactService;
import nuri.business.service.user.UserContactService.UserContact;
import nuri.foundation.core.event.MailRequestedEvent;
import nuri.foundation.core.event.SmsRequestedEvent;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.job.DurableWorkHandler;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import tools.jackson.databind.json.JsonMapper;

/**
 * 결재 결과의 문자·메일 요청(2026-11-25).
 *
 * <p>종전에는 결재 커밋 뒤 {@code @Async} 이벤트로 요청해, 그 사이에 프로세스가 끝나거나 실행기가 거부하면 기안자에게 가는 외부
 * 통지가 흔적 없이 사라졌다. 이제 결재 트랜잭션이 이 작업을 함께 저장하고({@link SanctionEventListener}), 커밋 뒤 작업자가
 * 연락처를 읽어 두 채널을 요청한다.
 *
 * <p><b>작업 원장에는 참조만 둔다</b> — 결재 번호·차수·상태·기안자·결재자 식별자다. 반려 사유·전화번호·주소는 싣지 않는다.
 * 반려 사유는 그 차수의 이력({@code tb_ifml_atrz_hstry})에서 읽는다. 차수 이력은 결재가 끝난 뒤 바뀌지 않고(재상신은 새 차수다)
 * 결재 행의 사유는 재상신 때 지워지므로 결재 행이 아니라 이력을 본다.
 *
 * <p><b>다시 실행돼도 한 번만 접수한다</b> — 작업은 완료 기록 전에 끊기면 다시 실행된다. 채널마다 이 작업 키에서 정한 의도 키를
 * 요청에 실어, 메일·문자 서비스가 같은 키의 두 번째 요청에서 이력과 발송 작업을 새로 만들지 않게 한다. 한 채널의 접수가 실패해도
 * 다른 채널은 요청하고, 마지막에 그 실패를 되던져 작업이 다시 시도되게 한다. 입력 거절(연락처 없음·게이트웨이가 못 보내는 본문)은
 * 다시 해도 같으므로 메일·문자 리스너가 재시도 대상에서 뺀다.
 *
 * <p><b>받는 사람은 지금 사용 중인 계정의 연락처다</b> — 기안자 식별자(esntlId)로만 해석하고({@link UserContactService}), 실행 때
 * 이미 비활성·삭제된 계정에는 두 채널 모두 보내지 않는다. 문자 접수는 원래 비활성 수신자를 거절했고 메일만 넘겨받은 주소로
 * 나갔다 — 두 채널의 수신자 규칙을 같게 한다. 로그인 ID 를 먼저 찾는 관리 조회는 쓰지 않는다(다른 사람의 로그인 ID 가 이 esntlId 와
 * 같으면 그 사람에게 갈 수 있다).
 */
@Slf4j
@Component
public class SanctionExternalNotificationWorkHandler implements DurableWorkHandler {
    public static final String TYPE = "SANCTION_EXTERNAL_NOTIFICATION";
    static final String MAIL_SUBJECT = "[eGov] 결재 상태 변경 알림";
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final UserContactService userContactService;
    private final InformalSanctionHistoryRepository historyRepository;
    private final ApplicationEventPublisher eventPublisher;

    public SanctionExternalNotificationWorkHandler(UserContactService userContactService,
                                                   InformalSanctionHistoryRepository historyRepository,
                                                   ApplicationEventPublisher eventPublisher) {
        this.userContactService = userContactService;
        this.historyRepository = historyRepository;
        this.eventPublisher = eventPublisher;
    }

    /** 작업 payload — 식별자만 담는다. {@code cycle} 은 반려 사유를 읽을 차수이며 없으면 사유 없이 보낸다. */
    record Intent(long sanctionSn, BigDecimal cycle, String status, String applicantId, String sanctionerId) {}

    /** 같은 사건은 같은 작업 키다 — 같은 이벤트가 다시 발행돼도 작업이 하나다. */
    static UUID key(SanctionStatusChangedEvent event) {
        return UUID.nameUUIDFromBytes((TYPE + ":" + event.getEventId()).getBytes(StandardCharsets.UTF_8));
    }

    static String payload(SanctionStatusChangedEvent event) {
        return JSON.writeValueAsString(new Intent(event.getInformalSanctionSn(), event.getAtrzCycl(),
                event.getNewStatus() == null ? null : event.getNewStatus().name(),
                event.getApplicantId(), event.getSanctionerId()));
    }

    /** 채널별 의도 키 — 작업 키에서 결정적으로 정한다. 두 채널은 서로 다른 키다. */
    static UUID channelKey(DurableWork work, String channel) {
        return UUID.nameUUIDFromBytes((work.key() + ":" + channel).getBytes(StandardCharsets.UTF_8));
    }

    @Override public String type() { return TYPE; }

    @Override public int maximumConcurrentExecutions() { return 1; }

    @Override
    public void execute(DurableWork work) {
        if (!TYPE.equals(work.type())) throw new IllegalArgumentException("Unexpected work type");
        Intent intent = JSON.readValue(work.payload(), Intent.class);
        SanctionStatus status = intent.status() == null ? null : SanctionStatus.valueOf(intent.status());

        UserContact user = findApplicant(intent, status);
        if (user == null) {
            return;
        }
        String reason = null;
        if (intent.cycle() != null) {
            InformalSanctionHistory history = historyRepository
                    .findById(new InformalSanctionHistoryId(intent.sanctionSn(), intent.cycle())).orElse(null);
            if (history == null) {
                // 문서를 지웠으면 그 결과를 문자·메일로 따로 알리지 않는다 — 지운 기록을 작업 원장에서 되살리지 않는다.
                log.warn("Sanction cycle no longer exists; external result notice skipped: sanctionSn={}, status={}",
                        intent.sanctionSn(), status);
                return;
            }
            reason = history.getRjctRsnCn();
        }
        // [W1-D5] 발송 요청자는 결재를 실제로 승인·반려한 사람이다. 작업자 스레드에는 SecurityContext 가 없다 — 요청자는
        //   발송 이력·로그 귀속에만 쓰이며 인가 판정에 쓰이지 않는다(H3).
        String actorId = StringUtils.hasText(intent.sanctionerId()) ? intent.sanctionerId() : "SYSTEM";
        String message = SanctionResultText.externalMessage(intent.sanctionSn(), status, reason);

        RuntimeException deferred = null;
        if (StringUtils.hasText(user.mblTelno())) {
            try {
                eventPublisher.publishEvent(new SmsRequestedEvent(actorId, user.mblTelno(), message, user.esntlId(),
                        channelKey(work, "SMS")));
                log.info("SMS notification requested: sanctionSn={}, status={}", intent.sanctionSn(), status);
            } catch (RuntimeException failure) {
                deferred = failure;
                log.error("Failed to request SMS notification: sanctionSn={}, status={}, exceptionType={}",
                        intent.sanctionSn(), status, failure.getClass().getSimpleName());
            }
        }
        if (StringUtils.hasText(user.emlAddr())) {
            try {
                eventPublisher.publishEvent(new MailRequestedEvent(actorId, user.emlAddr(), user.userNm(), MAIL_SUBJECT,
                        message, channelKey(work, "MAIL")));
                log.info("Mail notification requested: sanctionSn={}, status={}", intent.sanctionSn(), status);
            } catch (RuntimeException failure) {
                if (deferred == null) deferred = failure;
                log.error("Failed to request mail notification: sanctionSn={}, status={}, exceptionType={}",
                        intent.sanctionSn(), status, failure.getClass().getSimpleName());
            }
        }
        if (deferred != null) {
            // 접수하지 못한 채널이 있다 — 작업을 다시 시도한다. 이미 접수한 채널은 같은 의도 키라 다시 만들지 않는다.
            throw deferred;
        }
    }

    /**
     * 기안자의 지금 연락처 — 사용 중인 계정만이다. 없거나 비활성이면 건너뛴다(다시 해도 같다). 저장소 장애처럼 다른 실패는 되던져
     * 다시 시도한다.
     */
    private UserContact findApplicant(Intent intent, SanctionStatus status) {
        if (!StringUtils.hasText(intent.applicantId())) {
            return null;
        }
        try {
            return userContactService.resolve(java.util.List.of(intent.applicantId())).stream().findFirst().orElse(null);
        } catch (BusinessException missing) {
            log.warn("Applicant is not an active account; external result notice skipped: sanctionSn={}, status={}, exceptionType={}",
                    intent.sanctionSn(), status, missing.getClass().getSimpleName());
            return null;
        }
    }
}
