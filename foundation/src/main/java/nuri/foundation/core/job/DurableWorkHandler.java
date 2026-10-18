package nuri.foundation.core.job;

/** Delivery can repeat after a crash. Implementations must use the stable work key idempotently. */
public interface DurableWorkHandler {
    String type();
    void execute(DurableWork work);

    /** Positive per-dispatcher limit; long deliveries must leave capacity for other work types. */
    default int maximumConcurrentExecutions() { return Integer.MAX_VALUE; }

    /** Called in the terminal state transaction, after the current attempt is fenced. No external I/O. */
    default void onTerminal(DurableWork work, boolean succeeded) {}

    /** Sensitive snapshots are retained only while delivery can still be resumed. */
    default boolean discardPayloadOnCompletion() { return false; }
}
