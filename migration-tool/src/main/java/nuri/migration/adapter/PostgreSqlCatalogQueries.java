package nuri.migration.adapter;

import nuri.migration.discovery.ObjectKind;

import java.util.List;
import java.util.Objects;

/** PostgreSQL adapter의 읽기 전용 {@code pg_catalog} 질의 목록. */
@SuppressWarnings("text-blocks")
public final class PostgreSqlCatalogQueries {

    private static final String USER_SCHEMA_FILTER = """
            (n.nspname <> 'pg_catalog'
             AND n.nspname <> 'information_schema'
             AND LEFT(n.nspname, 8) <> 'pg_toast'
             AND LEFT(n.nspname, 7) <> 'pg_temp')
            """.strip();
    private static final String SCHEMA_FILTER =
            "(? IS NULL OR n.nspname = ?) AND " + USER_SCHEMA_FILTER;
    private static final String USER_ROLE_FILTER =
            "r.rolname NOT LIKE 'pg\\_%' ESCAPE '\\'";
    private static final String USER_TABLESPACE_FILTER =
            "t.spcname NOT IN ('pg_default', 'pg_global')";
    private static final String GLOBAL_DATABASE_FILTER =
            "current_database() = COALESCE(?, current_database())";

    private static final List<Query> QUERIES = List.of(
            query(ObjectKind.PARTITION, "postgres-partitions", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           c.relname AS object_name,
                           pg_catalog.pg_get_expr(c.relpartbound, c.oid) AS native_definition,
                           pn.nspname AS dependency_schema,
                           p.relname AS dependency_name,
                           c.relkind::text AS detail
                      FROM pg_catalog.pg_class c
                      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                      JOIN pg_catalog.pg_inherits i ON i.inhrelid = c.oid
                      JOIN pg_catalog.pg_class p ON p.oid = i.inhparent
                      JOIN pg_catalog.pg_namespace pn ON pn.oid = p.relnamespace
                     WHERE c.relispartition
                       AND """ + SCHEMA_FILTER, ObjectKind.TABLE, false),
            query(ObjectKind.CHECK_CONSTRAINT, "postgres-check-constraints", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           con.conname AS object_name,
                           pg_catalog.pg_get_constraintdef(con.oid, true) AS native_definition,
                           n.nspname AS dependency_schema,
                           c.relname AS dependency_name,
                           con.convalidated::text AS detail
                      FROM pg_catalog.pg_constraint con
                      JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
                      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                     WHERE con.contype = 'c'
                       AND """ + SCHEMA_FILTER, ObjectKind.TABLE, false),
            query(ObjectKind.SEQUENCE, "postgres-sequences", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           c.relname AS object_name,
                           pg_catalog.format('start=%s increment=%s min=%s max=%s cache=%s cycle=%s',
                               s.seqstart, s.seqincrement, s.seqmin, s.seqmax, s.seqcache, s.seqcycle)
                               AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           pg_catalog.format_type(s.seqtypid, NULL) AS detail
                      FROM pg_catalog.pg_sequence s
                      JOIN pg_catalog.pg_class c ON c.oid = s.seqrelid
                      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                     WHERE """ + SCHEMA_FILTER, null, false),
            query(ObjectKind.IDENTITY, "postgres-identities", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           c.relname || '.' || a.attname AS object_name,
                           a.attidentity::text AS native_definition,
                           n.nspname AS dependency_schema,
                           c.relname || '.' || a.attname AS dependency_name,
                           a.attname AS detail
                      FROM pg_catalog.pg_attribute a
                      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
                      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                     WHERE a.attidentity IN ('a', 'd')
                       AND NOT a.attisdropped
                       AND """ + SCHEMA_FILTER, ObjectKind.COLUMN, false),
            query(ObjectKind.DEFAULT_CONSTRAINT, "postgres-defaults", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           c.relname || '.' || a.attname AS object_name,
                           pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS native_definition,
                           n.nspname AS dependency_schema,
                           c.relname || '.' || a.attname AS dependency_name,
                           a.attname AS detail
                      FROM pg_catalog.pg_attrdef d
                      JOIN pg_catalog.pg_class c ON c.oid = d.adrelid
                      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                      JOIN pg_catalog.pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
                     WHERE """ + SCHEMA_FILTER, ObjectKind.COLUMN, false),
            query(ObjectKind.VIEW, "postgres-views", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           c.relname AS object_name,
                           pg_catalog.pg_get_viewdef(c.oid, true) AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           c.relkind::text AS detail
                      FROM pg_catalog.pg_class c
                      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                     WHERE c.relkind = 'v'
                       AND """ + SCHEMA_FILTER, null, false),
            query(ObjectKind.MATERIALIZED_VIEW, "postgres-materialized-views", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           c.relname AS object_name,
                           pg_catalog.pg_get_viewdef(c.oid, true) AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           c.relispopulated::text AS detail
                      FROM pg_catalog.pg_class c
                      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                     WHERE c.relkind = 'm'
                       AND """ + SCHEMA_FILTER, null, false),
            query(ObjectKind.INDEX, "postgres-indexes", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           i.relname AS object_name,
                           pg_catalog.pg_get_indexdef(i.oid) AS native_definition,
                           n.nspname AS dependency_schema,
                           t.relname AS dependency_name,
                           x.indisunique::text AS detail
                      FROM pg_catalog.pg_index x
                      JOIN pg_catalog.pg_class i ON i.oid = x.indexrelid
                      JOIN pg_catalog.pg_class t ON t.oid = x.indrelid
                      JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
                     WHERE """ + SCHEMA_FILTER, ObjectKind.TABLE, false),
            query(ObjectKind.ROUTINE, "postgres-aggregate-window-routines", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')'
                               AS object_name,
                           NULL::text AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           p.prokind::text AS detail
                      FROM pg_catalog.pg_proc p
                      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
                     WHERE p.prokind IN ('a', 'w')
                       AND """ + SCHEMA_FILTER, null, false),
            query(ObjectKind.FUNCTION, "postgres-functions", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')'
                               AS object_name,
                           pg_catalog.pg_get_functiondef(p.oid) AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           p.prokind::text AS detail
                      FROM pg_catalog.pg_proc p
                      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
                     WHERE p.prokind = 'f'
                       AND """ + SCHEMA_FILTER, null, false),
            query(ObjectKind.PROCEDURE, "postgres-procedures", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')'
                               AS object_name,
                           pg_catalog.pg_get_functiondef(p.oid) AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           p.prokind::text AS detail
                      FROM pg_catalog.pg_proc p
                      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
                     WHERE p.prokind = 'p'
                       AND """ + SCHEMA_FILTER, null, false),
            query(ObjectKind.TRIGGER, "postgres-triggers", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           c.relname || '.' || t.tgname AS object_name,
                           pg_catalog.pg_get_triggerdef(t.oid, true) AS native_definition,
                           n.nspname AS dependency_schema,
                           c.relname AS dependency_name,
                           t.tgenabled::text AS detail
                      FROM pg_catalog.pg_trigger t
                      JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
                      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                     WHERE NOT t.tgisinternal
                       AND """ + SCHEMA_FILTER, ObjectKind.TABLE, false),
            query(ObjectKind.TYPE, "postgres-types", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           t.typname AS object_name,
                           pg_catalog.format_type(t.oid, NULL) AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           t.typtype::text AS detail
                      FROM pg_catalog.pg_type t
                      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                      LEFT JOIN pg_catalog.pg_class type_relation ON type_relation.oid = t.typrelid
                     WHERE t.typtype NOT IN ('d', 'e')
                       AND t.typcategory <> 'A'
                       AND (t.typtype <> 'c' OR type_relation.relkind = 'c')
                       AND """ + SCHEMA_FILTER, null, false),
            query(ObjectKind.DOMAIN, "postgres-domains", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           t.typname AS object_name,
                           pg_catalog.format_type(t.oid, NULL) AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           t.typtype::text AS detail
                      FROM pg_catalog.pg_type t
                      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                     WHERE t.typtype = 'd'
                       AND """ + SCHEMA_FILTER, null, false),
            query(ObjectKind.ENUM, "postgres-enums", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           t.typname AS object_name,
                           pg_catalog.format_type(t.oid, NULL) AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           t.typtype::text AS detail
                      FROM pg_catalog.pg_type t
                      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                     WHERE t.typtype = 'e'
                       AND """ + SCHEMA_FILTER, null, false),
            query(ObjectKind.COLLATION, "postgres-collations", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           co.collname AS object_name,
                           pg_catalog.format('collate=%s ctype=%s', co.collcollate, co.collctype)
                               AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           co.collprovider::text AS detail
                      FROM pg_catalog.pg_collation co
                      JOIN pg_catalog.pg_namespace n ON n.oid = co.collnamespace
                     WHERE """ + SCHEMA_FILTER, null, false),
            query(ObjectKind.EXTENSION, "postgres-extensions", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           e.extname AS object_name,
                           e.extversion::text AS native_definition,
                           n.nspname AS dependency_schema,
                           n.nspname AS dependency_name,
                           e.extrelocatable::text AS detail
                      FROM pg_catalog.pg_extension e
                      JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
                     WHERE """ + SCHEMA_FILTER, ObjectKind.SCHEMA, false),
            query(ObjectKind.POLICY, "postgres-policies", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           c.relname || '.' || p.polname AS object_name,
                           pg_catalog.concat_ws(' | ',
                               'using=' || COALESCE(pg_catalog.pg_get_expr(p.polqual, p.polrelid), ''),
                               'check=' || COALESCE(pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid), ''))
                               AS native_definition,
                           n.nspname AS dependency_schema,
                           c.relname AS dependency_name,
                           pg_catalog.format('command=%s permissive=%s', p.polcmd, p.polpermissive)
                               AS detail
                      FROM pg_catalog.pg_policy p
                      JOIN pg_catalog.pg_class c ON c.oid = p.polrelid
                      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                     WHERE """ + SCHEMA_FILTER, ObjectKind.TABLE, false),
            query(ObjectKind.COMMENT, "postgres-comments", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           c.relname AS object_name,
                           pg_catalog.obj_description(c.oid, 'pg_class') AS native_definition,
                           n.nspname AS dependency_schema,
                           c.relname AS dependency_name,
                           c.relkind::text AS detail
                      FROM pg_catalog.pg_class c
                      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                     WHERE pg_catalog.obj_description(c.oid, 'pg_class') IS NOT NULL
                       AND """ + SCHEMA_FILTER, ObjectKind.TABLE, false),
            query(ObjectKind.GRANT, "postgres-table-grants", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           c.relname AS object_name,
                           COALESCE(grantee.rolname, 'PUBLIC') || ':'
                               || COALESCE(grantor.rolname, 'UNKNOWN') || ':'
                               || acl.privilege_type || ':' || acl.is_grantable::text AS identity_detail,
                           NULL::text AS native_definition,
                           n.nspname AS dependency_schema,
                           c.relname AS dependency_name,
                           acl.privilege_type::text AS detail
                      FROM pg_catalog.pg_class c
                      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                      CROSS JOIN LATERAL pg_catalog.aclexplode(
                          COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) acl
                      LEFT JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
                      LEFT JOIN pg_catalog.pg_roles grantor ON grantor.oid = acl.grantor
                     WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
                       AND """ + SCHEMA_FILTER, ObjectKind.TABLE, false),
            query(ObjectKind.EXTERNAL_OBJECT, "postgres-foreign-tables", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           c.relname AS object_name,
                           s.srvname AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           s.srvname AS detail
                      FROM pg_catalog.pg_foreign_table f
                      JOIN pg_catalog.pg_class c ON c.oid = f.ftrelid
                      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                      JOIN pg_catalog.pg_foreign_server s ON s.oid = f.ftserver
                     WHERE """ + SCHEMA_FILTER, null, false),
            query(ObjectKind.JOB, "postgres-job-extension-probe", """
                    SELECT current_database() AS object_catalog,
                           n.nspname AS object_schema,
                           c.relname AS object_name,
                           NULL::text AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           'extension job catalog requires a dedicated adapter'::text AS detail
                      FROM pg_catalog.pg_class c
                      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                     WHERE ((n.nspname = 'cron' AND c.relname = 'job')
                         OR (n.nspname = 'pgagent' AND c.relname = 'pga_job'))
                       AND """ + SCHEMA_FILTER, null, true),
            globalQuery(ObjectKind.ROLE, "postgres-non-login-roles", """
                    SELECT current_database() AS object_catalog,
                           NULL::text AS object_schema,
                           r.rolname AS object_name,
                           NULL::text AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           pg_catalog.format('super=%s inherit=%s create_role=%s create_db=%s',
                               r.rolsuper, r.rolinherit, r.rolcreaterole, r.rolcreatedb) AS detail
                      FROM pg_catalog.pg_roles r
                     WHERE NOT r.rolcanlogin
                       AND """ + USER_ROLE_FILTER + " AND " + GLOBAL_DATABASE_FILTER, null),
            globalQuery(ObjectKind.USER, "postgres-login-roles", """
                    SELECT current_database() AS object_catalog,
                           NULL::text AS object_schema,
                           r.rolname AS object_name,
                           NULL::text AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           pg_catalog.format('super=%s inherit=%s create_role=%s create_db=%s',
                               r.rolsuper, r.rolinherit, r.rolcreaterole, r.rolcreatedb) AS detail
                      FROM pg_catalog.pg_roles r
                     WHERE r.rolcanlogin
                       AND """ + USER_ROLE_FILTER + " AND " + GLOBAL_DATABASE_FILTER, null),
            globalQuery(ObjectKind.TABLESPACE, "postgres-tablespaces", """
                    SELECT current_database() AS object_catalog,
                           NULL::text AS object_schema,
                           t.spcname AS object_name,
                           NULL::text AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           NULL::text AS detail
                      FROM pg_catalog.pg_tablespace t
                     WHERE """ + USER_TABLESPACE_FILTER + " AND " + GLOBAL_DATABASE_FILTER, null),
            globalQuery(ObjectKind.FOREIGN_DATA_WRAPPER, "postgres-foreign-data-wrappers", """
                    SELECT current_database() AS object_catalog,
                           NULL::text AS object_schema,
                           w.fdwname AS object_name,
                           NULL::text AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           NULL::text AS detail
                      FROM pg_catalog.pg_foreign_data_wrapper w
                     WHERE """ + GLOBAL_DATABASE_FILTER, null),
            globalQuery(ObjectKind.FOREIGN_SERVER, "postgres-foreign-servers", """
                    SELECT current_database() AS object_catalog,
                           NULL::text AS object_schema,
                           s.srvname AS object_name,
                           NULL::text AS native_definition,
                           NULL::text AS dependency_schema,
                           w.fdwname AS dependency_name,
                           NULL::text AS detail
                      FROM pg_catalog.pg_foreign_server s
                      JOIN pg_catalog.pg_foreign_data_wrapper w ON w.oid = s.srvfdw
                     WHERE """ + GLOBAL_DATABASE_FILTER, ObjectKind.FOREIGN_DATA_WRAPPER),
            globalQuery(ObjectKind.USER_MAPPING, "postgres-user-mappings", """
                    SELECT current_database() AS object_catalog,
                           NULL::text AS object_schema,
                           (CASE WHEN m.umuser = 0 THEN 'PUBLIC'
                                 ELSE COALESCE(r.rolname, 'oid#' || m.umuser::text) END)
                               || '@' || s.srvname AS object_name,
                           NULL::text AS native_definition,
                           NULL::text AS dependency_schema,
                           s.srvname AS dependency_name,
                           NULL::text AS detail
                      FROM pg_catalog.pg_user_mapping m
                      JOIN pg_catalog.pg_foreign_server s ON s.oid = m.umserver
                      LEFT JOIN pg_catalog.pg_roles r ON r.oid = m.umuser
                     WHERE """ + GLOBAL_DATABASE_FILTER, ObjectKind.FOREIGN_SERVER),
            globalQuery(ObjectKind.PUBLICATION, "postgres-publications", """
                    SELECT current_database() AS object_catalog,
                           NULL::text AS object_schema,
                           p.pubname AS object_name,
                           NULL::text AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           pg_catalog.format('all=%s i=%s u=%s d=%s t=%s',
                               p.puballtables, p.pubinsert, p.pubupdate, p.pubdelete, p.pubtruncate)
                               AS detail
                      FROM pg_catalog.pg_publication p
                     WHERE """ + GLOBAL_DATABASE_FILTER, null),
            globalQuery(ObjectKind.SUBSCRIPTION, "postgres-subscriptions", """
                    SELECT current_database() AS object_catalog,
                           NULL::text AS object_schema,
                           s.subname AS object_name,
                           NULL::text AS native_definition,
                           NULL::text AS dependency_schema,
                           NULL::text AS dependency_name,
                           s.subenabled::text AS detail
                      FROM pg_catalog.pg_subscription s
                     WHERE """ + GLOBAL_DATABASE_FILTER + """
                       AND s.subdbid = (SELECT d.oid
                                          FROM pg_catalog.pg_database d
                                         WHERE d.datname = pg_catalog.current_database())
                    """, null));

    private PostgreSqlCatalogQueries() {}

    public static List<Query> queries() {
        return QUERIES;
    }

    private static Query query(
            ObjectKind kind,
            String operation,
            String sql,
            ObjectKind dependencyKind,
            boolean capabilityProbe) {
        return new Query(kind, operation, sql, 2, dependencyKind, capabilityProbe);
    }

    private static Query globalQuery(
            ObjectKind kind,
            String operation,
            String sql,
            ObjectKind dependencyKind) {
        return new Query(kind, operation, sql, 1, dependencyKind, false, true);
    }

    public record Query(
            ObjectKind kind,
            String operation,
            String sql,
            int schemaParameterCount,
            ObjectKind dependencyKind,
            boolean capabilityProbe,
            boolean global) {

        public Query(
                ObjectKind kind,
                String operation,
                String sql,
                int schemaParameterCount,
                ObjectKind dependencyKind,
                boolean capabilityProbe) {
            this(kind, operation, sql, schemaParameterCount, dependencyKind, capabilityProbe, false);
        }

        public Query {
            kind = Objects.requireNonNull(kind, "kind");
            operation = Objects.requireNonNull(operation, "operation");
            sql = Objects.requireNonNull(sql, "sql");
            if (schemaParameterCount < 0) {
                throw new IllegalArgumentException("schemaParameterCount must not be negative");
            }
        }

        /** 사용자 객체 기본 범위와 명시적 시스템 객체 포함 범위를 같은 query 정의에서 만든다. */
        public String sql(boolean includeSystemObjects) {
            if (!includeSystemObjects) {
                return sql;
            }
            return global
                    ? sql.replace(USER_ROLE_FILTER, "TRUE")
                            .replace(USER_TABLESPACE_FILTER, "TRUE")
                    : sql.replace(USER_SCHEMA_FILTER, "TRUE");
        }

        /** 현재 query가 전체 kind가 아닌 알려진 일부 범위만 읽을 때의 fail-closed 설명. */
        public String partialScopeMessage() {
            return switch (kind) {
                case PARTITION -> "attached child partition bounds are inventoried; parent keys remain partial";
                case GRANT -> "relation ACL grants are inventoried; other PostgreSQL grant scopes remain partial";
                case JOB -> "job extension presence is probe-only and requires a dedicated catalog adapter";
                default -> null;
            };
        }
    }
}
