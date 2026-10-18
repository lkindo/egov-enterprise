package nuri.business.service.sms;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import lombok.RequiredArgsConstructor;
import nuri.business.domain.sms.SmsRepository;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.job.DurableWorkHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** Recovers committed batches; recipient claims prevent another POST after an unknown outcome. */
@Component
@RequiredArgsConstructor
public class SmsDeliveryWorkHandler implements DurableWorkHandler {
    public static final String TYPE = "SMS_DELIVERY";
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private final SmsRepository repository;
    private final SmsAsyncProcessor processor;

    record Intent(long transmissionId, String senderEsntlId) {}

    static DurableWork work(long transmissionId, String senderEsntlId) {
        UUID key = UUID.nameUUIDFromBytes((TYPE + ":" + transmissionId).getBytes(StandardCharsets.UTF_8));
        return new DurableWork(key, TYPE, JSON.writeValueAsString(new Intent(transmissionId, senderEsntlId)));
    }

    @Override public String type() { return TYPE; }

    @Override public int maximumConcurrentExecutions() { return 1; }

    @Override public void execute(DurableWork work) {
        if (!TYPE.equals(work.type())) throw new IllegalArgumentException("Unexpected work type");
        Intent intent = JSON.readValue(work.payload(), Intent.class);
        // Explicit deletion is authoritative. Never reconstruct a deleted batch from queue data.
        repository.findById(intent.transmissionId()).ifPresent(sms ->
                await(processor.dispatchCommitted(sms.getSmsTrsmSn(), sms.getSndngTelno(), sms.getSndngCn(),
                        intent.senderEsntlId())));
    }

    private static void await(java.util.concurrent.CompletableFuture<Void> delivery) {
        try {
            delivery.get();
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("SMS delivery wait interrupted", interrupted);
        } catch (ExecutionException failed) {
            throw new IllegalStateException("SMS delivery worker failed", failed.getCause());
        }
    }
}
