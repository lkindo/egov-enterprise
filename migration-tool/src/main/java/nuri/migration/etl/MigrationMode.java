package nuri.migration.etl;

/** 이관 실행 모드. {@code DRY_RUN}: 변환·카운트만(쓰기 없음). {@code COMMIT}: 타깃 적재. */
public enum MigrationMode {
    DRY_RUN,
    COMMIT;

    /** CLI 입력을 묵시적으로 dry-run으로 낮추지 않고 정확히 해석한다. */
    public static MigrationMode parse(String value) {
        if ("dry-run".equalsIgnoreCase(value)) {
            return DRY_RUN;
        }
        if ("commit".equalsIgnoreCase(value)) {
            return COMMIT;
        }
        throw new IllegalArgumentException("지원하지 않는 이관 모드 '" + value + "' — dry-run|commit 중 하나여야 합니다.");
    }
}
