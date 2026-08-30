package nuri.migration.plan;

import nuri.migration.discovery.ObjectKind;

import java.util.Objects;

/** JSON artifact에 기록되는 객체별 계획. 원본 DDL과 접속정보는 포함하지 않는다. */
public record MigrationObjectPlan(
        String sourceObjectId,
        ObjectKind objectKind,
        String sourceQualifiedName,
        ObjectDisposition disposition,
        String targetObject,
        boolean reviewed,
        boolean automatic,
        boolean dataMappingPresent,
        String rationale) {

    public MigrationObjectPlan {
        sourceObjectId = requireText(sourceObjectId, "sourceObjectId");
        objectKind = Objects.requireNonNull(objectKind, "objectKind");
        sourceQualifiedName = requireText(sourceQualifiedName, "sourceQualifiedName");
        targetObject = blankToNull(targetObject);
        rationale = blankToNull(rationale);
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
