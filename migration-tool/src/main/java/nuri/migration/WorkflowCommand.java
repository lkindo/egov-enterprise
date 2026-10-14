package nuri.migration;

/**
 * 승인형 migration workflow의 유일한 CLI 단계.
 *
 * <p>{@link #PROFILE}·{@link #APP_SCAN} 은 표준화 근거를 모으는 수집 명령이다(ADR-0029 L2a). 소스와 대상에 쓰지 않고,
 * 만든 산출물은 plan·load 의 승인 계보에 들어가지 않는다.</p>
 */
public enum WorkflowCommand {
    DISCOVER,
    PROFILE,
    APP_SCAN,
    PLAN,
    VALIDATE,
    LOAD
}
