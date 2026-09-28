package nuri.foundation.core.job;

/** Delivery can repeat after a crash. Implementations must use the stable work key idempotently. */
public interface DurableWorkHandler {
    String type();
    void execute(DurableWork work);
}
