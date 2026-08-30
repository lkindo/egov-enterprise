package nuri.migration.identity;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;

/** 소스 key tuple과 타깃 key tuple의 명시적 identity 계약. */
public record TargetIdentity(
        TargetIdentityPolicy policy,
        List<IdentityComponent> sourceComponents,
        List<IdentityComponent> targetComponents
) {
    public TargetIdentity {
        Objects.requireNonNull(policy, "policy");
        sourceComponents = List.copyOf(Objects.requireNonNull(sourceComponents, "sourceComponents"));
        targetComponents = List.copyOf(Objects.requireNonNull(targetComponents, "targetComponents"));
        if (sourceComponents.isEmpty()) {
            throw new IllegalArgumentException("source identity must not be empty");
        }
        if (targetComponents.isEmpty()) {
            throw new IllegalArgumentException("target identity must not be empty");
        }
        rejectDuplicateColumns(sourceComponents, "source");
        rejectDuplicateColumns(targetComponents, "target");
        if (policy == TargetIdentityPolicy.PRESERVE
                && sourceComponents.size() != targetComponents.size()) {
            throw new IllegalArgumentException("PRESERVE identity requires equal source and target arity");
        }
    }

    public boolean compositeSource() {
        return sourceComponents.size() > 1;
    }

    public boolean compositeTarget() {
        return targetComponents.size() > 1;
    }

    private static void rejectDuplicateColumns(List<IdentityComponent> components, String side) {
        HashSet<String> columns = new HashSet<>();
        for (IdentityComponent component : components) {
            if (!columns.add(component.column())) {
                throw new IllegalArgumentException(side + " identity contains duplicate column: "
                        + component.column());
            }
        }
    }
}
