package nuri.migration.discovery;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ObjectKindCoverageTest {

    @Test
    void modelsSecurityProgrammabilityAndVendorExtensionObjectsWithoutUnknownBuckets() {
        assertThat(ObjectKind.values()).contains(
                ObjectKind.FUNCTION,
                ObjectKind.PROCEDURE,
                ObjectKind.PACKAGE,
                ObjectKind.PACKAGE_BODY,
                ObjectKind.DOMAIN,
                ObjectKind.ENUM,
                ObjectKind.DATABASE_LINK,
                ObjectKind.EXTENSION,
                ObjectKind.POLICY,
                ObjectKind.ROLE,
                ObjectKind.USER,
                ObjectKind.TABLESPACE,
                ObjectKind.COLLATION,
                ObjectKind.CHARACTER_SET,
                ObjectKind.EVENT,
                ObjectKind.FOREIGN_DATA_WRAPPER,
                ObjectKind.FOREIGN_SERVER,
                ObjectKind.USER_MAPPING,
                ObjectKind.PUBLICATION,
                ObjectKind.SUBSCRIPTION);
    }
}
