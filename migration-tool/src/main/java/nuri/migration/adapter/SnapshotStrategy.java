package nuri.migration.adapter;

import java.util.Objects;

/** 일관 source snapshot을 확보하는 방식에 대한 선언이며 실행 명령이 아니다. */
public record SnapshotStrategy(
        SnapshotModel model,
        boolean transactionConsistent,
        boolean crossConnectionShareable,
        String mechanism,
        ExecutionPolicy executionPolicy,
        EvidenceLevel evidenceLevel) {

    public SnapshotStrategy {
        model = Objects.requireNonNull(model, "model");
        if (mechanism == null || mechanism.isBlank()) {
            throw new IllegalArgumentException("mechanism must not be blank");
        }
        executionPolicy = Objects.requireNonNull(executionPolicy, "executionPolicy");
        evidenceLevel = Objects.requireNonNull(evidenceLevel, "evidenceLevel");
    }

    public static SnapshotStrategy conservativeDefault(EvidenceLevel evidenceLevel) {
        return new SnapshotStrategy(
                SnapshotModel.UNKNOWN,
                false,
                false,
                "operator must establish and prove a consistent snapshot",
                ExecutionPolicy.MANUAL_ONLY,
                evidenceLevel);
    }

    public enum SnapshotModel {
        UNKNOWN,
        MVCC_TRANSACTION,
        SYSTEM_CHANGE_NUMBER,
        DATABASE_SNAPSHOT_ISOLATION
    }
}
