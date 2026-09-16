package nuri.api.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthorizationReviewedMigrationCatalogTest {
    private static final String REVIEWED = "1".repeat(64);

    /** Parser fixtures must also run in reusable artifacts containing only a V1 baseline. */
    private static String migration() {
        return """
                INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,chg_artcl_nm)
                SELECT 'migration:2.99','REVIEWED','GROUP_GRANT','MIGRATE','initial_operation_grant';
                INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,chg_artcl_nm)
                SELECT 'migration:2.99','REVIEWED','GROUP','MIGRATE','legacy_policy:tb_role_info';
                INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,chg_artcl_nm)
                SELECT 'migration:2.99','REVIEWED','GROUP','MIGRATE','legacy_policy:tb_authrt_role_map';
                INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,chg_artcl_nm)
                SELECT 'migration:2.99','REVIEWED','GROUP','MIGRATE','legacy_policy:tb_role_prgrm_map';
                INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,chg_artcl_nm)
                SELECT 'migration:2.99','REVIEWED','GROUP','MIGRATE','legacy_policy:tb_role_hierarchy';
                INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,chg_artcl_nm)
                SELECT 'migration:2.99','REVIEWED','GROUP','MIGRATE','legacy_policy:program_url';
                """.replace("REVIEWED", REVIEWED);
    }

    @Test
    void parsesConsistentReviewWithEitherLineEnding() {
        assertThat(AuthorizationReviewedMigrationCatalog.parseVersion(migration())).isEqualTo(REVIEWED);
        assertThat(AuthorizationReviewedMigrationCatalog.parseVersion(migration().replace("\n", "\r\n")))
                .isEqualTo(REVIEWED);
    }

    @Test
    void rejectsMissingMixedInvalidAndDuplicateEvidence() {
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
    void commentsCannotSupplyMissingEvidenceAndUnclosedCommentsAreRejected() {
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
