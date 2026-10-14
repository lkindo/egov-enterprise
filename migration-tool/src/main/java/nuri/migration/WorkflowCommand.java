package nuri.migration;

/**
 * 승인형 migration workflow의 유일한 CLI 단계.
 *
 * <p>{@link #PROFILE}·{@link #APP_SCAN} 은 표준화 근거를 모으는 수집 명령이다(ADR-0029 L2a). 소스와 대상에 쓰지 않고,
 * 만든 산출물은 plan·load 의 승인 계보에 들어가지 않는다. {@link #TERM_SUGGEST} 는 그 근거와 대상 DB 의 표준 사전으로
 * 용어 후보를 만든다(ADR-0029 L2b) — 대상 DB 는 읽기만 하고, 후보는 원장 검토의 입력일 뿐이다.</p>
 */
public enum WorkflowCommand {
    DISCOVER,
    PROFILE,
    APP_SCAN,
    TERM_SUGGEST,
    PLAN,
    VALIDATE,
    LOAD
}
