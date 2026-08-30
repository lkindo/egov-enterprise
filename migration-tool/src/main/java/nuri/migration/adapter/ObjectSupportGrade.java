package nuri.migration.adapter;

/** 객체 종류별 자동화 가능 범위다. */
public enum ObjectSupportGrade {
    EXACT,
    TRANSFORMED,
    METADATA_ONLY,
    MANUAL,
    UNSUPPORTED
}
