package nuri.migration.plan;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/** 실행과 commit 준비 여부 및 이를 막는 결정적 이유 목록. */
public record PlanReadiness(
        boolean executable,
        boolean commitReady,
        List<String> blockers) {

    public PlanReadiness {
        blockers = Objects.requireNonNull(blockers, "blockers").stream()
                .map(blocker -> Objects.requireNonNull(blocker, "blocker"))
                .distinct()
                .sorted(Comparator.naturalOrder())
                .toList();
        boolean expectedReady = blockers.isEmpty();
        if (executable != expectedReady || commitReady != expectedReady) {
            throw new IllegalArgumentException(
                    "executable/commitReady must be derived from an empty blocker list");
        }
    }
}
