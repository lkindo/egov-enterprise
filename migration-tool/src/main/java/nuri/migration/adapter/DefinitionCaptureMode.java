package nuri.migration.adapter;

/** Vendor catalog 정의 원문의 inventory 처리 방식. RAW 저장은 의도적으로 존재하지 않는다. */
public enum DefinitionCaptureMode {
    NONE,
    HASH_ONLY
}
