package nuri.migration.adapter;

/** 한 ObjectKind가 discovery를 종료하는 단 하나의 경로다. */
public enum DiscoveryTerminalRoute {
    /** 같은 ObjectKind의 CatalogObject를 만들 수 있는 실행 가능한 collector/query 경로다. */
    OBJECTS,
    /** 일부 객체를 만들거나 상태만 probe하지만 범위 불완전성을 blocking PARTIAL로 명시한다. */
    PARTIAL_PROBE,
    /** 해당 vendor에 그 객체 종류 자체가 없음을 명시적으로 보존한다. */
    NOT_APPLICABLE,
    /** 완전한 읽기 경로가 없어 blocking UNSUPPORTED finding으로 종료한다. */
    UNSUPPORTED
}
