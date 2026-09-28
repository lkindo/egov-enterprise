package nuri.foundation.core.audit;

/** Durable minimum audit boundary. No request body, credential, or response body belongs here. */
public interface SensitiveAuditPort {
    String REQUEST_ATTRIBUTE = "nuri.audit.sensitiveContext";

    record Context(String requestId, String operation, String actorLoginId, String actorEsntlId,
                   String clientIp, String description, String targetId) {}

    enum Outcome { ATTEMPTED, PREPARED, SUCCEEDED, DENIED, FAILED, INTERRUPTED, NOT_MODIFIED, COMMITTED }

    void attempted(Context context);
    void prepared(Context context);
    void completed(Context context, Outcome outcome, int httpStatus);

    /** Must join the caller's transaction: audit failure rolls back the sensitive mutation. */
    void recordMutation(String operation, String targetId);
    void recordMfaRecovery(String targetId, String verificationReference);
}
