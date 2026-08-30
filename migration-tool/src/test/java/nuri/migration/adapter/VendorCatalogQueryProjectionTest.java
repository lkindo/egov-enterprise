package nuri.migration.adapter;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

class VendorCatalogQueryProjectionTest {

    @Test
    void everyExecutableQueryDeclaresItsResultShapeWithoutResultSetHeuristics() {
        for (SourceAdapter adapter : vendorAdapters()) {
            for (VendorCatalogQuery query : adapter.catalogQueries()) {
                VendorRowProjection projection = query.projection();
                assertThat(projection.catalog()).as(query.operation()).isNotNull();
                assertThat(projection.schema()).as(query.operation()).isNotNull();
                assertThat(projection.name()).as(query.operation()).isNotNull();
                assertThat(projection.identityColumns()).as(query.operation()).isNotEmpty();
                assertThat(projection.definition()).as(query.operation()).isNotNull();
                assertThat(projection.attributes()).as(query.operation()).isNotNull();
                assertThat(projection.definition().mode()).as(query.operation())
                        .isIn(DefinitionCaptureMode.NONE, DefinitionCaptureMode.HASH_ONLY);

                String upperSql = query.sql().toUpperCase(Locale.ROOT);
                projection.requiredResultLabels().forEach(label ->
                        assertThat(upperSql).as(query.operation() + " -> " + label)
                                .contains(label.toUpperCase(Locale.ROOT)));
            }
        }
    }

    @Test
    void sensitiveIdentityCanBeHashedButCanNeverBecomeAPlainNameOrAttribute() {
        for (SourceAdapter adapter : vendorAdapters()) {
            for (VendorCatalogQuery query : adapter.catalogQueries()) {
                VendorRowProjection projection = query.projection();
                assertThat(projection.attributes().values()).as(query.operation())
                        .noneMatch(projection.sensitiveIdentityColumns()::contains);
                if (projection.sensitiveIdentityColumns().contains(projection.name().column())) {
                    assertThat(projection.redactName()).as(query.operation()).isTrue();
                }
            }
        }

        assertThat(new OracleSourceAdapter().catalogQueries())
                .filteredOn(query -> query.kind() == nuri.migration.discovery.ObjectKind.DATABASE_LINK)
                .allSatisfy(query -> assertThat(query.sql().toUpperCase(Locale.ROOT))
                        .doesNotContain("USERNAME", "PASSWORD", "HOST"));
    }

    private static List<SourceAdapter> vendorAdapters() {
        return List.of(
                new OracleSourceAdapter(),
                new TiberoSourceAdapter(),
                new MySqlSourceAdapter(),
                new MariaDbSourceAdapter(),
                new SqlServerSourceAdapter());
    }
}
