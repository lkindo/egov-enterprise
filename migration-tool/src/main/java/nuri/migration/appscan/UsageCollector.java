package nuri.migration.appscan;

import nuri.migration.appscan.AppUsageReport.AccessRule;
import nuri.migration.appscan.AppUsageReport.CodeConstant;
import nuri.migration.appscan.AppUsageReport.ColumnUsage;
import nuri.migration.appscan.AppUsageReport.FileCounts;
import nuri.migration.appscan.AppUsageReport.PartialFile;
import nuri.migration.appscan.AppUsageReport.RequestPath;
import nuri.migration.appscan.AppUsageReport.TableReference;
import nuri.migration.appscan.AppUsageReport.UsageEvidence;
import nuri.migration.artifact.ArtifactRedactionGuard;
import nuri.migration.artifact.PersonalDataPatterns;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Pattern;

/**
 * 리더들이 찾은 사용처를 모으고 산출물에 싣기 전에 거른다. 모든 문자열은 공백을 접고 길이를 자른 뒤 개인정보로 보이는
 * 부분을 가린다. 자격처럼 보이는 문자열이 섞인 항목은 통째로 버리고 센다 — 일부만 남기면 무엇이 빠졌는지 알 수 없다.
 */
final class UsageCollector {

    private static final int TEXT_LIMIT = 200;
    private static final Pattern IDENTIFIER = Pattern.compile("[A-Za-z_][A-Za-z0-9_$#]{0,63}");
    private static final Comparator<UsageEvidence> EVIDENCE_ORDER = Comparator
            .comparing(UsageEvidence::path)
            .thenComparingInt(UsageEvidence::line)
            .thenComparing(UsageEvidence::kind)
            .thenComparing(UsageEvidence::table, Comparator.nullsFirst(Comparator.naturalOrder()))
            .thenComparing(UsageEvidence::owner, Comparator.nullsFirst(Comparator.naturalOrder()))
            .thenComparing(UsageEvidence::detail, Comparator.nullsFirst(Comparator.naturalOrder()))
            .thenComparing(UsageEvidence::value, Comparator.nullsFirst(Comparator.naturalOrder()))
            .thenComparing(UsageEvidence::label, Comparator.nullsFirst(Comparator.naturalOrder()));

    private final Map<String, Set<UsageEvidence>> columns = new TreeMap<>();
    private final Map<String, Set<String>> tables = new TreeMap<>();
    private final List<CodeConstant> constants = new ArrayList<>();
    private final List<RequestPath> requestPaths = new ArrayList<>();
    private final List<AccessRule> accessRules = new ArrayList<>();
    private final Map<String, Set<String>> partial = new TreeMap<>();
    private long droppedSensitive;

    void column(String rawColumn, String kind, String path, int line, String table, String owner,
                String detail, String value, String label) {
        String column = columnKey(rawColumn);
        if (column == null) {
            return;
        }
        Cleaned cleanTable = clean(table);
        Cleaned cleanOwner = clean(owner);
        Cleaned cleanDetail = clean(detail);
        Cleaned cleanValue = clean(value);
        Cleaned cleanLabel = clean(label);
        if (cleanTable.dropped() || cleanOwner.dropped() || cleanDetail.dropped() || cleanValue.dropped()
                || cleanLabel.dropped()) {
            droppedSensitive++;
            return;
        }
        String normalizedTable = cleanTable.text() == null ? null : cleanTable.text().toUpperCase(Locale.ROOT);
        columns.computeIfAbsent(column, key -> new TreeSet<>(EVIDENCE_ORDER)).add(new UsageEvidence(
                kind, path, line, normalizedTable, cleanOwner.text(), cleanDetail.text(), cleanValue.text(),
                cleanLabel.text()));
    }

    void table(String rawTable, String path) {
        if (rawTable == null) {
            return;
        }
        String table = rawTable.toUpperCase(Locale.ROOT);
        if (!table.matches("[A-Z_][A-Z0-9_$#]*(?:\\.[A-Z_][A-Z0-9_$#]*)?")) {
            return;
        }
        tables.computeIfAbsent(table, key -> new TreeSet<>()).add(path);
    }

    void constant(String path, int line, String owner, String name, String value, String kind) {
        Cleaned cleanValue = clean(value);
        Cleaned cleanOwner = clean(owner);
        Cleaned cleanName = clean(name);
        if (cleanValue.dropped() || cleanOwner.dropped() || cleanName.dropped()) {
            droppedSensitive++;
            return;
        }
        constants.add(new CodeConstant(path, line, cleanOwner.text(), cleanName.text(), cleanValue.text(), kind));
    }

    void requestPath(String path, int line, String requestPath, String source) {
        Cleaned clean = clean(requestPath);
        if (clean.dropped()) {
            droppedSensitive++;
            return;
        }
        if (clean.text() != null) {
            requestPaths.add(new RequestPath(path, line, clean.text(), source));
        }
    }

    void accessRule(String path, int line, String pattern, String access) {
        Cleaned cleanPattern = clean(pattern);
        Cleaned cleanAccess = clean(access);
        if (cleanPattern.dropped() || cleanAccess.dropped()) {
            droppedSensitive++;
            return;
        }
        accessRules.add(new AccessRule(path, line, cleanPattern.text(), cleanAccess.text()));
    }

    void partial(String path, String reason) {
        partial.computeIfAbsent(path, key -> new TreeSet<>()).add(reason);
    }

    AppUsageReport report(FileCounts counts) {
        List<PartialFile> partialFiles = new ArrayList<>();
        partial.forEach((path, reasons) -> reasons.forEach(reason -> partialFiles.add(new PartialFile(path, reason))));
        List<ColumnUsage> columnUsages = new ArrayList<>();
        columns.forEach((column, usages) -> columnUsages.add(new ColumnUsage(column, List.copyOf(usages))));
        List<TableReference> tableReferences = new ArrayList<>();
        tables.forEach((table, paths) -> tableReferences.add(new TableReference(table, List.copyOf(paths))));
        constants.sort(Comparator.comparing(CodeConstant::path).thenComparingInt(CodeConstant::line)
                .thenComparing(CodeConstant::name, Comparator.nullsFirst(Comparator.naturalOrder())));
        requestPaths.sort(Comparator.comparing(RequestPath::path).thenComparingInt(RequestPath::line)
                .thenComparing(RequestPath::requestPath).thenComparing(RequestPath::source));
        accessRules.sort(Comparator.comparing(AccessRule::path).thenComparingInt(AccessRule::line)
                .thenComparing(AccessRule::pattern, Comparator.nullsFirst(Comparator.naturalOrder())));
        return new AppUsageReport(AppUsageReport.CURRENT_VERSION, partialFiles.isEmpty() ? "COMPLETE" : "PARTIAL",
                counts, partialFiles, columnUsages, tableReferences, List.copyOf(constants),
                List.copyOf(requestPaths), List.copyOf(accessRules), droppedSensitive);
    }

    /** SQL 컬럼은 대문자로, 화면·VO 의 camelCase 이름은 대문자 스네이크로 맞춘다. 마지막 점 뒤 이름만 쓴다. */
    static String columnKey(String raw) {
        if (raw == null) {
            return null;
        }
        String name = raw.strip();
        int dot = name.lastIndexOf('.');
        if (dot >= 0) {
            name = name.substring(dot + 1);
        }
        name = name.replaceAll("\\[[^\\]]*]", "");
        if (!IDENTIFIER.matcher(name).matches()) {
            return null;
        }
        boolean lower = name.chars().anyMatch(Character::isLowerCase);
        if (!lower) {
            return name.toUpperCase(Locale.ROOT);
        }
        StringBuilder snake = new StringBuilder();
        for (int index = 0; index < name.length(); index++) {
            char current = name.charAt(index);
            if (index > 0 && Character.isUpperCase(current)) {
                char previous = name.charAt(index - 1);
                boolean nextLower = index + 1 < name.length() && Character.isLowerCase(name.charAt(index + 1));
                if (Character.isLowerCase(previous) || Character.isDigit(previous)
                        || (Character.isUpperCase(previous) && nextLower)) {
                    if (snake.charAt(snake.length() - 1) != '_') {
                        snake.append('_');
                    }
                }
            }
            snake.append(current);
        }
        return snake.toString().toUpperCase(Locale.ROOT);
    }

    private static Cleaned clean(String raw) {
        if (raw == null) {
            return new Cleaned(null, false);
        }
        String text = raw.replaceAll("\\s+", " ").strip();
        if (text.isEmpty()) {
            return new Cleaned(null, false);
        }
        // 가린 뒤 자른다 — 먼저 자르면 잘린 번호 조각이 패턴에 걸리지 않고 남는다.
        String redacted = PersonalDataPatterns.redact(text);
        if (ArtifactRedactionGuard.isSensitiveText(redacted)) {
            return new Cleaned(null, true);
        }
        if (redacted.length() > TEXT_LIMIT) {
            redacted = redacted.substring(0, TEXT_LIMIT) + "…";
        }
        return new Cleaned(Objects.requireNonNull(redacted), false);
    }

    private record Cleaned(String text, boolean dropped) {}
}
