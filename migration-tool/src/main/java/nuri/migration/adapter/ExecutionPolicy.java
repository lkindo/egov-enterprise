package nuri.migration.adapter;

/** snapshot/streaming 전략의 실행 권한. 현재 vendor 전략은 모두 수동 전용이다. */
public enum ExecutionPolicy {
    MANUAL_ONLY,
    ADAPTER_MANAGED
}
