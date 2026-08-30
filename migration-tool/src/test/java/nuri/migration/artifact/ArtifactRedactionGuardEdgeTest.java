package nuri.migration.artifact;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ArtifactRedactionGuardEdgeTest {

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void acceptsNullScalarsNestedArraysAndSecurityWordsThatAreNotCredentials() throws Exception {
        assertThatCode(() -> ArtifactRedactionGuard.assertSafe(null)).doesNotThrowAnyException();
        assertThatCode(() -> ArtifactRedactionGuard.assertSafe(json.readTree("null")))
                .doesNotThrowAnyException();
        assertThatCode(() -> ArtifactRedactionGuard.assertSafe(json.readTree("""
                {
                  "safe": [null, true, 42, {"description": "tokenization uses a parser"}],
                  "endpointHint": "host and port are supplied at runtime",
                  "rationale": "password policy is target-owned"
                }
                """))).doesNotThrowAnyException();
    }

    @Test
    void normalizedCredentialKeysAreRejectedAtAnyNestedArrayPath() throws Exception {
        String[] keys = {
                "Password", "pass-word", "db_passwd_hint", "admin-pwd",
                "credential_value", "private_key_pem", "oauth-client-secret",
                "cloud_access-key", "User_Name", "JDBC-URL", "url"
        };
        for (String key : keys) {
            assertThatThrownBy(() -> ArtifactRedactionGuard.assertSafe(json.readTree(
                    "{\"outer\":[{\"" + key + "\":\"redacted\"}]}")))
                    .as(key)
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("$.outer[0]." + key)
                    .hasMessageNotContaining("redacted");
        }
    }

    @Test
    void textualJdbcPrivateKeysAssignmentsAndUriCredentialsAreRejectedWithoutEchoingValues()
            throws Exception {
        String[] sensitiveValues = {
                "jdbc:postgresql://private-host/db",
                privateKeyBoundary(""),
                privateKeyBoundary("RSA "),
                privateKeyBoundary("EC "),
                privateKeyBoundary("OPENSSH "),
                "password=private-value", "passwd:private-value", "pwd = private-value",
                "secret=private-value", "token:private-value", "credential=private-value",
                "https://private-user:private-password@private-host/path"
        };
        for (String value : sensitiveValues) {
            assertThatThrownBy(() -> ArtifactRedactionGuard.assertSafe(
                    json.readTree(json.writeValueAsString(value))))
                    .as(value)
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("$")
                    .hasMessageNotContaining("private-value")
                    .hasMessageNotContaining("private-host")
                    .hasMessageNotContaining("private-material");
        }
    }

    private static String privateKeyBoundary(String keyType) {
        return "-----BEGIN " + keyType + "PRIVATE KEY----- private-material";
    }
}
