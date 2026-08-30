package nuri.migration.adapter;

/** 실제 DB 검증 수준. query 정의 존재만으로 VERIFIED가 되지 않는다. */
public enum EvidenceLevel {
    VERIFIED,
    EXPERIMENTAL,
    UNVERIFIED
}
