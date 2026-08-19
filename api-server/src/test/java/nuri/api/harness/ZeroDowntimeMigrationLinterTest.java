package nuri.api.harness;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * Zero-Downtime Migration Safety Linter.
 *
 * <p>파괴적 DDL을 차단하는 것뿐 아니라 예외 자체도 fail-closed로 관리한다. 레지스트리 도입 전에
 * 적용된 Flyway 파일은 checksum을 바꿀 수 없으므로 자유형 {@code linter:ignore}를 소급 수정하지 않는다.
 * 대신 파일별 marker 수와 전체 내용 fingerprint를 {@code zdm-waivers.json}에 동결하고, 이를 승인으로
 * 간주하지 않는 legacy debt로 추적한다. 새 예외는 SQL marker의 안정 ID와 승인 메타데이터가 1:1로
 * 결속되어야 한다.
 */
@Tag("governance-harness")
class ZeroDowntimeMigrationLinterTest {

    private static final Logger log = LoggerFactory.getLogger(ZeroDowntimeMigrationLinterTest.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    private static final String WAIVER_REGISTRY_PATH = "config/governance/zdm-waivers.json";
    private static final String LEGACY_STATUS = "legacy-debt-unapproved";
    private static final String LEGACY_DEBT_CENSUS_SHA256 =
            "ee36a95c7e73bd0db853130e11ec5398e6a266ce934277b61d1d504106b54b69";
    private static final int LEGACY_DEBT_FILE_COUNT = 43;
    private static final int LEGACY_DEBT_IGNORE_COUNT = 188;
    private static final Pattern WAIVER_DIRECTIVE = Pattern.compile(
            "\\blinter:(ignore|disable-file)\\b(?:\\s+(ZDM-\\d{4}-\\d{4})(?![A-Za-z0-9-])"
                    + "(?:\\s+([^\\r\\n]+))?)?");
    private static final Pattern STRUCTURED_WAIVER_ID = Pattern.compile("ZDM-\\d{4}-\\d{4}");
    private static final Pattern SHA256 = Pattern.compile("[a-f0-9]{64}");

    private static final Pattern FORBIDDEN_DROP = Pattern.compile(
            "(?is)\\bALTER\\s+TABLE\\s+\\S+\\s+DROP\\s+(?:COLUMN\\s+)?(?!CONSTRAINT\\b)\\w+");
    private static final Pattern FORBIDDEN_ALTER_TYPE = Pattern.compile(
            "(?is)\\bALTER\\s+TABLE\\s+\\S+\\s+ALTER\\s+(?:COLUMN\\s+)?\\S+\\s+TYPE\\s+");
    private static final Pattern FORBIDDEN_RENAME = Pattern.compile(
            "(?is)\\bALTER\\s+TABLE\\s+\\S+\\s+RENAME\\s+(?!CONSTRAINT\\b)");
    private static final Pattern ADD_CLAUSE_PATTERN = Pattern.compile(
            "(?is)\\bADD\\s+(?:COLUMN\\s+)?(.*?)(?:,|$|;)");
    private static final Pattern FORBIDDEN_DROP_TABLE = Pattern.compile("(?is)\\bDROP\\s+TABLE\\b");
    private static final Pattern FORBIDDEN_DROP_SEQUENCE = Pattern.compile("(?is)\\bDROP\\s+SEQUENCE\\b");
    private static final Pattern FORBIDDEN_TRUNCATE = Pattern.compile(
            "(?is)\\bTRUNCATE\\s+(?:TABLE\\s+)?\\S+");
    private static final Pattern FORBIDDEN_SEQ_RENAME = Pattern.compile(
            "(?is)\\bALTER\\s+SEQUENCE\\s+\\S+\\s+RENAME\\s+");

    @Test
    @DisplayName("Flyway 무중단 DDL과 waiver registry를 fail-closed로 감사")
    void auditZeroDowntimeMigrationScripts() throws IOException {
        Path repoRoot = HarnessSourceIndex.repoRoot();
        Path migrationDir = SchemaNamingLinterTest.resolveMigrationDir().toAbsolutePath().normalize();
        List<Path> migrationFiles = HarnessSourceIndex.filesUnder(
                        migrationDir, path -> path.getFileName().toString().endsWith(".sql"))
                .stream()
                .sorted()
                .toList();

        Map<String, String> migrationContents = new LinkedHashMap<>();
        for (Path path : migrationFiles) {
            migrationContents.put(relativePath(repoRoot, path), HarnessSourceIndex.read(path));
        }

        List<String> violations = new ArrayList<>();
        validateWaiverRegistry(repoRoot, migrationDir, migrationContents, violations);
        for (Map.Entry<String, String> entry : migrationContents.entrySet()) {
            auditDdl(entry.getKey(), entry.getValue(), violations);
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("[ZERO-DOWNTIME LINTER] 파괴적 DDL 또는 waiver registry 위반을 차단했습니다.\n");
            sb.append("========================================================================\n");
            for (String violation : violations) {
                sb.append("- ").append(violation).append("\n");
            }
            sb.append("\n조치: docs/02-architecture/zero-downtime-migration.md를 확인하십시오.\n");
            sb.append("신규 예외: SQL에 '-- linter:ignore ZDM-YYYY-NNNN <reason>'을 쓰고 ")
                    .append(WAIVER_REGISTRY_PATH)
                    .append("에 reason/owner/approvedAt/expiresAt/evidence를 등록해야 합니다.\n");
            fail(sb.toString());
        }

        log.info("모든 Flyway SQL과 ZDM waiver registry가 fail-closed 계약을 준수합니다.");
    }

    private static void validateWaiverRegistry(
            Path repoRoot,
            Path migrationDir,
            Map<String, String> migrationContents,
            List<String> violations) throws IOException {
        Path registryPath = repoRoot.resolve(WAIVER_REGISTRY_PATH).normalize();
        if (!Files.isRegularFile(registryPath)) {
            violations.add("waiver registry가 없습니다: " + WAIVER_REGISTRY_PATH);
            return;
        }

        JsonNode root;
        try {
            root = JSON.readTree(HarnessSourceIndex.read(registryPath));
        } catch (RuntimeException exception) {
            violations.add("waiver registry JSON을 해석할 수 없습니다: " + exception.getMessage());
            return;
        }
        if (!root.isObject()) {
            violations.add("waiver registry 루트는 JSON object여야 합니다.");
            return;
        }
        if (root.path("schemaVersion").asInt(-1) != 1) {
            violations.add("waiver registry schemaVersion은 1이어야 합니다.");
        }
        if (!"zero-downtime-migration-waiver-registry".equals(root.path("authority").asText())) {
            violations.add("waiver registry authority가 올바르지 않습니다.");
        }
        if (!"-- linter:ignore ZDM-YYYY-NNNN <reason>".equals(root.path("markerFormat").asText())) {
            violations.add("waiver registry markerFormat이 구현 계약과 다릅니다.");
        }
        if (!root.path("legacyDebtPolicy").asText().toLowerCase()
                .contains("not retroactive approval")) {
            violations.add("legacyDebtPolicy에 기존 marker가 소급 승인이 아님을 명시해야 합니다.");
        }

        LocalDate today = LocalDate.now();
        Set<String> legacyPaths = validateLegacyDebt(
                root.path("legacyDebt"), repoRoot, migrationDir, migrationContents, today, violations);
        Map<String, List<DirectiveUse>> usesById = collectDirectiveUses(
                migrationContents, legacyPaths, violations);
        validateStructuredWaivers(
                root.path("waivers"), repoRoot, migrationDir, usesById, today, violations);
    }

    private static Set<String> validateLegacyDebt(
            JsonNode entries,
            Path repoRoot,
            Path migrationDir,
            Map<String, String> migrationContents,
            LocalDate today,
            List<String> violations) {
        Set<String> legacyPaths = new HashSet<>();
        List<String> censusRows = new ArrayList<>();
        int totalIgnoreCount = 0;
        if (!entries.isArray()) {
            violations.add("legacyDebt는 JSON array여야 합니다.");
            return legacyPaths;
        }

        for (int index = 0; index < entries.size(); index++) {
            JsonNode entry = entries.get(index);
            String label = "legacyDebt[" + index + "]";
            String path = requiredText(entry, "path", label, violations);
            int expectedCount = entry.path("ignoreCount").asInt(-1);
            String expectedHash = requiredText(entry, "contentSha256", label, violations);
            String owner = requiredText(entry, "owner", label, violations);
            String reviewByText = requiredText(entry, "reviewBy", label, violations);
            String status = requiredText(entry, "status", label, violations);
            String reason = requiredText(entry, "reason", label, violations);
            censusRows.add(path + "|" + expectedCount + "|" + expectedHash);
            totalIgnoreCount += Math.max(expectedCount, 0);

            if (!legacyPaths.add(path)) {
                violations.add(label + ": 중복 legacy path — " + path);
            }
            if (expectedCount < 1) {
                violations.add(label + ": ignoreCount는 1 이상이어야 합니다.");
            }
            if (!SHA256.matcher(expectedHash).matches()) {
                violations.add(label + ": contentSha256는 소문자 SHA-256이어야 합니다.");
            }
            if (!LEGACY_STATUS.equals(status)) {
                violations.add(label + ": 기존 자유형 marker는 승인으로 소급할 수 없으며 status="
                        + LEGACY_STATUS + "여야 합니다.");
            }
            if (entry.has("approvedAt") || entry.has("approvedBy")
                    || entry.path("approved").asBoolean(false)) {
                violations.add(label + ": legacy debt에 승인 메타데이터를 소급 기록할 수 없습니다.");
            }
            if (!reason.toLowerCase().contains("legacy-debt")
                    || !reason.toLowerCase().contains("not retroactive approval")) {
                violations.add(label + ": legacy debt이며 소급 승인이 아님을 reason에 명시해야 합니다.");
            }
            if (owner.isBlank()) {
                violations.add(label + ": owner가 비어 있습니다.");
            }

            LocalDate reviewBy = parseDate(reviewByText, label + ".reviewBy", violations);
            if (reviewBy != null && !reviewBy.isAfter(today)) {
                violations.add(label + ": reviewBy가 도래/만료했습니다 — " + reviewBy);
            }

            Path migrationPath = resolveRegisteredMigrationPath(
                    repoRoot, migrationDir, path, label, violations);
            String content = migrationContents.get(path);
            if (migrationPath == null || content == null) {
                violations.add(label + ": 등록된 migration 파일이 없습니다 — " + path);
                continue;
            }

            int actualCount = countOccurrences(content, "linter:ignore");
            if (actualCount != expectedCount) {
                violations.add(label + ": 자유형 marker 수 drift — expected="
                        + expectedCount + ", actual=" + actualCount);
            }
            String actualHash = sha256(normalizeNewlines(content));
            if (!actualHash.equals(expectedHash)) {
                violations.add(label + ": 적용 migration 내용 fingerprint drift — expected="
                        + expectedHash + ", actual=" + actualHash);
            }
        }

        censusRows.sort(String::compareTo);
        String actualCensusHash = sha256(String.join("\n", censusRows));
        if (entries.size() != LEGACY_DEBT_FILE_COUNT
                || totalIgnoreCount != LEGACY_DEBT_IGNORE_COUNT
                || !LEGACY_DEBT_CENSUS_SHA256.equals(actualCensusHash)) {
            violations.add("legacy debt census drift — 기존 43파일/188건 인벤토리에 새 자유형 예외를 "
                    + "추가하거나 교체할 수 없습니다. files=" + entries.size()
                    + ", ignores=" + totalIgnoreCount + ", censusSha256=" + actualCensusHash);
        }
        return legacyPaths;
    }

    private static Map<String, List<DirectiveUse>> collectDirectiveUses(
            Map<String, String> migrationContents,
            Set<String> legacyPaths,
            List<String> violations) {
        Map<String, List<DirectiveUse>> usesById = new LinkedHashMap<>();
        for (Map.Entry<String, String> migration : migrationContents.entrySet()) {
            String path = migration.getKey();
            String[] lines = normalizeNewlines(migration.getValue()).split("\n", -1);
            for (int lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                Matcher matcher = WAIVER_DIRECTIVE.matcher(lines[lineIndex]);
                while (matcher.find()) {
                    if (legacyPaths.contains(path)) {
                        // 전체 파일 fingerprint와 marker count가 별도 검증되므로 기존 SQL은 수정하지 않는다.
                        continue;
                    }
                    String directive = matcher.group(1);
                    String id = matcher.group(2);
                    if (id == null) {
                        violations.add(path + ":" + (lineIndex + 1)
                                + " 신규/미등록 자유형 linter:" + directive
                                + " — 안정 ID와 registry 승인이 필요합니다.");
                        continue;
                    }
                    String inlineReason = matcher.group(3) == null ? "" : matcher.group(3).trim();
                    if (inlineReason.length() < 10) {
                        violations.add(path + ":" + (lineIndex + 1)
                                + " structured waiver marker에 10자 이상의 인라인 사유가 필요합니다 — " + id);
                    }
                    usesById.computeIfAbsent(id, ignored -> new ArrayList<>())
                            .add(new DirectiveUse(path, directive, lineIndex + 1));
                }
            }
        }
        return usesById;
    }

    private static void validateStructuredWaivers(
            JsonNode entries,
            Path repoRoot,
            Path migrationDir,
            Map<String, List<DirectiveUse>> usesById,
            LocalDate today,
            List<String> violations) {
        if (!entries.isArray()) {
            violations.add("waivers는 JSON array여야 합니다.");
            return;
        }

        Set<String> registeredIds = new HashSet<>();
        for (int index = 0; index < entries.size(); index++) {
            JsonNode entry = entries.get(index);
            String label = "waivers[" + index + "]";
            String id = requiredText(entry, "id", label, violations);
            String path = requiredText(entry, "path", label, violations);
            String directive = requiredText(entry, "directive", label, violations);
            String reason = requiredText(entry, "reason", label, violations);
            String owner = requiredText(entry, "owner", label, violations);
            String approvedAtText = requiredText(entry, "approvedAt", label, violations);
            String expiresAtText = requiredText(entry, "expiresAt", label, violations);
            String evidence = requiredText(entry, "evidence", label, violations);

            if (!registeredIds.add(id)) {
                violations.add(label + ": 중복 waiver ID — " + id);
            }
            if (!STRUCTURED_WAIVER_ID.matcher(id).matches()) {
                violations.add(label + ": ID는 ZDM-YYYY-NNNN 형식이어야 합니다 — " + id);
            }
            if (!"ignore".equals(directive) && !"disable-file".equals(directive)) {
                violations.add(label + ": directive는 ignore 또는 disable-file이어야 합니다.");
            }
            if (reason.length() < 20) {
                violations.add(label + ": reason은 구체적인 안전성 사유를 20자 이상 기록해야 합니다.");
            }
            if (owner.isBlank()) {
                violations.add(label + ": owner가 비어 있습니다.");
            }
            resolveRegisteredMigrationPath(repoRoot, migrationDir, path, label, violations);
            validateEvidence(repoRoot, evidence, label, violations);

            LocalDate approvedAt = parseDate(approvedAtText, label + ".approvedAt", violations);
            LocalDate expiresAt = parseDate(expiresAtText, label + ".expiresAt", violations);
            if (approvedAt != null && approvedAt.isAfter(today)) {
                violations.add(label + ": approvedAt이 미래입니다 — " + approvedAt);
            }
            if (expiresAt != null && !expiresAt.isAfter(today)) {
                violations.add(label + ": expiresAt이 도래/만료했습니다 — " + expiresAt);
            }
            if (approvedAt != null && expiresAt != null && !expiresAt.isAfter(approvedAt)) {
                violations.add(label + ": expiresAt은 approvedAt보다 뒤여야 합니다.");
            }

            List<DirectiveUse> uses = usesById.getOrDefault(id, List.of());
            if (uses.size() != 1) {
                violations.add(label + ": waiver ID는 SQL marker 한 곳과 1:1이어야 합니다 — actual=" + uses.size());
            } else {
                DirectiveUse use = uses.get(0);
                if (!path.equals(use.path())) {
                    violations.add(label + ": registry path와 SQL marker path가 다릅니다 — actual=" + use.path());
                }
                if (!directive.equals(use.directive())) {
                    violations.add(label + ": registry directive와 SQL marker가 다릅니다 — actual="
                            + use.directive() + " at line " + use.line());
                }
            }
        }

        for (Map.Entry<String, List<DirectiveUse>> use : usesById.entrySet()) {
            if (!registeredIds.contains(use.getKey())) {
                for (DirectiveUse location : use.getValue()) {
                    violations.add(location.path() + ":" + location.line()
                            + " registry에 없는 waiver ID — " + use.getKey());
                }
            }
        }
    }

    private static void auditDdl(String path, String content, List<String> violations) {
        Matcher directives = WAIVER_DIRECTIVE.matcher(content);
        while (directives.find()) {
            if ("disable-file".equals(directives.group(1))) {
                log.info("File [{}] is skipped by structured linter:disable-file directive.", path);
                return;
            }
        }

        String cleanContent = content
                .replaceAll("(?s)/\\*.*?\\*/", "")
                .replaceAll("--(?![^\r\n]*linter:ignore)[^\r\n]*", "");
        checkViolationWithIgnore(path, cleanContent, FORBIDDEN_DROP,
                "DROP COLUMN은 하위 호환성을 파괴합니다. Expand-and-Contract 최종 배포에서만 수행하십시오.",
                violations);
        checkViolationWithIgnore(path, cleanContent, FORBIDDEN_ALTER_TYPE,
                "ALTER COLUMN TYPE은 lock/rewrite 위험이 있습니다. 신규 컬럼과 backfill을 사용하십시오.",
                violations);
        checkViolationWithIgnore(path, cleanContent, FORBIDDEN_RENAME,
                "RENAME COLUMN/TABLE은 구버전 소비자를 즉시 파괴합니다.", violations);
        checkAddNotNullViolation(path, cleanContent, violations);
        checkViolationWithIgnore(path, cleanContent, FORBIDDEN_DROP_TABLE,
                "DROP TABLE은 최상위 파괴 DDL입니다.", violations);
        checkViolationWithIgnore(path, cleanContent, FORBIDDEN_DROP_SEQUENCE,
                "DROP SEQUENCE는 채번 소비자를 즉시 파괴할 수 있습니다.", violations);
        checkViolationWithIgnore(path, cleanContent, FORBIDDEN_TRUNCATE,
                "TRUNCATE는 비가역 데이터 소거입니다.", violations);
        checkViolationWithIgnore(path, cleanContent, FORBIDDEN_SEQ_RENAME,
                "ALTER SEQUENCE RENAME은 채번 문자열 결속을 파괴합니다.", violations);
    }

    private static void checkViolationWithIgnore(
            String path, String content, Pattern pattern, String errorMessage, List<String> violations) {
        Matcher matcher = pattern.matcher(content);
        while (matcher.find()) {
            String matchedStatement = matcher.group(0);
            int lineEnd = content.indexOf("\n", matcher.start());
            String targetLine = lineEnd != -1
                    ? content.substring(matcher.start(), lineEnd)
                    : matchedStatement;
            if (targetLine.contains("linter:ignore")) {
                continue;
            }
            violations.add(String.format("%s: %s (구문: %s)",
                    path, errorMessage, matchedStatement.trim().replaceAll("\\s+", " ")));
        }
    }

    private static void checkAddNotNullViolation(String path, String content, List<String> violations) {
        Matcher matcher = ADD_CLAUSE_PATTERN.matcher(content);
        while (matcher.find()) {
            String addClause = matcher.group(1);
            String upperClause = addClause.toUpperCase();
            if (upperClause.contains("NOT")
                    && upperClause.contains("NULL")
                    && !upperClause.contains("DEFAULT")) {
                int lineEnd = content.indexOf("\n", matcher.start());
                String targetLine = lineEnd != -1
                        ? content.substring(matcher.start(), lineEnd)
                        : addClause;
                if (!targetLine.contains("linter:ignore")) {
                    violations.add(path + ": DEFAULT 없는 NOT NULL 컬럼 추가는 구버전 INSERT를 파괴합니다."
                            + " (구문: ADD " + addClause.trim().replaceAll("\\s+", " ") + ")");
                }
            }
        }
    }

    private static Path resolveRegisteredMigrationPath(
            Path repoRoot, Path migrationDir, String relativePath, String label, List<String> violations) {
        if (relativePath.isBlank() || relativePath.contains("\\") || relativePath.contains("..")) {
            violations.add(label + ": path는 정규화된 저장소 상대 경로여야 합니다 — " + relativePath);
            return null;
        }
        Path resolved = repoRoot.resolve(relativePath).toAbsolutePath().normalize();
        if (!resolved.startsWith(migrationDir) || !relativePath.endsWith(".sql")) {
            violations.add(label + ": path는 Flyway migration SQL이어야 합니다 — " + relativePath);
            return null;
        }
        return resolved;
    }

    private static void validateEvidence(Path repoRoot, String evidence, String label, List<String> violations) {
        if (evidence.startsWith("https://")) {
            return;
        }
        if (evidence.isBlank() || evidence.contains("\\") || evidence.contains("..")) {
            violations.add(label + ": evidence는 기존 저장소 상대 경로 또는 https URL이어야 합니다.");
            return;
        }
        Path evidencePath = repoRoot.resolve(evidence).toAbsolutePath().normalize();
        if (!evidencePath.startsWith(repoRoot) || !Files.isRegularFile(evidencePath)) {
            violations.add(label + ": evidence 경로가 존재하지 않습니다 — " + evidence);
        }
    }

    private static String requiredText(JsonNode entry, String field, String label, List<String> violations) {
        JsonNode value = entry.path(field);
        if (!value.isTextual() || value.asText().isBlank()) {
            violations.add(label + ": 필수 문자열 필드 누락/공백 — " + field);
            return "";
        }
        return value.asText();
    }

    private static LocalDate parseDate(String value, String label, List<String> violations) {
        if (value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException exception) {
            violations.add(label + ": ISO-8601 날짜가 아닙니다 — " + value);
            return null;
        }
    }

    private static int countOccurrences(String content, String token) {
        int count = 0;
        int offset = 0;
        while ((offset = content.indexOf(token, offset)) >= 0) {
            count++;
            offset += token.length();
        }
        return count;
    }

    private static String relativePath(Path repoRoot, Path path) {
        return repoRoot.toAbsolutePath().normalize()
                .relativize(path.toAbsolutePath().normalize())
                .toString()
                .replace('\\', '/');
    }

    private static String normalizeNewlines(String content) {
        return content.replace("\r\n", "\n").replace('\r', '\n');
    }

    private static String sha256(String content) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(content.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte value : digest) {
                hex.append(String.format("%02x", value));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("JVM에 SHA-256 구현이 없습니다.", exception);
        }
    }

    private record DirectiveUse(String path, String directive, int line) {
    }
}
