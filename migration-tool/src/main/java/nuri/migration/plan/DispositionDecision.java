package nuri.migration.plan;

import java.util.Objects;

/** 검토자가 객체 하나에 부여한 disposition 결정. */
public record DispositionDecision(
        ObjectDisposition disposition,
        String targetObject,
        boolean reviewed,
        String rationale) {

    public DispositionDecision {
        disposition = Objects.requireNonNull(disposition, "disposition");
        targetObject = blankToNull(targetObject);
        rationale = blankToNull(rationale);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
