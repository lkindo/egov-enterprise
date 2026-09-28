package nuri.foundation.core.job;

/** Enqueue in the caller's business transaction; persistence failure must roll it back. */
public interface DurableWorkPort {
    void enqueue(DurableWork work);

    /**
     * Serializes one intent key in the caller's transaction. The factory runs only for a new key;
     * its database writes and the resulting intent commit or roll back together. Existing work is
     * returned without recreating its target. Callers must check any request fingerprint they store.
     */
    DurableWork enqueueOnce(java.util.UUID key, String type, java.util.function.Supplier<String> payloadFactory);
}
