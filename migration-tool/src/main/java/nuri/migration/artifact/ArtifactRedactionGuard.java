package nuri.migration.artifact;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/** 접속정보나 credential이 영속 artifact로 새는 것을 직렬화 경계에서 차단한다. */
public final class ArtifactRedactionGuard {

    private static final Set<String> SENSITIVE_KEYS = Set.of(
            "password", "passwd", "pwd", "secret", "token", "credential",
            "credentials", "privatekey", "accesskey", "clientsecret", "username",
            "jdbcurl", "databaseurl", "connectionurl", "sourceurl", "targeturl");
    private static final Pattern CREDENTIAL_ASSIGNMENT = Pattern.compile(
            "(?i)\\b(?:password|passwd|pwd|secret|token|credential)\\s*[:=]\\s*\\S+");
    private static final Pattern URI_CREDENTIAL = Pattern.compile(
            "(?i)[a-z][a-z0-9+.-]*://[^/\\s:@]+:[^@\\s/]+@");
    private static final String PRIVATE_KEY_BOUNDARY_PREFIX = "-----begin ";
    private static final String PRIVATE_KEY_BOUNDARY_SUFFIX = "private key-----";
    private static final Set<String> PRIVATE_KEY_BOUNDARIES = Set.of(
            PRIVATE_KEY_BOUNDARY_PREFIX + PRIVATE_KEY_BOUNDARY_SUFFIX,
            PRIVATE_KEY_BOUNDARY_PREFIX + "rsa " + PRIVATE_KEY_BOUNDARY_SUFFIX,
            PRIVATE_KEY_BOUNDARY_PREFIX + "ec " + PRIVATE_KEY_BOUNDARY_SUFFIX,
            PRIVATE_KEY_BOUNDARY_PREFIX + "openssh " + PRIVATE_KEY_BOUNDARY_SUFFIX);

    private ArtifactRedactionGuard() {}

    public static void assertSafe(JsonNode root) {
        inspect(root, "$");
    }

    /** 이 글자가 {@link #assertSafe} 에서 자격·접속정보로 걸리는지. 산출물에 싣기 전에 거르는 데 쓴다. */
    public static boolean isSensitiveText(String value) {
        return value != null && containsSensitiveValue(value);
    }

    /**
     * [ADR-0029 L2a] 수집 산출물(profile·app-scan)에 주민등록번호·전화번호·이메일 값이 남지 않았는지 키와 값 모두
     * 검사한다. 생성기가 거른 뒤의 마지막 경계다. inventory·plan 처럼 값이 실리지 않는 산출물에는 쓰지 않는다.
     */
    public static void assertNoPersonalValues(JsonNode root) {
        inspectPersonal(root, "$");
    }

    private static void inspectPersonal(JsonNode node, String path) {
        if (node == null || node.isNull()) {
            return;
        }
        if (node.isObject()) {
            for (Map.Entry<String, JsonNode> field : node.properties()) {
                if (!PersonalDataPatterns.find(field.getKey()).isEmpty()) {
                    throw personal(path);
                }
                inspectPersonal(field.getValue(), path + "." + field.getKey());
            }
            return;
        }
        if (node.isArray()) {
            for (int index = 0; index < node.size(); index++) {
                inspectPersonal(node.get(index), path + "[" + index + "]");
            }
            return;
        }
        if (node.isTextual() && !PersonalDataPatterns.find(node.textValue()).isEmpty()) {
            throw personal(path);
        }
    }

    private static IllegalArgumentException personal(String path) {
        return new IllegalArgumentException("개인정보로 보이는 값은 수집 산출물에 기록할 수 없습니다: " + path);
    }

    private static void inspect(JsonNode node, String path) {
        if (node == null || node.isNull()) {
            return;
        }
        if (node.isObject()) {
            for (Map.Entry<String, JsonNode> field : node.properties()) {
                String normalized = normalizeKey(field.getKey());
                if (isSensitiveKey(normalized)) {
                    throw sensitive(path + "." + field.getKey());
                }
                inspect(field.getValue(), path + "." + field.getKey());
            }
            return;
        }
        if (node.isArray()) {
            for (int index = 0; index < node.size(); index++) {
                inspect(node.get(index), path + "[" + index + "]");
            }
            return;
        }
        if (node.isTextual() && containsSensitiveValue(node.textValue())) {
            throw sensitive(path);
        }
    }

    private static boolean containsSensitiveValue(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        return lower.contains("jdbc:")
                || PRIVATE_KEY_BOUNDARIES.stream().anyMatch(lower::contains)
                || CREDENTIAL_ASSIGNMENT.matcher(value).find()
                || URI_CREDENTIAL.matcher(value).find();
    }

    private static String normalizeKey(String key) {
        return key.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private static boolean isSensitiveKey(String normalized) {
        if (SENSITIVE_KEYS.contains(normalized) || "url".equals(normalized)) {
            return true;
        }
        return normalized.contains("password")
                || normalized.contains("passwd")
                || normalized.endsWith("pwd")
                || normalized.contains("credential")
                || normalized.contains("privatekey")
                || normalized.contains("clientsecret")
                || normalized.contains("accesskey");
    }

    private static IllegalArgumentException sensitive(String path) {
        return new IllegalArgumentException("민감 접속정보/credential은 artifact에 기록할 수 없습니다: " + path);
    }
}
