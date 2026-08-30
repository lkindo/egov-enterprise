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

    private ArtifactRedactionGuard() {}

    public static void assertSafe(JsonNode root) {
        inspect(root, "$");
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
                || lower.contains("-----begin private key-----")
                || lower.contains("-----begin rsa private key-----")
                || lower.contains("-----begin ec private key-----")
                || lower.contains("-----begin openssh private key-----")
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
