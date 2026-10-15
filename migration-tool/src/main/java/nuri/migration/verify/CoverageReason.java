package nuri.migration.verify;

/**
 * [ADR-0029 L4 D2] 대사가 판정하지 않은(NOT_COVERED) 이유의 고정 어휘. 표 상태를 바꾸지 않고 증거에 남아 컷오버 전에
 * 업무 소유자가 확인·서명한다. 값은 담지 않는다.
 */
public enum CoverageReason {
    /** 상수 컬럼 — 원천 집계가 없다. */
    CONST,
    /** fkRef 로 다시 쓴 키 — 원천 값과 대상 값이 다르다. */
    FKREF,
    /** 온라인 암호문으로 쓴 컬럼. */
    ENCRYPTED,
    /** 조회 조인으로 읽은 컬럼. */
    LOOKUP,
    /** 생성 키(idStrategy·identity 대상 컬럼). */
    GENERATED,
    /** LOB·이진 원천 컬럼. */
    LOB,
    /** 내장·표준 도메인이 아닌 변환기 — NULL 보존을 가정하지 못한다. */
    CUSTOM_TRANSFORM,
    /** 부동소수 원천 — 합·최소·최대가 정확하지 않다. */
    FLOAT,
    /** 문자 직접 컬럼의 길이 대사는 미룬다. */
    TEXT_DEFERRED,
    /** 대사가 다루지 않는 원천 타입(XML·배열·구조 등). */
    UNSUPPORTED_SOURCE_TYPE,
    /** 집계·비교에 쓸 수 없는 값 종류(부동소수·벤더 시간 객체 등). */
    UNSUPPORTED_VALUE_TYPE,
    /** inventory 에서 원천 컬럼 타입을 찾지 못했다. */
    SOURCE_TYPE_UNKNOWN,
    /** 원천 합·최소·최대 문장이 실패해 COUNT 전용으로 물러났다. */
    SOURCE_AGGREGATE_FAILED,
    /** codemap 결과를 비문자 type 으로 바꿔 분포를 같은 표기로 비교하지 못한다. */
    CODE_TYPED,
    /** 코드 종류가 상한(1000)을 넘었다. */
    CODE_DISTINCT_OVERFLOW,
    /** 대상 컬럼에 표준 용어가 없다(U1). */
    NON_STANDARD_TARGET,
    /** 대상 재조회 패스가 중간에 멈췄다. */
    TARGET_PASS_INCOMPLETE,
    /** 대상이 키를 만드는 표(TARGET_GENERATED) — 표본 키를 미리 알 수 없다. */
    GENERATED_IDENTITY,
    /** 판정할 행이 없다. */
    NO_ROWS,
    /** 격리한 행의 대상 키를 알지 못한다. */
    ISOLATED_KEY_UNKNOWN,
    /** 격리한 행이 있는 표의 PK 가 두 컬럼 이상이라 후보를 세지 않았다. */
    COMPOSITE_KEY,
    /** 후보 참조 질의가 실패했다. */
    CANDIDATE_QUERY_FAILED,
    /** 물리 제약 스냅숏을 읽지 못했다. */
    CONSTRAINTS_UNREAD
}
