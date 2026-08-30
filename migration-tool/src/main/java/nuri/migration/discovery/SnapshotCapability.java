package nuri.migration.discovery;

import java.util.Objects;

/** DB가 제공하는 일관 snapshot 능력이다. 실제 snapshot을 열었다는 실행 증거와는 구분한다. */
public record SnapshotCapability(
        boolean transactionConsistent,
        boolean crossConnectionShareable,
        String mechanism) {

    public SnapshotCapability {
        mechanism = Objects.requireNonNullElse(mechanism, "unknown");
    }

    public static SnapshotCapability unknown() {
        return new SnapshotCapability(false, false, "unknown");
    }
}
