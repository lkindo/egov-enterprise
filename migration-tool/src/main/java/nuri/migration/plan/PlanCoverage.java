package nuri.migration.plan;

/** discovery 객체가 plan에서 빠지지 않았는지 판단하는 fail-closed 집계다. */
public record PlanCoverage(
        int discovered,
        int unreadable,
        int unclassified,
        int automatic) {

    public PlanCoverage {
        requireNonNegative(discovered, "discovered");
        requireNonNegative(unreadable, "unreadable");
        requireNonNegative(unclassified, "unclassified");
        requireNonNegative(automatic, "automatic");
        if (unclassified > discovered) {
            throw new IllegalArgumentException("unclassified must not exceed discovered");
        }
        if (automatic > discovered) {
            throw new IllegalArgumentException("automatic must not exceed discovered");
        }
    }

    private static void requireNonNegative(int value, String field) {
        if (value < 0) {
            throw new IllegalArgumentException(field + " must not be negative");
        }
    }
}
