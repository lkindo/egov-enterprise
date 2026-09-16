package nuri.api.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.core.io.ClassPathResource;

/** The immutable expansion review and the current runtime bindings have separate versions. */
public final class AuthorizationReviewedMigrationCatalog {
    private static final String SOURCE = "db/migration/V2_99__seed_explicit_operation_grants.sql";
    private static final Set<String> WITNESSES = Set.of("initial_operation_grant",
            "legacy_policy:tb_role_info", "legacy_policy:tb_authrt_role_map",
            "legacy_policy:tb_role_prgrm_map", "legacy_policy:tb_role_hierarchy", "legacy_policy:program_url");
    private static final Pattern INSERT = Pattern.compile("(?m)^\\s*INSERT INTO tb_authrt_chg_hstry\\b");
    private static final Pattern AUDIT = Pattern.compile("(?ms)^\\s*INSERT INTO tb_authrt_chg_hstry\\s*"
            + "\\([^;]*?\\)\\s*SELECT 'migration:2\\.99','([^']*)','(GROUP_GRANT|GROUP)','MIGRATE',([^;]*);");
    private static final Pattern WITNESS = Pattern.compile("'(initial_operation_grant|legacy_policy:[^']*)'");

    private AuthorizationReviewedMigrationCatalog() {}

    public static String version() {
        try (var input = new ClassPathResource(SOURCE).getInputStream()) {
            return parseVersion(new String(input.readAllBytes(), StandardCharsets.UTF_8));
        } catch (IOException failure) {
            throw new IllegalStateException("Cannot read reviewed authorization migration catalog", failure);
        }
    }

    static String parseVersion(String sql) {
        String source = withoutComments(sql);
        if (INSERT.matcher(source).results().count() != WITNESSES.size()) throw invalid();
        Set<String> witnesses = new HashSet<>();
        String version = null;
        var audits = AUDIT.matcher(source);
        while (audits.find()) {
            String candidate = audits.group(1);
            if (!candidate.matches("[a-f0-9]{64}") || version != null && !version.equals(candidate)) throw invalid();
            version = candidate;
            var labels = WITNESS.matcher(audits.group(3));
            if (!labels.find()) throw invalid();
            String label = labels.group(1);
            if (labels.find() || !witnesses.add(label) || !WITNESSES.contains(label)
                    || "initial_operation_grant".equals(label) != "GROUP_GRANT".equals(audits.group(2))) throw invalid();
        }
        if (!witnesses.equals(WITNESSES)) throw invalid();
        return version;
    }

    private static String withoutComments(String sql) {
        if (sql == null) throw invalid();
        StringBuilder source = new StringBuilder();
        int index = 0;
        while (index < sql.length()) {
            char current = sql.charAt(index);
            if (current == '\'') {
                source.append(current);
                index++;
                boolean closed = false;
                while (index < sql.length()) {
                    char literal = sql.charAt(index++);
                    source.append(literal);
                    if (literal == '\'') {
                        if (index < sql.length() && sql.charAt(index) == '\'') source.append(sql.charAt(index++));
                        else { closed = true; break; }
                    }
                }
                if (!closed) throw invalid();
            } else if (sql.startsWith("--", index)) {
                while (index < sql.length() && sql.charAt(index) != '\n' && sql.charAt(index) != '\r') index++;
                source.append(' ');
            } else if (sql.startsWith("/*", index)) {
                int depth = 1;
                index += 2;
                while (index < sql.length() && depth > 0) {
                    if (sql.startsWith("/*", index)) { depth++; index += 2; }
                    else if (sql.startsWith("*/", index)) { depth--; index += 2; }
                    else index++;
                }
                if (depth != 0) throw invalid();
                source.append('\n');
            } else { source.append(current); index++; }
        }
        return source.toString();
    }

    private static IllegalStateException invalid() {
        return new IllegalStateException("Reviewed authorization migration catalog is invalid");
    }
}
