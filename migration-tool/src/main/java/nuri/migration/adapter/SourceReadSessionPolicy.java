package nuri.migration.adapter;

import java.sql.Connection;
import java.util.Objects;

/**
 * ETL이 하나의 source read transaction을 여는 데 필요한 명시적 adapter 계약이다.
 *
 * <p>이 계약은 snapshot을 자동으로 증명하지 않는다. 현재 지원 정책은 모두
 * operator freeze와 exact adapter 승인을 전제로 하는 {@link ExecutionPolicy#MANUAL_ONLY}다.</p>
 */
public record SourceReadSessionPolicy(
        IsolationMode isolationMode,
        boolean sourceFreezeRequired,
        boolean quotedIdentifiersSupported,
        boolean lobStreamingSupported,
        ExecutionPolicy executionPolicy,
        EvidenceLevel evidenceLevel,
        String mechanism
) {

    public SourceReadSessionPolicy {
        isolationMode = Objects.requireNonNull(isolationMode, "isolationMode");
        executionPolicy = Objects.requireNonNull(executionPolicy, "executionPolicy");
        evidenceLevel = Objects.requireNonNull(evidenceLevel, "evidenceLevel");
        if (mechanism == null || mechanism.isBlank()) {
            throw new IllegalArgumentException("source read session mechanism must not be blank");
        }
    }

    public static SourceReadSessionPolicy repeatableRead(
            EvidenceLevel evidenceLevel,
            String mechanism
    ) {
        return supported(IsolationMode.REPEATABLE_READ, evidenceLevel, mechanism);
    }

    public static SourceReadSessionPolicy operatorFrozenReadCommitted(
            EvidenceLevel evidenceLevel,
            String mechanism
    ) {
        return supported(IsolationMode.READ_COMMITTED, evidenceLevel, mechanism);
    }

    public static SourceReadSessionPolicy unsupported(
            EvidenceLevel evidenceLevel,
            String mechanism
    ) {
        return new SourceReadSessionPolicy(
                IsolationMode.UNSUPPORTED,
                true,
                false,
                false,
                ExecutionPolicy.MANUAL_ONLY,
                evidenceLevel,
                mechanism);
    }

    private static SourceReadSessionPolicy supported(
            IsolationMode isolationMode,
            EvidenceLevel evidenceLevel,
            String mechanism
    ) {
        return new SourceReadSessionPolicy(
                isolationMode,
                true,
                false,
                false,
                ExecutionPolicy.MANUAL_ONLY,
                evidenceLevel,
                mechanism);
    }

    public boolean supported() {
        return isolationMode != IsolationMode.UNSUPPORTED;
    }

    public int jdbcIsolation() {
        return switch (isolationMode) {
            case REPEATABLE_READ -> Connection.TRANSACTION_REPEATABLE_READ;
            case READ_COMMITTED -> Connection.TRANSACTION_READ_COMMITTED;
            case UNSUPPORTED -> throw new IllegalStateException(
                    "source read session isolation is unsupported");
        };
    }

    public enum IsolationMode {
        REPEATABLE_READ,
        READ_COMMITTED,
        UNSUPPORTED
    }
}
