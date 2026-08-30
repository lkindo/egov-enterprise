package nuri.migration.adapter;

import org.junit.jupiter.api.Test;
import nuri.migration.discovery.ObjectKind;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class VendorCatalogQueryContractTest {

    private static final Pattern FORBIDDEN_MUTATION = Pattern.compile(
            "\\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE|CALL|EXEC|GRANT|REVOKE)\\b",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern SENSITIVE_COLUMN = Pattern.compile(
            "\\b(PASSWORD|PASSWD|CREDENTIAL|AUTHENTICATION_STRING|SECRET|TOKEN)\\b",
            Pattern.CASE_INSENSITIVE);

    @Test
    void vendorDefinitionsAreParameterizedSingleStatementReadOnlyQueries() {
        List<SourceAdapter> adapters = List.of(
                new OracleSourceAdapter(),
                new TiberoSourceAdapter(),
                new MySqlSourceAdapter(),
                new MariaDbSourceAdapter(),
                new SqlServerSourceAdapter());

        for (SourceAdapter adapter : adapters) {
            assertThat(adapter.catalogQueries()).as(adapter.id()).isNotEmpty();
            for (VendorCatalogQuery query : adapter.catalogQueries()) {
                String normalized = query.sql().stripLeading().toUpperCase(Locale.ROOT);
                assertThat(normalized).as(query.operation()).satisfiesAnyOf(
                        sql -> assertThat(sql).startsWith("SELECT"),
                        sql -> assertThat(sql).startsWith("WITH"));
                assertThat(query.schemaParameterCount()).as(query.operation()).isGreaterThan(0);
                assertThat(count(query.sql(), '?')).as(query.operation())
                        .isGreaterThanOrEqualTo(query.schemaParameterCount());
                assertThat(query.sql()).as(query.operation()).doesNotContain(";");
                assertThat(FORBIDDEN_MUTATION.matcher(query.sql()).find()).as(query.operation()).isFalse();
                assertThat(SENSITIVE_COLUMN.matcher(query.sql()).find()).as(query.operation()).isFalse();
                assertThat(query.supportGrade()).as(query.operation())
                        .isNotEqualTo(ObjectSupportGrade.UNSUPPORTED);
                assertThat(adapter.capabilities().supportFor(query.kind())).as(query.operation())
                        .isNotEqualTo(ObjectSupportGrade.UNSUPPORTED);
            }
        }
    }

    @Test
    void unverifiedQueryDefinitionsCannotClaimExactAutomaticMigration() {
        for (SourceAdapter adapter : List.of(
                new OracleSourceAdapter(),
                new TiberoSourceAdapter(),
                new MySqlSourceAdapter(),
                new MariaDbSourceAdapter(),
                new SqlServerSourceAdapter())) {
            assertThat(adapter.identity().evidenceLevel()).isEqualTo(EvidenceLevel.UNVERIFIED);
            assertThat(adapter.catalogQueries())
                    .extracting(VendorCatalogQuery::supportGrade)
                    .doesNotContain(ObjectSupportGrade.EXACT);
        }
    }

    @Test
    void mysqlFamilyCheckConstraintIdentityIncludesItsOwningTable() {
        for (SourceAdapter adapter : List.of(new MySqlSourceAdapter(), new MariaDbSourceAdapter())) {
            VendorCatalogQuery query = adapter.catalogQueries().stream()
                    .filter(candidate -> candidate.kind() == ObjectKind.CHECK_CONSTRAINT)
                    .findFirst()
                    .orElseThrow();

            assertThat(query.sql()).as(query.operation()).contains("TABLE_CONSTRAINTS", "TABLE_NAME");
            assertThat(query.projection().identityColumns()).as(query.operation()).contains("TABLE_NAME");
            assertThat(query.projection().dependency().present()).as(query.operation()).isTrue();
            assertThat(query.projection().dependency().kind()).as(query.operation())
                    .isEqualTo(ObjectKind.TABLE);
        }
    }

    private static int count(String value, char expected) {
        int count = 0;
        for (int index = 0; index < value.length(); index++) {
            if (value.charAt(index) == expected) {
                count++;
            }
        }
        return count;
    }
}
