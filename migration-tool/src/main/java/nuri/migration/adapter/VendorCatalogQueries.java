package nuri.migration.adapter;

import nuri.migration.discovery.ObjectKind;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 실제 vendor DB 검증 전에는 자동 실행하지 않는 catalog query 정의다.
 * 각 목록은 제품별로 독립 소유하며 Oracle 정의를 Tibero 별칭으로 재사용하지 않는다.
 */
final class VendorCatalogQueries {

    private VendorCatalogQueries() {}

    static List<VendorCatalogQuery> oracle() {
        return List.of(
                q(ObjectKind.PARTITION, "oracle-partitions",
                        "SELECT TABLE_OWNER, TABLE_NAME, PARTITION_NAME, HIGH_VALUE, PARTITION_POSITION FROM ALL_TAB_PARTITIONS WHERE (? IS NULL OR TABLE_OWNER = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.CHECK_CONSTRAINT, "oracle-check-constraints",
                        "SELECT OWNER, CONSTRAINT_NAME, TABLE_NAME, SEARCH_CONDITION_VC FROM ALL_CONSTRAINTS WHERE CONSTRAINT_TYPE = 'C' AND (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.SEQUENCE, "oracle-sequences",
                        "SELECT SEQUENCE_OWNER, SEQUENCE_NAME, MIN_VALUE, MAX_VALUE, INCREMENT_BY, CYCLE_FLAG FROM ALL_SEQUENCES WHERE (? IS NULL OR SEQUENCE_OWNER = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.MATERIALIZED_VIEW, "oracle-materialized-views",
                        "SELECT OWNER, MVIEW_NAME, CONTAINER_NAME, REFRESH_MODE FROM ALL_MVIEWS WHERE (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.PACKAGE, "oracle-packages",
                        "SELECT OWNER, OBJECT_NAME, STATUS FROM ALL_OBJECTS WHERE OBJECT_TYPE = 'PACKAGE' AND (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.PACKAGE_BODY, "oracle-package-bodies",
                        "SELECT OWNER, OBJECT_NAME, STATUS FROM ALL_OBJECTS WHERE OBJECT_TYPE = 'PACKAGE BODY' AND (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.TRIGGER, "oracle-triggers",
                        "SELECT OWNER, TRIGGER_NAME, TABLE_OWNER, TABLE_NAME, STATUS FROM ALL_TRIGGERS WHERE (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.TYPE, "oracle-types",
                        "SELECT OWNER, TYPE_NAME, TYPECODE FROM ALL_TYPES WHERE (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.TRANSFORMED),
                q(ObjectKind.SYNONYM, "oracle-synonyms",
                        "SELECT OWNER, SYNONYM_NAME, TABLE_OWNER, TABLE_NAME FROM ALL_SYNONYMS WHERE (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.DATABASE_LINK, "oracle-database-links",
                        "SELECT OWNER, DB_LINK FROM ALL_DB_LINKS WHERE (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.POLICY, "oracle-policies",
                        "SELECT OBJECT_OWNER, OBJECT_NAME, POLICY_GROUP, POLICY_NAME, PACKAGE, FUNCTION FROM ALL_POLICIES WHERE (? IS NULL OR OBJECT_OWNER = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.GRANT, "oracle-table-privileges",
                        "SELECT OWNER, TABLE_NAME, GRANTEE, PRIVILEGE, GRANTABLE FROM ALL_TAB_PRIVS WHERE (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.JOB, "oracle-scheduler-jobs",
                        "SELECT OWNER, JOB_NAME, JOB_TYPE, ENABLED, STATE FROM ALL_SCHEDULER_JOBS WHERE (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.MANUAL));
    }

    static List<VendorCatalogQuery> tibero() {
        return List.of(
                q(ObjectKind.PARTITION, "tibero-partitions",
                        "SELECT TABLE_OWNER, TABLE_NAME, PARTITION_NAME, PARTITION_POSITION FROM ALL_TAB_PARTITIONS WHERE (? IS NULL OR TABLE_OWNER = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.CHECK_CONSTRAINT, "tibero-check-constraints",
                        "SELECT OWNER, CONSTRAINT_NAME, TABLE_NAME, STATUS FROM ALL_CONSTRAINTS WHERE CONSTRAINT_TYPE = 'C' AND (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.SEQUENCE, "tibero-sequences",
                        "SELECT SEQUENCE_OWNER, SEQUENCE_NAME, MIN_VALUE, MAX_VALUE, INCREMENT_BY FROM ALL_SEQUENCES WHERE (? IS NULL OR SEQUENCE_OWNER = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.PACKAGE, "tibero-packages",
                        "SELECT OWNER, OBJECT_NAME, STATUS FROM ALL_OBJECTS WHERE OBJECT_TYPE = 'PACKAGE' AND (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.PACKAGE_BODY, "tibero-package-bodies",
                        "SELECT OWNER, OBJECT_NAME, STATUS FROM ALL_OBJECTS WHERE OBJECT_TYPE = 'PACKAGE BODY' AND (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.TRIGGER, "tibero-triggers",
                        "SELECT OWNER, TRIGGER_NAME, TABLE_OWNER, TABLE_NAME, STATUS FROM ALL_TRIGGERS WHERE (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.TYPE, "tibero-types",
                        "SELECT OWNER, TYPE_NAME, TYPECODE, ATTRIBUTES FROM ALL_TYPES WHERE (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.TRANSFORMED),
                q(ObjectKind.SYNONYM, "tibero-synonyms",
                        "SELECT OWNER, SYNONYM_NAME, TABLE_OWNER, TABLE_NAME FROM ALL_SYNONYMS WHERE (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.DATABASE_LINK, "tibero-database-links",
                        "SELECT OWNER, DB_LINK FROM ALL_DB_LINKS WHERE (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.GRANT, "tibero-table-privileges",
                        "SELECT OWNER, TABLE_NAME, GRANTEE, PRIVILEGE FROM ALL_TAB_PRIVS WHERE (? IS NULL OR OWNER = ?)",
                        ObjectSupportGrade.METADATA_ONLY));
    }

    static List<VendorCatalogQuery> mysql() {
        return List.of(
                q(ObjectKind.PARTITION, "mysql-partitions",
                        "SELECT TABLE_SCHEMA, TABLE_NAME, PARTITION_NAME, PARTITION_METHOD FROM INFORMATION_SCHEMA.PARTITIONS WHERE PARTITION_NAME IS NOT NULL AND (? IS NULL OR TABLE_SCHEMA = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.CHECK_CONSTRAINT, "mysql-check-constraints",
                        "SELECT cc.CONSTRAINT_SCHEMA AS CONSTRAINT_SCHEMA, tc.TABLE_NAME AS TABLE_NAME, cc.CONSTRAINT_NAME AS CONSTRAINT_NAME, cc.CHECK_CLAUSE AS CHECK_CLAUSE FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc ON tc.CONSTRAINT_CATALOG = cc.CONSTRAINT_CATALOG AND tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME AND tc.CONSTRAINT_TYPE = 'CHECK' WHERE (? IS NULL OR cc.CONSTRAINT_SCHEMA = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.ROUTINE, "mysql-routines",
                        "SELECT ROUTINE_SCHEMA, ROUTINE_NAME, ROUTINE_TYPE, DATA_TYPE FROM INFORMATION_SCHEMA.ROUTINES WHERE (? IS NULL OR ROUTINE_SCHEMA = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.TRIGGER, "mysql-triggers",
                        "SELECT TRIGGER_SCHEMA, TRIGGER_NAME, EVENT_OBJECT_TABLE, ACTION_TIMING, EVENT_MANIPULATION FROM INFORMATION_SCHEMA.TRIGGERS WHERE (? IS NULL OR TRIGGER_SCHEMA = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.EVENT, "mysql-events",
                        "SELECT EVENT_SCHEMA, EVENT_NAME, EVENT_TYPE, STATUS FROM INFORMATION_SCHEMA.EVENTS WHERE (? IS NULL OR EVENT_SCHEMA = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.GRANT, "mysql-schema-privileges",
                        "SELECT GRANTEE, TABLE_CATALOG, TABLE_SCHEMA, PRIVILEGE_TYPE, IS_GRANTABLE FROM INFORMATION_SCHEMA.SCHEMA_PRIVILEGES WHERE (? IS NULL OR TABLE_SCHEMA = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.CHARACTER_SET, "mysql-table-character-sets",
                        "SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES WHERE (? IS NULL OR TABLE_SCHEMA = ?)",
                        ObjectSupportGrade.TRANSFORMED));
    }

    static List<VendorCatalogQuery> mariaDb() {
        return List.of(
                q(ObjectKind.PARTITION, "mariadb-partitions",
                        "SELECT TABLE_SCHEMA, TABLE_NAME, PARTITION_NAME, PARTITION_METHOD FROM INFORMATION_SCHEMA.PARTITIONS WHERE PARTITION_NAME IS NOT NULL AND (? IS NULL OR TABLE_SCHEMA = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.CHECK_CONSTRAINT, "mariadb-check-constraints",
                        "SELECT cc.CONSTRAINT_SCHEMA AS CONSTRAINT_SCHEMA, tc.TABLE_NAME AS TABLE_NAME, cc.CONSTRAINT_NAME AS CONSTRAINT_NAME, cc.CHECK_CLAUSE AS CHECK_CLAUSE FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc ON tc.CONSTRAINT_CATALOG = cc.CONSTRAINT_CATALOG AND tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME AND tc.CONSTRAINT_TYPE = 'CHECK' WHERE (? IS NULL OR cc.CONSTRAINT_SCHEMA = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.SEQUENCE, "mariadb-sequences",
                        "SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'SEQUENCE' AND (? IS NULL OR TABLE_SCHEMA = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.ROUTINE, "mariadb-routines",
                        "SELECT ROUTINE_SCHEMA, ROUTINE_NAME, ROUTINE_TYPE, DATA_TYPE FROM INFORMATION_SCHEMA.ROUTINES WHERE (? IS NULL OR ROUTINE_SCHEMA = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.TRIGGER, "mariadb-triggers",
                        "SELECT TRIGGER_SCHEMA, TRIGGER_NAME, EVENT_OBJECT_TABLE, ACTION_TIMING FROM INFORMATION_SCHEMA.TRIGGERS WHERE (? IS NULL OR TRIGGER_SCHEMA = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.EVENT, "mariadb-events",
                        "SELECT EVENT_SCHEMA, EVENT_NAME, EVENT_TYPE, STATUS FROM INFORMATION_SCHEMA.EVENTS WHERE (? IS NULL OR EVENT_SCHEMA = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.GRANT, "mariadb-schema-privileges",
                        "SELECT GRANTEE, TABLE_CATALOG, TABLE_SCHEMA, PRIVILEGE_TYPE, IS_GRANTABLE FROM INFORMATION_SCHEMA.SCHEMA_PRIVILEGES WHERE (? IS NULL OR TABLE_SCHEMA = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.CHARACTER_SET, "mariadb-table-character-sets",
                        "SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES WHERE (? IS NULL OR TABLE_SCHEMA = ?)",
                        ObjectSupportGrade.TRANSFORMED));
    }

    static List<VendorCatalogQuery> sqlServer() {
        return List.of(
                q(ObjectKind.PARTITION, "sqlserver-partitions",
                        "SELECT SCHEMA_NAME(o.schema_id) AS schema_name, o.name, p.partition_number, p.rows FROM sys.objects o JOIN sys.partitions p ON p.object_id = o.object_id WHERE (? IS NULL OR SCHEMA_NAME(o.schema_id) = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.SEQUENCE, "sqlserver-sequences",
                        "SELECT SCHEMA_NAME(s.schema_id) AS schema_name, s.name, s.start_value, s.increment, s.minimum_value, s.maximum_value FROM sys.sequences s WHERE (? IS NULL OR SCHEMA_NAME(s.schema_id) = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.ROUTINE, "sqlserver-routines",
                        "SELECT SCHEMA_NAME(o.schema_id) AS schema_name, o.name, o.type_desc FROM sys.objects o WHERE o.type IN ('P', 'FN', 'IF', 'TF') AND (? IS NULL OR SCHEMA_NAME(o.schema_id) = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.TRIGGER, "sqlserver-triggers",
                        "SELECT SCHEMA_NAME(o.schema_id) AS schema_name, t.name, OBJECT_NAME(t.parent_id) AS parent_name, t.is_disabled FROM sys.triggers t JOIN sys.objects o ON o.object_id = t.parent_id WHERE (? IS NULL OR SCHEMA_NAME(o.schema_id) = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.SYNONYM, "sqlserver-synonyms",
                        "SELECT SCHEMA_NAME(s.schema_id) AS schema_name, s.name, s.base_object_name FROM sys.synonyms s WHERE (? IS NULL OR SCHEMA_NAME(s.schema_id) = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.POLICY, "sqlserver-security-policies",
                        "SELECT SCHEMA_NAME(p.schema_id) AS schema_name, p.name, p.is_enabled FROM sys.security_policies p WHERE (? IS NULL OR SCHEMA_NAME(p.schema_id) = ?)",
                        ObjectSupportGrade.MANUAL),
                q(ObjectKind.ROLE, "sqlserver-database-roles",
                        "SELECT p.default_schema_name AS schema_name, p.name, p.type_desc FROM sys.database_principals p WHERE p.type = 'R' AND (? IS NULL OR p.default_schema_name = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.USER, "sqlserver-database-users",
                        "SELECT p.default_schema_name AS schema_name, p.name, p.type_desc FROM sys.database_principals p WHERE p.type IN ('S', 'U', 'G', 'E', 'X') AND (? IS NULL OR p.default_schema_name = ?)",
                        ObjectSupportGrade.METADATA_ONLY),
                q(ObjectKind.EXTERNAL_OBJECT, "sqlserver-external-tables",
                        "SELECT SCHEMA_NAME(t.schema_id) AS schema_name, t.name, t.location FROM sys.external_tables t WHERE (? IS NULL OR SCHEMA_NAME(t.schema_id) = ?)",
                        ObjectSupportGrade.MANUAL));
    }

    private static VendorCatalogQuery q(
            ObjectKind kind,
            String operation,
            String sql,
            ObjectSupportGrade grade) {
        return new VendorCatalogQuery(kind, operation, sql, 2, grade, projection(operation));
    }

    /**
     * Query operation별 ResultSet 계약이다. SQL text나 ResultSetMetaData를 보고 column을 추측하지 않는다.
     */
    private static VendorRowProjection projection(String operation) {
        return switch (operation) {
            case "oracle-partitions" -> withDefinitionAndDependency(
                    "TABLE_OWNER", "PARTITION_NAME", List.of("TABLE_NAME", "PARTITION_NAME"),
                    "HIGH_VALUE", Map.of(
                            "parentTable", "TABLE_NAME",
                            "partitionPosition", "PARTITION_POSITION"),
                    tableDependency("TABLE_OWNER", "TABLE_NAME"));
            case "tibero-partitions" -> withDependency(
                    "TABLE_OWNER", "PARTITION_NAME", List.of("TABLE_NAME", "PARTITION_NAME"),
                    Map.of(
                            "parentTable", "TABLE_NAME",
                            "partitionPosition", "PARTITION_POSITION"),
                    tableDependency("TABLE_OWNER", "TABLE_NAME"));
            case "oracle-check-constraints" -> withDefinitionAndDependency(
                    "OWNER", "CONSTRAINT_NAME", List.of("TABLE_NAME", "CONSTRAINT_NAME"),
                    "SEARCH_CONDITION_VC", Map.of("parentTable", "TABLE_NAME"),
                    tableDependency("OWNER", "TABLE_NAME"));
            case "tibero-check-constraints" -> withDependency(
                    "OWNER", "CONSTRAINT_NAME", List.of("TABLE_NAME", "CONSTRAINT_NAME"),
                    Map.of("parentTable", "TABLE_NAME", "status", "STATUS"),
                    tableDependency("OWNER", "TABLE_NAME"));
            case "oracle-sequences" -> basic(
                    "SEQUENCE_OWNER", "SEQUENCE_NAME", List.of("SEQUENCE_NAME"), Map.of(
                            "minValue", "MIN_VALUE",
                            "maxValue", "MAX_VALUE",
                            "incrementBy", "INCREMENT_BY",
                            "cycle", "CYCLE_FLAG"));
            case "tibero-sequences" -> basic(
                    "SEQUENCE_OWNER", "SEQUENCE_NAME", List.of("SEQUENCE_NAME"), Map.of(
                            "minValue", "MIN_VALUE",
                            "maxValue", "MAX_VALUE",
                            "incrementBy", "INCREMENT_BY"));
            case "oracle-materialized-views" -> basic(
                    "OWNER", "MVIEW_NAME", List.of("MVIEW_NAME"), Map.of(
                            "containerName", "CONTAINER_NAME",
                            "refreshMode", "REFRESH_MODE"));
            case "oracle-packages", "oracle-package-bodies", "tibero-packages", "tibero-package-bodies" ->
                    basic("OWNER", "OBJECT_NAME", List.of("OBJECT_NAME"), Map.of("status", "STATUS"));
            case "oracle-triggers", "tibero-triggers" -> withDependency(
                    "OWNER", "TRIGGER_NAME", List.of("TABLE_OWNER", "TABLE_NAME", "TRIGGER_NAME"),
                    Map.of(
                            "parentSchema", "TABLE_OWNER",
                            "parentTable", "TABLE_NAME",
                            "status", "STATUS"),
                    tableDependency("TABLE_OWNER", "TABLE_NAME"));
            case "oracle-types" -> basic(
                    "OWNER", "TYPE_NAME", List.of("TYPE_NAME"), Map.of("typeCode", "TYPECODE"));
            case "tibero-types" -> basic(
                    "OWNER", "TYPE_NAME", List.of("TYPE_NAME"), Map.of(
                            "typeCode", "TYPECODE",
                            "attributeCount", "ATTRIBUTES"));
            case "oracle-synonyms" -> basic(
                    "OWNER", "SYNONYM_NAME", List.of("SYNONYM_NAME"), Map.of(
                            "targetSchema", "TABLE_OWNER",
                            "targetName", "TABLE_NAME"));
            case "tibero-synonyms" -> basic(
                    "OWNER", "SYNONYM_NAME", List.of("SYNONYM_NAME"), Map.of(
                            "targetSchema", "TABLE_OWNER",
                            "targetName", "TABLE_NAME"));
            case "oracle-database-links", "tibero-database-links" -> sensitive(
                    "OWNER", "DB_LINK", List.of("DB_LINK"), Map.of(), Set.of("DB_LINK"), true);
            case "oracle-policies" -> withDependency(
                    "OBJECT_OWNER", "POLICY_NAME",
                    List.of("OBJECT_NAME", "POLICY_GROUP", "POLICY_NAME"),
                    Map.of(
                            "parentTable", "OBJECT_NAME",
                            "policyGroup", "POLICY_GROUP",
                            "package", "PACKAGE",
                            "function", "FUNCTION"),
                    tableDependency("OBJECT_OWNER", "OBJECT_NAME"));
            case "oracle-table-privileges" -> sensitiveWithDependency(
                    ResultColumnProjection.absent(), "OWNER", "PRIVILEGE",
                    List.of("TABLE_NAME", "GRANTEE", "PRIVILEGE"),
                    Map.of(
                            "parentTable", "TABLE_NAME",
                            "grantable", "GRANTABLE"),
                    Set.of("GRANTEE"), false,
                    tableDependency("OWNER", "TABLE_NAME"));
            case "tibero-table-privileges" -> sensitiveWithDependency(
                    ResultColumnProjection.absent(), "OWNER", "PRIVILEGE",
                    List.of("TABLE_NAME", "GRANTEE", "PRIVILEGE"),
                    Map.of("parentTable", "TABLE_NAME"),
                    Set.of("GRANTEE"), false,
                    tableDependency("OWNER", "TABLE_NAME"));
            case "oracle-scheduler-jobs" -> basic(
                    "OWNER", "JOB_NAME", List.of("JOB_NAME"), Map.of(
                            "jobType", "JOB_TYPE",
                            "enabled", "ENABLED",
                            "state", "STATE"));
            case "mysql-partitions", "mariadb-partitions" -> withDependency(
                    "TABLE_SCHEMA", "PARTITION_NAME", List.of("TABLE_NAME", "PARTITION_NAME"),
                    Map.of(
                            "parentTable", "TABLE_NAME",
                            "partitionMethod", "PARTITION_METHOD"),
                    tableDependency("TABLE_SCHEMA", "TABLE_NAME"));
            case "mysql-check-constraints", "mariadb-check-constraints" -> withDefinitionAndDependency(
                    "CONSTRAINT_SCHEMA", "CONSTRAINT_NAME", List.of("TABLE_NAME", "CONSTRAINT_NAME"),
                    "CHECK_CLAUSE", Map.of("parentTable", "TABLE_NAME"),
                    tableDependency("CONSTRAINT_SCHEMA", "TABLE_NAME"));
            case "mysql-routines", "mariadb-routines" -> basic(
                    "ROUTINE_SCHEMA", "ROUTINE_NAME", List.of("ROUTINE_NAME"), Map.of(
                            "routineType", "ROUTINE_TYPE",
                            "dataType", "DATA_TYPE"));
            case "mysql-triggers" -> withDependency(
                    "TRIGGER_SCHEMA", "TRIGGER_NAME", List.of("EVENT_OBJECT_TABLE", "TRIGGER_NAME"),
                    Map.of(
                            "parentTable", "EVENT_OBJECT_TABLE",
                            "actionTiming", "ACTION_TIMING",
                            "event", "EVENT_MANIPULATION"),
                    tableDependency("TRIGGER_SCHEMA", "EVENT_OBJECT_TABLE"));
            case "mariadb-triggers" -> withDependency(
                    "TRIGGER_SCHEMA", "TRIGGER_NAME", List.of("EVENT_OBJECT_TABLE", "TRIGGER_NAME"),
                    Map.of(
                            "parentTable", "EVENT_OBJECT_TABLE",
                            "actionTiming", "ACTION_TIMING"),
                    tableDependency("TRIGGER_SCHEMA", "EVENT_OBJECT_TABLE"));
            case "mysql-events", "mariadb-events" -> basic(
                    "EVENT_SCHEMA", "EVENT_NAME", List.of("EVENT_NAME"), Map.of(
                            "eventType", "EVENT_TYPE",
                            "status", "STATUS"));
            case "mysql-schema-privileges", "mariadb-schema-privileges" -> sensitive(
                    ResultColumnProjection.column("TABLE_CATALOG"), "TABLE_SCHEMA", "PRIVILEGE_TYPE",
                    List.of("GRANTEE", "PRIVILEGE_TYPE"),
                    Map.of("grantable", "IS_GRANTABLE"), Set.of("GRANTEE"), false);
            case "mysql-table-character-sets", "mariadb-table-character-sets" -> withDependency(
                    "TABLE_SCHEMA", "TABLE_COLLATION", List.of("TABLE_NAME", "TABLE_COLLATION"),
                    Map.of("parentTable", "TABLE_NAME"),
                    tableDependency("TABLE_SCHEMA", "TABLE_NAME"));
            case "mariadb-sequences" -> basic(
                    "TABLE_SCHEMA", "TABLE_NAME", List.of("TABLE_NAME"), Map.of("tableType", "TABLE_TYPE"));
            case "sqlserver-partitions" -> withDependency(
                    "schema_name", "name", List.of("name", "partition_number"),
                    Map.of(
                            "parentTable", "name",
                            "partitionNumber", "partition_number",
                            "rowCount", "rows"),
                    tableDependency("schema_name", "name"));
            case "sqlserver-sequences" -> basic(
                    "schema_name", "name", List.of("name"), Map.of(
                            "startValue", "start_value",
                            "increment", "increment",
                            "minValue", "minimum_value",
                            "maxValue", "maximum_value"));
            case "sqlserver-routines" -> basic(
                    "schema_name", "name", List.of("name"), Map.of("type", "type_desc"));
            case "sqlserver-triggers" -> withDependency(
                    "schema_name", "name", List.of("parent_name", "name"),
                    Map.of(
                            "parentTable", "parent_name",
                            "disabled", "is_disabled"),
                    tableDependency("schema_name", "parent_name"));
            case "sqlserver-synonyms" -> withDefinition(
                    "schema_name", "name", List.of("name"), "base_object_name", Map.of());
            case "sqlserver-security-policies" -> basic(
                    "schema_name", "name", List.of("name"), Map.of("enabled", "is_enabled"));
            case "sqlserver-database-roles", "sqlserver-database-users" -> sensitive(
                    "schema_name", "name", List.of("name"), Map.of("type", "type_desc"),
                    Set.of("name"), true);
            case "sqlserver-external-tables" -> withDefinition(
                    "schema_name", "name", List.of("name"), "location", Map.of());
            default -> throw new IllegalArgumentException("missing vendor projection contract: " + operation);
        };
    }

    private static VendorRowProjection basic(
            String schema,
            String name,
            List<String> identity,
            Map<String, String> attributes) {
        return projected(
                ResultColumnProjection.absent(), schema, name, identity,
                DefinitionProjection.none(), attributes, Set.of(), false, DependencyProjection.none());
    }

    private static VendorRowProjection withDefinition(
            String schema,
            String name,
            List<String> identity,
            String definition,
            Map<String, String> attributes) {
        return projected(
                ResultColumnProjection.absent(), schema, name, identity,
                DefinitionProjection.hashOnly(definition), attributes, Set.of(), false,
                DependencyProjection.none());
    }

    private static VendorRowProjection withDependency(
            String schema,
            String name,
            List<String> identity,
            Map<String, String> attributes,
            DependencyProjection dependency) {
        return projected(
                ResultColumnProjection.absent(), schema, name, identity,
                DefinitionProjection.none(), attributes, Set.of(), false, dependency);
    }

    private static VendorRowProjection withDefinitionAndDependency(
            String schema,
            String name,
            List<String> identity,
            String definition,
            Map<String, String> attributes,
            DependencyProjection dependency) {
        return projected(
                ResultColumnProjection.absent(), schema, name, identity,
                DefinitionProjection.hashOnly(definition), attributes, Set.of(), false, dependency);
    }

    private static VendorRowProjection sensitive(
            String schema,
            String name,
            List<String> identity,
            Map<String, String> attributes,
            Set<String> sensitiveIdentity,
            boolean redactName) {
        return sensitive(
                ResultColumnProjection.absent(), schema, name, identity, attributes,
                sensitiveIdentity, redactName);
    }

    private static VendorRowProjection sensitive(
            ResultColumnProjection catalog,
            String schema,
            String name,
            List<String> identity,
            Map<String, String> attributes,
            Set<String> sensitiveIdentity,
            boolean redactName) {
        return projected(
                catalog, schema, name, identity, DefinitionProjection.none(), attributes,
                sensitiveIdentity, redactName, DependencyProjection.none());
    }

    private static VendorRowProjection sensitiveWithDependency(
            ResultColumnProjection catalog,
            String schema,
            String name,
            List<String> identity,
            Map<String, String> attributes,
            Set<String> sensitiveIdentity,
            boolean redactName,
            DependencyProjection dependency) {
        return projected(
                catalog, schema, name, identity, DefinitionProjection.none(), attributes,
                sensitiveIdentity, redactName, dependency);
    }

    private static VendorRowProjection projected(
            ResultColumnProjection catalog,
            String schema,
            String name,
            List<String> identity,
            DefinitionProjection definition,
            Map<String, String> attributes,
            Set<String> sensitiveIdentity,
            boolean redactName,
            DependencyProjection dependency) {
        return new VendorRowProjection(
                catalog,
                ResultColumnProjection.column(schema),
                ResultColumnProjection.column(name),
                identity,
                definition,
                attributes,
                sensitiveIdentity,
                redactName,
                dependency);
    }

    private static DependencyProjection tableDependency(String schema, String name) {
        return DependencyProjection.of(
                ObjectKind.TABLE,
                ResultColumnProjection.absent(),
                ResultColumnProjection.column(schema),
                ResultColumnProjection.column(name));
    }
}
