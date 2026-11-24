package nuri.business.service.mail;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import nuri.business.domain.mail.SentMailRepository;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.job.DurableWorkHandler;
import nuri.foundation.core.util.CryptoUtil;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** Retains the accepted recipient encrypted until terminal acknowledgement; history is never an address source. */
@Component
@RequiredArgsConstructor
public class MailDeliveryWorkHandler implements DurableWorkHandler {
    public static final String TYPE = "MAIL_DELIVERY";
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private final SentMailRepository repository;
    private final MailAsyncProcessor processor;

    record Intent(long dispatchId, String queuedAt, String encryptedRecipient, String from, String senderEsntlId) {}

    static DurableWork work(long id, LocalDateTime queuedAt, String address, String from, String senderEsntlId) {
        return new DurableWork(UUID.randomUUID(), TYPE, payload(id, queuedAt, address, from, senderEsntlId));
    }

    /** 작업 payload — 같은 의도 키로 한 번만 접수하는 경로(enqueueOnce)도 같은 모양을 쓴다. */
    static String payload(long id, LocalDateTime queuedAt, String address, String from, String senderEsntlId) {
        String encrypted = CryptoUtil.encrypt(address);
        if (encrypted == null || encrypted.isBlank()) throw new IllegalStateException("Missing encrypted recipient");
        return JSON.writeValueAsString(new Intent(id, queuedAt.toString(), encrypted, from, senderEsntlId));
    }

    static Intent intent(DurableWork work) {
        if (!TYPE.equals(work.type())) throw new IllegalArgumentException("Unexpected work type");
        return JSON.readValue(work.payload(), Intent.class);
    }

    /**
     * 접수한 발송 번호(2026-11-25). 발송이 끝나 payload 를 비운 작업({@link #discardPayloadOnCompletion()})이면 비어 있다 — 같은
     * 의도 키의 다시 요청은 이미 접수됐다는 사실만으로 충분하므로, 비운 payload 를 읽다 실패해 그 요청을 실패로 만들지 않는다.
     */
    static java.util.Optional<Long> dispatchIdOf(DurableWork work) {
        if (!TYPE.equals(work.type())) throw new IllegalArgumentException("Unexpected work type");
        // 비운 표지('{}', 그 표지 전의 빈 문자열)만 '이미 접수됨' 이다. 그 밖의 payload 는 발송 번호가 있어야 한다 — 손상된 행을
        // 접수된 것으로 덮지 않는다.
        String payload = work.payload().strip();
        if (payload.isEmpty() || "{}".equals(payload)) return java.util.Optional.empty();
        return java.util.Optional.of(intent(work).dispatchId());
    }

    @Override public String type() { return TYPE; }

    @Override public int maximumConcurrentExecutions() { return 2; }

    @Override public void execute(DurableWork work) {
        Intent intent = intent(work);
        LocalDateTime queuedAt = LocalDateTime.parse(intent.queuedAt());
        repository.findById(intent.dispatchId()).filter(mail -> "Q".equals(mail.getDsptchRsltCd())
                && queuedAt.equals(mail.getDsptchDt())).ifPresent(mail -> {
            String address = CryptoUtil.decrypt(intent.encryptedRecipient());
            if (address == null || address.isBlank()) throw new IllegalStateException("Missing recipient");
            if (Thread.currentThread().isInterrupted()) throw new IllegalStateException("Mail delivery interrupted");
            try {
                processor.dispatchCommitted(mail.getEmlDsptchSn(), queuedAt, mail.getEmlTtl(), mail.getEmlCn(),
                        intent.from(), address, intent.senderEsntlId()).get();
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Mail delivery interrupted", interrupted);
            } catch (java.util.concurrent.ExecutionException failed) {
                if (failed.getCause() instanceof RuntimeException failure) throw failure;
                throw new IllegalStateException("Mail delivery failed", failed.getCause());
            }
        });
    }

    @Override public void onTerminal(DurableWork work, boolean succeeded) {
        if (!succeeded) {
            Intent intent = intent(work);
            // Submission/decryption exhausted before SMTP. P remains unknown, never falsely marked failed.
            repository.failQueued(intent.dispatchId(), LocalDateTime.parse(intent.queuedAt()));
        }
    }

    @Override public boolean discardPayloadOnCompletion() { return true; }
}
