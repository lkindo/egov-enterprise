package nuri.migration.profile;

import nuri.migration.artifact.ArtifactRedactionGuard;
import nuri.migration.artifact.PersonalDataPatterns;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.profile.ColumnProfiler.ColumnDeclaration;
import nuri.migration.profile.SourceProfile.ColumnProfile;
import nuri.migration.profile.SourceProfile.CommentEvidence;
import nuri.migration.profile.SourceProfile.TableProfile;
import nuri.migration.source.SourceIntrospector;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * inventory 의 테이블을 읽기 전용으로 한 번씩 훑어 {@link SourceProfile} 을 만든다(ADR-0029 결정 1 의 {@code profile}).
 *
 * <ul>
 *   <li>테이블·컬럼은 inventory 가 본 것만 읽는다. 식별자가 따옴표 없이 쓸 수 없는 모양이면 읽지 않고
 *       {@code SKIPPED_IDENTIFIER} 로 남긴다(적재기의 식별자 규칙과 같다).</li>
 *   <li>모든 테이블을 한 연결·한 트랜잭션에서 읽고 끝나면 롤백한다. 소스에 쓰지 않는다.</li>
 *   <li>SQL 오류는 그 테이블을 {@code FAILED} 와 SQLSTATE 로 남기고 다음 테이블로 간다. 산출물의 {@code complete}
 *       가 거짓이 되고, 실행기는 산출물을 쓴 뒤 실패로 끝낸다.</li>
 *   <li>코멘트는 JDBC REMARKS 로 다시 읽어 inventory 에 해시로 남은 코멘트와 대조한다.</li>
 * </ul>
 */
public final class SourceProfiler {

    private static final int FETCH_SIZE = 500;
    private static final String MYSQL = "MySQL";

    public SourceProfile profile(Connection connection, CatalogSnapshot inventory, Long rowLimit) throws SQLException {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(inventory, "inventory");
        if (rowLimit != null && rowLimit <= 0) {
            throw new IllegalArgumentException("rowLimit must be positive");
        }
        Map<String, Set<String>> commentHashes = commentHashes(inventory);
        Map<String, List<CatalogObject>> columnsByTable = columnsByTable(inventory);
        List<CatalogObject> tables = inventory.objects().stream()
                .filter(object -> object.kind() == ObjectKind.TABLE)
                .sorted(Comparator.comparing(SourceProfiler::tableKey))
                .toList();

        boolean autoCommit = connection.getAutoCommit();
        String product = connection.getMetaData().getDatabaseProductName();
        List<TableProfile> profiles = new ArrayList<>();
        try {
            // PostgreSQL 은 autocommit 이 꺼져 있어야 fetch size 만큼 나눠 읽는다(아니면 결과 전체를 메모리에 올린다).
            connection.setAutoCommit(false);
            for (CatalogObject table : tables) {
                profiles.add(profileTable(connection, product, table,
                        columnsByTable.getOrDefault(tableKey(table), List.of()), commentHashes, rowLimit));
            }
        } finally {
            connection.rollback();
            connection.setAutoCommit(autoCommit);
        }
        boolean complete = profiles.stream().allMatch(profile -> "PROFILED".equals(profile.status()));
        return new SourceProfile(SourceProfile.CURRENT_VERSION, rowLimit, complete, profiles);
    }

    private TableProfile profileTable(Connection connection, String product, CatalogObject table,
                                      List<CatalogObject> columns, Map<String, Set<String>> commentHashes,
                                      Long rowLimit) throws SQLException {
        List<ColumnDeclaration> declarations = columns.stream()
                .map(SourceProfiler::declaration)
                .sorted(Comparator.comparing(ColumnDeclaration::ordinal,
                        Comparator.nullsLast(Comparator.naturalOrder())).thenComparing(ColumnDeclaration::name))
                .toList();
        Map<String, String> remarks = columnRemarks(connection, table);
        CommentEvidence tableComment = comment(tableRemarks(connection, table),
                commentHashes.get(commentKey(table.catalog(), table.schema(), table.name())));
        String qualified = qualifiedSource(table);
        if (qualified == null || declarations.isEmpty()
                || declarations.stream().anyMatch(column -> !safeIdentifier(column.name()))) {
            return new TableProfile(table.catalog(), table.schema(), table.name(), "SKIPPED_IDENTIFIER", null,
                    0L, false, tableComment, unscanned(declarations, table, remarks, commentHashes));
        }
        List<ColumnProfiler> profilers = declarations.stream().map(column -> new ColumnProfiler()).toList();
        String select = "SELECT " + String.join(", ", declarations.stream().map(ColumnDeclaration::name).toList())
                + " FROM " + qualified;
        long scanned = 0;
        boolean truncated = false;
        try (Statement statement = connection.createStatement(
                ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY)) {
            // MySQL Connector/J 는 Integer.MIN_VALUE 일 때만 행을 하나씩 흘려 보낸다.
            statement.setFetchSize(MYSQL.equals(product) ? Integer.MIN_VALUE : FETCH_SIZE);
            try (ResultSet rows = statement.executeQuery(select)) {
                while (rows.next()) {
                    if (rowLimit != null && scanned >= rowLimit) {
                        truncated = true;
                        break;
                    }
                    scanned++;
                    for (int index = 0; index < profilers.size(); index++) {
                        profilers.get(index).accept(rows.getObject(index + 1));
                    }
                }
            }
        } catch (SQLException failure) {
            connection.rollback();
            return new TableProfile(table.catalog(), table.schema(), table.name(), "FAILED",
                    sqlState(failure), 0L, false, tableComment,
                    unscanned(declarations, table, remarks, commentHashes));
        }
        List<ColumnProfile> columnProfiles = new ArrayList<>();
        for (int index = 0; index < declarations.size(); index++) {
            ColumnDeclaration declaration = declarations.get(index);
            columnProfiles.add(profilers.get(index).finish(declaration,
                    columnComment(table, declaration.name(), remarks, commentHashes)));
        }
        return new TableProfile(table.catalog(), table.schema(), table.name(), "PROFILED", null,
                scanned, truncated, tableComment, columnProfiles);
    }

    private static List<ColumnProfile> unscanned(List<ColumnDeclaration> declarations, CatalogObject table,
                                                 Map<String, String> remarks,
                                                 Map<String, Set<String>> commentHashes) {
        return declarations.stream()
                .map(declaration -> new ColumnProfiler().finish(declaration,
                        columnComment(table, declaration.name(), remarks, commentHashes)))
                .toList();
    }

    private static CommentEvidence columnComment(CatalogObject table, String column, Map<String, String> remarks,
                                                 Map<String, Set<String>> commentHashes) {
        return comment(remarks.get(column),
                commentHashes.get(commentKey(table.catalog(), table.schema(), table.name() + "." + column)));
    }

    /** JDBC 코멘트를 inventory 해시와 대조하고, 개인정보·자격처럼 보이는 부분을 가린다. */
    static CommentEvidence comment(String remarks, Set<String> inventoryHashes) {
        boolean inInventory = inventoryHashes != null && !inventoryHashes.isEmpty();
        if (remarks == null || remarks.isBlank()) {
            return new CommentEvidence(null, false, null, inInventory ? "INVENTORY_ONLY" : "ABSENT");
        }
        String match = !inInventory ? "NOT_IN_INVENTORY"
                : inventoryHashes.contains(CatalogObject.definitionHash(remarks)) ? "MATCH" : "MISMATCH";
        String redacted = PersonalDataPatterns.redact(remarks);
        if (ArtifactRedactionGuard.isSensitiveText(redacted)) {
            return new CommentEvidence(null, false, "CREDENTIAL_LIKE", match);
        }
        return new CommentEvidence(redacted, !redacted.equals(remarks), null, match);
    }

    /**
     * 컬럼 코멘트. MySQL 처럼 inventory 의 카탈로그({@code def})를 메타데이터 조회가 받지 않는 드라이버가 있어,
     * 카탈로그를 주고 한 줄도 없으면 카탈로그 없이 한 번 더 묻는다. 읽지 못하면 코멘트가 없는 것으로 본다.
     */
    private static Map<String, String> columnRemarks(Connection connection, CatalogObject table) {
        Map<String, String> remarks = columnRemarks(connection, table, table.catalog());
        return remarks.isEmpty() && table.catalog() != null ? columnRemarks(connection, table, null) : remarks;
    }

    private static Map<String, String> columnRemarks(Connection connection, CatalogObject table, String catalog) {
        Map<String, String> remarks = new HashMap<>();
        try (ResultSet rows = connection.getMetaData().getColumns(catalog, table.schema(), table.name(), null)) {
            while (rows.next()) {
                if (table.name().equals(rows.getString("TABLE_NAME"))) {
                    String column = rows.getString("COLUMN_NAME");
                    String text = rows.getString("REMARKS");
                    if (column != null && text != null) {
                        remarks.put(column, text);
                    }
                }
            }
        } catch (SQLException failure) {
            return Map.of();
        }
        return remarks;
    }

    private static String tableRemarks(Connection connection, CatalogObject table) {
        String remarks = tableRemarks(connection, table, table.catalog());
        return remarks == null && table.catalog() != null ? tableRemarks(connection, table, null) : remarks;
    }

    private static String tableRemarks(Connection connection, CatalogObject table, String catalog) {
        try (ResultSet rows = connection.getMetaData().getTables(catalog, table.schema(), table.name(), null)) {
            while (rows.next()) {
                if (table.name().equals(rows.getString("TABLE_NAME"))) {
                    return rows.getString("REMARKS");
                }
            }
        } catch (SQLException failure) {
            return null;
        }
        return null;
    }

    private static Map<String, Set<String>> commentHashes(CatalogSnapshot inventory) {
        Map<String, Set<String>> hashes = new HashMap<>();
        for (CatalogObject object : inventory.objects()) {
            if (object.kind() == ObjectKind.COMMENT && object.definitionHash() != null) {
                hashes.computeIfAbsent(commentKey(object.catalog(), object.schema(), object.name()),
                        key -> new HashSet<>()).add(object.definitionHash());
            }
        }
        return hashes;
    }

    private static Map<String, List<CatalogObject>> columnsByTable(CatalogSnapshot inventory) {
        Map<String, List<CatalogObject>> columns = new LinkedHashMap<>();
        for (CatalogObject object : inventory.objects()) {
            if (object.kind() != ObjectKind.COLUMN) {
                continue;
            }
            String parent = object.attributes().get("parentTable");
            if (parent == null) {
                continue;
            }
            columns.computeIfAbsent(commentKey(object.catalog(), object.schema(), parent),
                    key -> new ArrayList<>()).add(object);
        }
        return columns;
    }

    private static ColumnDeclaration declaration(CatalogObject column) {
        Map<String, String> attributes = column.attributes();
        String name = attributes.get("originalName");
        if (name == null) {
            String parent = attributes.getOrDefault("parentTable", "");
            name = column.name().startsWith(parent + ".") ? column.name().substring(parent.length() + 1)
                    : column.name();
        }
        return new ColumnDeclaration(name, integer(attributes.get("ordinal")), attributes.get("nativeType"),
                integer(attributes.get("jdbcType")), longValue(attributes.get("size")),
                integer(attributes.get("scale")), bool(attributes.get("nullable")));
    }

    private static String qualifiedSource(CatalogObject table) {
        String owner = table.schema() != null && !table.schema().isBlank() ? table.schema() : table.catalog();
        if (table.quoted() || !safeIdentifier(table.name())
                || (owner != null && !owner.isBlank() && !safeIdentifier(owner))) {
            return null;
        }
        String identifier = owner == null || owner.isBlank() ? table.name() : owner + "." + table.name();
        return SourceIntrospector.qualifiedIdent(identifier);
    }

    private static boolean safeIdentifier(String value) {
        return value != null && value.matches("[A-Za-z_][A-Za-z0-9_$]*");
    }

    private static String tableKey(CatalogObject table) {
        return commentKey(table.catalog(), table.schema(), table.name());
    }

    private static String commentKey(String catalog, String schema, String name) {
        return String.valueOf(catalog) + '\u0000' + schema + '\u0000' + name;
    }

    private static String sqlState(SQLException failure) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql && sql.getSQLState() != null
                    && sql.getSQLState().matches("[0-9A-Z]{5}")) {
                return sql.getSQLState();
            }
        }
        return null;
    }

    private static Integer integer(String value) {
        try {
            return value == null ? null : Integer.valueOf(value);
        } catch (NumberFormatException failure) {
            return null;
        }
    }

    private static Long longValue(String value) {
        try {
            return value == null ? null : Long.valueOf(value);
        } catch (NumberFormatException failure) {
            return null;
        }
    }

    private static Boolean bool(String value) {
        return value == null ? null : Boolean.valueOf(value);
    }
}
