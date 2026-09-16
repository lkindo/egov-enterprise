package nuri.api.config;

import java.nio.charset.StandardCharsets;
import nuri.business.security.authorization.PermissionCodes;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthorizationReviewedMigrationCatalogTest {
    private static final String REVIEWED = "7905bb657127d40bea2df619093b24316651b1957ac9e26a902c7bd171473276";

    private static String migration() throws Exception {
        try (var input = new ClassPathResource("db/migration/V2_99__seed_explicit_operation_grants.sql").getInputStream()) {
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    void usesTheImmutableExpansionReviewWhenRuntimeBindingsHaveChanged() throws Exception {
        assertThat(AuthorizationReviewedMigrationCatalog.version()).isEqualTo(REVIEWED);
        assertThat(AuthorizationReviewedMigrationCatalog.parseVersion(migration())).isEqualTo(REVIEWED);
        assertThat(PermissionCodes.CATALOG_VERSION).isNotEqualTo(REVIEWED);
    }

    @Test
    void rejectsMissingMixedInvalidAndDuplicateEvidence() throws Exception {
        String source = migration();
        for (String changed : java.util.List.of("", source.replaceFirst(REVIEWED, "a".repeat(64)),
                source.replace(REVIEWED, "not-a-catalog-version"),
                source.replace("legacy_policy:tb_role_info", "legacy_policy:tb_role_hierarchy"),
                source.replace("initial_operation_grant", "missing_operation_grant"))) {
            assertThatThrownBy(() -> AuthorizationReviewedMigrationCatalog.parseVersion(changed))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("Reviewed authorization migration catalog is invalid");
        }
    }

    @Test
    void commentsCannotSupplyMissingEvidenceAndUnclosedCommentsAreRejected() throws Exception {
        String source = migration();
        assertThat(AuthorizationReviewedMigrationCatalog.parseVersion(
                "/* nested /* comment */ ignored */\n" + source + "\n-- ignored SHA: " + "a".repeat(64)))
                .isEqualTo(REVIEWED);
        for (String changed : java.util.List.of("/*\n" + source + "\n*/", "/*\n" + source,
                source.replace("legacy_policy:tb_role_info", "missing_policy")
                        + "\n-- 'legacy_policy:tb_role_info'")) {
            assertThatThrownBy(() -> AuthorizationReviewedMigrationCatalog.parseVersion(changed))
                    .isInstanceOf(IllegalStateException.class);
        }
    }
}
