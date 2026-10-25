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

    /**
     * A committed mutation that carries the operator's case reference (complaint or incident number).
     * The reference must match {@code [A-Za-z0-9][A-Za-z0-9._-]{0,199}}; free-text reasons never enter the ledger.
     * Must join the caller's transaction.
     */
    void recordReferencedMutation(String operation, String targetId, String reference);
    void recordMfaRecovery(String targetId, String verificationReference);
}
