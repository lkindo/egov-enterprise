package nuri.migration.etl;

/** 이관 실행 모드. {@code DRY_RUN}: 변환·카운트만(쓰기 없음). {@code COMMIT}: 타깃 적재. */
public enum MigrationMode {
    DRY_RUN,
    COMMIT
}
