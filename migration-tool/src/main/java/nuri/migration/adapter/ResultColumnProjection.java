package nuri.migration.adapter;

/** ResultSet label을 명시하거나, 해당 차원이 vendor query에 없음을 명시한다. */
public record ResultColumnProjection(boolean present, String column) {

    public ResultColumnProjection {
        if (present && (column == null || column.isBlank())) {
            throw new IllegalArgumentException("present result column must have a label");
        }
        if (!present && column != null) {
            throw new IllegalArgumentException("absent result column must not have a label");
        }
    }

    public static ResultColumnProjection column(String column) {
        return new ResultColumnProjection(true, column);
    }

    public static ResultColumnProjection absent() {
        return new ResultColumnProjection(false, null);
    }
}
