package nuri.migration.adapter;

import nuri.migration.discovery.ObjectKind;
import org.junit.jupiter.api.Test;

import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class PostgreSqlCatalogQueriesTest {

    @Test
    void enrichersAreReadOnlyParameterizedCatalogQueriesAndCoverPostgresSpecificKinds() {
        assertThat(PostgreSqlCatalogQueries.queries()).isNotEmpty();
        assertThat(PostgreSqlCatalogQueries.queries())
                .allSatisfy(query -> {
                    String sql = query.sql().stripLeading().toLowerCase(Locale.ROOT);
                    assertThat(sql).startsWith("select");
                    assertThat(sql).doesNotContain("insert ", "update ", "delete ", "drop ", "alter ", "create ");
                    assertThat(query.schemaParameterCount()).isGreaterThanOrEqualTo(0);
                });
        assertThat(PostgreSqlCatalogQueries.queries())
                .extracting(PostgreSqlCatalogQueries.Query::kind)
                .contains(
                        ObjectKind.PARTITION,
                        ObjectKind.CHECK_CONSTRAINT,
                        ObjectKind.SEQUENCE,
                        ObjectKind.IDENTITY,
                        ObjectKind.MATERIALIZED_VIEW,
                        ObjectKind.ROUTINE,
                        ObjectKind.FUNCTION,
                        ObjectKind.PROCEDURE,
                        ObjectKind.TRIGGER,
                        ObjectKind.TYPE,
                        ObjectKind.DOMAIN,
                        ObjectKind.ENUM,
                        ObjectKind.COLLATION,
                        ObjectKind.EXTENSION,
                        ObjectKind.POLICY,
                        ObjectKind.COMMENT,
                        ObjectKind.GRANT,
                        ObjectKind.EXTERNAL_OBJECT);
    }

    @Test
    void exactPostgresTaxonomyDoesNotFoldFunctionsProceduresDomainsOrEnums() {
        Map<ObjectKind, PostgreSqlCatalogQueries.Query> queriesByKind = PostgreSqlCatalogQueries.queries().stream()
                .collect(Collectors.toMap(PostgreSqlCatalogQueries.Query::kind, Function.identity()));

        assertThat(queriesByKind).containsKeys(
                ObjectKind.FUNCTION,
                ObjectKind.PROCEDURE,
                ObjectKind.TYPE,
                ObjectKind.DOMAIN,
                ObjectKind.ENUM);
        assertThat(queriesByKind.get(ObjectKind.ROUTINE).sql())
                .contains("p.prokind IN ('a', 'w')")
                .doesNotContain("p.prokind = 'f'", "p.prokind = 'p'");
        assertThat(queriesByKind.get(ObjectKind.FUNCTION).sql())
                .contains("p.prokind = 'f'")
                .doesNotContain("p.prokind = 'a'", "p.prokind = 'w'");
        assertThat(queriesByKind.get(ObjectKind.PROCEDURE).sql()).contains("p.prokind = 'p'");
        assertThat(queriesByKind.get(ObjectKind.TYPE).sql())
                .contains(
                        "t.typtype NOT IN ('d', 'e')",
                        "type_relation.relkind = 'c'",
                        "t.typcategory <> 'A'");
        assertThat(queriesByKind.get(ObjectKind.DOMAIN).sql()).contains("t.typtype = 'd'");
        assertThat(queriesByKind.get(ObjectKind.ENUM).sql()).contains("t.typtype = 'e'");
    }

    @Test
    void userOnlyCatalogSqlExcludesEveryPostgresSystemNamespaceFamily() {
        assertThat(PostgreSqlCatalogQueries.queries())
                .filteredOn(query -> !query.global())
                .allSatisfy(query -> assertThat(query.sql())
                .as(query.operation())
                .contains(
                        "n.nspname <> 'pg_catalog'",
                        "n.nspname <> 'information_schema'",
                        "LEFT(n.nspname, 8) <> 'pg_toast'",
                        "LEFT(n.nspname, 7) <> 'pg_temp'")
                .doesNotContain(
                        "n.nspname NOT LIKE 'pg_toast%'",
                        "n.nspname NOT LIKE 'pg_temp%'"));
    }

    @Test
    void subscriptionCensusIsRestrictedToTheCurrentDatabaseOid() {
        PostgreSqlCatalogQueries.Query subscription = PostgreSqlCatalogQueries.queries().stream()
                .filter(query -> query.kind() == ObjectKind.SUBSCRIPTION)
                .findFirst()
                .orElseThrow();

        assertThat(subscription.sql())
                .contains(
                        "s.subdbid = (SELECT d.oid",
                        "FROM pg_catalog.pg_database d",
                        "d.datname = pg_catalog.current_database()")
                .doesNotContain("subconninfo");
    }

    @Test
    void globalCensusQueriesUseOnlyCurrentDatabaseGuardAndProjectNoConnectionSecretsOrOptions() {
        Set<ObjectKind> globalKinds = Set.of(
                ObjectKind.ROLE,
                ObjectKind.USER,
                ObjectKind.TABLESPACE,
                ObjectKind.FOREIGN_DATA_WRAPPER,
                ObjectKind.FOREIGN_SERVER,
                ObjectKind.USER_MAPPING,
                ObjectKind.PUBLICATION,
                ObjectKind.SUBSCRIPTION);
        Map<ObjectKind, PostgreSqlCatalogQueries.Query> queriesByKind =
                PostgreSqlCatalogQueries.queries().stream()
                        .collect(Collectors.toMap(
                                PostgreSqlCatalogQueries.Query::kind,
                                Function.identity()));

        assertThat(queriesByKind.keySet()).containsAll(globalKinds);
        assertThat(globalKinds).allSatisfy(kind -> {
            PostgreSqlCatalogQueries.Query query = queriesByKind.get(kind);
            assertThat(query.global()).as(kind.name()).isTrue();
            assertThat(query.schemaParameterCount()).as(kind.name()).isOne();
            assertThat(query.sql().toLowerCase(Locale.ROOT))
                    .as(kind.name())
                    .startsWith("select")
                    .contains(
                            "object_catalog",
                            "object_schema",
                            "object_name",
                            "native_definition",
                            "dependency_schema",
                            "dependency_name",
                            "detail",
                            "current_database() = coalesce(?, current_database())")
                    .doesNotContain(
                            "select *",
                            "password",
                            "passwd",
                            "credential",
                            "secret",
                            "token",
                            "conninfo",
                            "options",
                            "umoptions",
                            "srvoptions",
                            "fdwoptions");
        });
    }

    @Test
    void identityCatalogDependsOnTheSameColumnIdentityAsJdbcMetadata() {
        PostgreSqlCatalogQueries.Query identity = PostgreSqlCatalogQueries.queries().stream()
                .filter(query -> query.kind() == ObjectKind.IDENTITY)
                .findFirst()
                .orElseThrow();

        assertThat(identity.dependencyKind()).isEqualTo(ObjectKind.COLUMN);
        assertThat(identity.sql())
                .contains("c.relname || '.' || a.attname AS dependency_name");
    }

    @Test
    void userOnlyGlobalSqlExcludesBuiltInRolesAndTablespacesButSystemModeCanIncludeThem() {
        Map<ObjectKind, PostgreSqlCatalogQueries.Query> queriesByKind =
                PostgreSqlCatalogQueries.queries().stream()
                        .collect(Collectors.toMap(
                                PostgreSqlCatalogQueries.Query::kind,
                                Function.identity()));

        for (ObjectKind kind : Set.of(ObjectKind.ROLE, ObjectKind.USER)) {
            assertThat(queriesByKind.get(kind).sql(false))
                    .contains("r.rolname NOT LIKE 'pg\\_%'");
            assertThat(queriesByKind.get(kind).sql(true))
                    .doesNotContain("r.rolname NOT LIKE 'pg\\_%'");
        }
        assertThat(queriesByKind.get(ObjectKind.TABLESPACE).sql(false))
                .contains("t.spcname NOT IN ('pg_default', 'pg_global')");
        assertThat(queriesByKind.get(ObjectKind.TABLESPACE).sql(true))
                .doesNotContain("t.spcname NOT IN ('pg_default', 'pg_global')");
    }

    @Test
    void grantProjectionKeepsRoleNamesOutOfStoredObjectNameAndIncludesCollisionParts() {
        PostgreSqlCatalogQueries.Query grant = PostgreSqlCatalogQueries.queries().stream()
                .filter(query -> query.kind() == ObjectKind.GRANT)
                .findFirst()
                .orElseThrow();

        assertThat(grant.sql())
                .contains("c.relname AS object_name")
                .contains("AS identity_detail", "acl.grantor", "acl.is_grantable")
                .doesNotContain("r.rolname, 'PUBLIC') || ':' || acl.privilege_type\n                               AS object_name");
    }
}
