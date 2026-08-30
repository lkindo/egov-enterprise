package nuri.migration.adapter;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

/** 대용량 row/LOB 읽기 전략의 capability 선언. 자동으로 cursor나 세션 옵션을 변경하지 않는다. */
public record DataStreamingStrategy(
        Set<StreamingModel> models,
        boolean lobStreaming,
        boolean transactionRequired,
        String mechanism,
        ExecutionPolicy executionPolicy,
        EvidenceLevel evidenceLevel) {

    public DataStreamingStrategy {
        Objects.requireNonNull(models, "models");
        models = models.isEmpty()
                ? Set.of()
                : Collections.unmodifiableSet(EnumSet.copyOf(models));
        if (mechanism == null || mechanism.isBlank()) {
            throw new IllegalArgumentException("mechanism must not be blank");
        }
        executionPolicy = Objects.requireNonNull(executionPolicy, "executionPolicy");
        evidenceLevel = Objects.requireNonNull(evidenceLevel, "evidenceLevel");
    }

    public static DataStreamingStrategy conservativeDefault(EvidenceLevel evidenceLevel) {
        return new DataStreamingStrategy(
                Set.of(StreamingModel.JDBC_FORWARD_ONLY),
                false,
                false,
                "driver-specific fetch and LOB behavior requires operator validation",
                ExecutionPolicy.MANUAL_ONLY,
                evidenceLevel);
    }

    public enum StreamingModel {
        JDBC_FORWARD_ONLY,
        SERVER_SIDE_CURSOR,
        KEYSET_PAGINATION,
        ADAPTIVE_BUFFERING
    }
}
