package nuri.migration;

/** 승인형 migration workflow의 유일한 CLI 단계. */
public enum WorkflowCommand {
    DISCOVER,
    PLAN,
    VALIDATE,
    LOAD
}
