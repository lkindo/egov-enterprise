package nuri.migration.discovery;

import java.sql.SQLException;
import java.sql.SQLFeatureNotSupportedException;
import java.sql.SQLInvalidAuthorizationSpecException;
import java.util.Objects;

/**
 * 객체가 없다는 결론을 내릴 수 없는 이유를 명시적으로 기록한다.
 *
 * <p>벤더 예외 원문은 접속 문자열이나 민감한 문맥을 포함할 수 있어 보존하지 않는다.
 * SQLState와 안전한 operation 이름만 산출물로 전달한다.</p>
 */
public record VisibilityFinding(
        VisibilityStatus status,
        ObjectKind objectKind,
        String catalog,
        String schema,
        String operation,
        String message,
        String sqlState) {

    public VisibilityFinding {
        status = Objects.requireNonNull(status, "status");
        objectKind = Objects.requireNonNull(objectKind, "objectKind");
        operation = requireText(operation, "operation");
        message = requireText(message, "message");
    }

    public static VisibilityFinding fromFailure(
            ObjectKind objectKind,
            String catalog,
            String schema,
            String operation,
            SQLException failure) {
        Objects.requireNonNull(failure, "failure");
        String state = failure.getSQLState();
        VisibilityStatus status;
        String safeMessage;
        if (failure instanceof SQLFeatureNotSupportedException) {
            status = VisibilityStatus.UNSUPPORTED;
            safeMessage = "metadata operation is not supported by this driver";
        } else if (failure instanceof SQLInvalidAuthorizationSpecException || isPermissionState(state)) {
            status = VisibilityStatus.UNREADABLE;
            safeMessage = "metadata is not visible to the source account";
        } else {
            status = VisibilityStatus.QUERY_FAILED;
            safeMessage = "metadata operation failed; vendor details were omitted";
        }
        return new VisibilityFinding(status, objectKind, catalog, schema, operation, safeMessage, state);
    }

    private static boolean isPermissionState(String state) {
        return "42501".equals(state) || (state != null && state.startsWith("28"));
    }

    private static String requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        return value;
    }
}
