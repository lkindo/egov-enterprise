package nuri.migration.suggest;

import nuri.migration.appscan.AppUsageReport;
import nuri.migration.appscan.AppUsageReport.ColumnUsage;
import nuri.migration.appscan.AppUsageReport.UsageEvidence;
import nuri.migration.profile.SourceProfile;
import nuri.migration.profile.SourceProfile.ColumnProfile;
import nuri.migration.profile.SourceProfile.TableProfile;
import nuri.migration.suggest.SuggestionReport.Candidate;
import nuri.migration.suggest.SuggestionReport.ColumnSuggestion;
import nuri.migration.suggest.SuggestionReport.ConceptCluster;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

/**
 * 규칙만으로 레거시 컬럼의 표준 용어 후보를 만든다(ADR-0029 결정 1 식별 단계, 레거시 표준화 설계 §4.2).
 *
 * <p>근거는 셋이다 — 컬럼 이름(표준 영문약어와 같음), 코멘트(용어명·이음동의어·표준 단어 조합), 레거시 화면·VO 의
 * 라벨(같은 규칙). 이름이나 코멘트가 용어명과 같으면 {@code EXACT}, 이음동의어면 {@code SYNONYM}, 단어 조합·화면 라벨이면
 * {@code INFERRED} 다. 근거끼리 서로 다른 용어를 가리키거나 데이터 모양이 도메인과 맞지 않으면 {@code INFERRED} 로
 * 낮추고 충돌로 보고한다. 폐기된 용어는 후보로 내지 않는다. 외부 LLM 은 쓰지 않는다.</p>
 */
public final class TermSuggester {

    static final int MAX_CANDIDATES = 5;
    private static final int MAX_WORD_LENGTH = 20;
    private static final Set<String> LABEL_KINDS = Set.of("SCREEN_LABEL", "LIST_COLUMN_LABEL", "VO_FIELD");
    private static final Map<String, Integer> RANK = Map.of("EXACT", 3, "SYNONYM", 2, "INFERRED", 1);

    private final Map<String, StandardDictionary.Term> byEngAbbr = new HashMap<>();
    private final Map<String, List<StandardDictionary.Term>> byName = new HashMap<>();
    private final Map<String, List<StandardDictionary.Term>> bySynonym = new HashMap<>();
    private final Map<String, String> wordAbbr = new HashMap<>();
    private final Map<String, StandardDictionary.Domain> domains = new HashMap<>();

    public TermSuggester(StandardDictionary dictionary) {
        Objects.requireNonNull(dictionary, "dictionary");
        for (StandardDictionary.Term term : dictionary.terms()) {
            if (term.deprecated() || term.engAbbr() == null || term.name() == null) {
                continue;
            }
            byEngAbbr.putIfAbsent(term.engAbbr().toUpperCase(Locale.ROOT), term);
            String name = normalize(term.name());
            if (name != null) {
                byName.computeIfAbsent(name, key -> new ArrayList<>()).add(term);
            }
            for (String synonym : term.synonyms()) {
                String normalized = normalize(synonym);
                if (normalized != null) {
                    bySynonym.computeIfAbsent(normalized, key -> new ArrayList<>()).add(term);
                }
            }
        }
        dictionary.words().stream()
                .filter(word -> word.name() != null && word.engAbbr() != null)
                .sorted(Comparator.comparing((StandardDictionary.Word word) -> !word.representative())
                        .thenComparing(StandardDictionary.Word::engAbbr))
                .forEach(word -> {
                    String name = normalize(word.name());
                    if (name != null) {
                        wordAbbr.putIfAbsent(name, word.engAbbr().toUpperCase(Locale.ROOT));
                    }
                });
        for (StandardDictionary.Domain domain : dictionary.domains()) {
            if (domain.name() != null) {
                domains.putIfAbsent(domain.name(), domain);
            }
        }
    }

    public SuggestionReport suggest(SourceProfile profile, String inventorySemanticDigest, String profileDigest,
                                    AppUsageReport usage, String appUsageDigest) {
        Objects.requireNonNull(profile, "profile");
        Map<String, List<String>> labels = labels(usage);
        Map<String, Integer> nameCounts = new HashMap<>();
        profile.tables().forEach(table -> nameCounts.merge(table.name(), 1, Integer::sum));
        List<ColumnSuggestion> columns = new ArrayList<>();
        for (TableProfile table : profile.tables()) {
            String tableRef = nameCounts.get(table.name()) > 1 && table.schema() != null
                    ? table.schema() + "." + table.name() : table.name();
            for (ColumnProfile column : table.columns()) {
                columns.add(column(tableRef, table.name(), column, labels));
            }
        }
        Map<String, Long> grades = new TreeMap<>();
        columns.forEach(column -> grades.merge(column.grade(), 1L, Long::sum));
        return new SuggestionReport(SuggestionReport.CURRENT_VERSION, inventorySemanticDigest, profileDigest,
                appUsageDigest, grades, columns, clusters(columns));
    }

    private ColumnSuggestion column(String tableRef, String tableName, ColumnProfile column,
                                    Map<String, List<String>> labels) {
        Map<String, Set<String>> evidence = new LinkedHashMap<>();
        Map<String, String> grade = new HashMap<>();
        Map<String, StandardDictionary.Term> terms = new HashMap<>();
        Set<String> fromName = new LinkedHashSet<>();
        Set<String> fromComment = new LinkedHashSet<>();
        Set<String> fromUsage = new LinkedHashSet<>();

        StandardDictionary.Term named = byEngAbbr.get(column.name().toUpperCase(Locale.ROOT));
        if (named != null) {
            add(evidence, grade, terms, named, "NAME_ENG_ABBR", "EXACT");
            fromName.add(key(named));
        }
        String comment = column.comment() == null ? null : column.comment().text();
        for (Match match : match(comment, "COMMENT", true)) {
            add(evidence, grade, terms, match.term(), match.evidence(), match.grade());
            fromComment.add(key(match.term()));
        }
        String upperColumn = column.name().toUpperCase(Locale.ROOT);
        List<String> found = new ArrayList<>(labels.getOrDefault(
                tableName.toUpperCase(Locale.ROOT) + "\u0000" + upperColumn, List.of()));
        found.addAll(labels.getOrDefault("\u0000" + upperColumn, List.of()));
        for (String label : found) {
            for (Match match : match(label, "USAGE", false)) {
                add(evidence, grade, terms, match.term(), match.evidence(), match.grade());
                fromUsage.add(key(match.term()));
            }
        }

        String data = ConformanceEstimator.dataCategory(column);
        List<String> conflicts = new ArrayList<>();
        if (disagree(fromName, fromComment, fromUsage)) {
            conflicts.add("SOURCES_DISAGREE");
            grade.replaceAll((term, value) -> "INFERRED");
        }
        List<Candidate> candidates = new ArrayList<>();
        for (Map.Entry<String, Set<String>> entry : evidence.entrySet()) {
            StandardDictionary.Term term = terms.get(entry.getKey());
            StandardDictionary.Domain domain = domains.get(term.domain());
            String candidateGrade = grade.get(entry.getKey());
            if (!ConformanceEstimator.compatible(data, ConformanceEstimator.domainCategory(domain))) {
                conflicts.add("DATA_DOMAIN:" + term.engAbbr());
                candidateGrade = "INFERRED";
            }
            candidates.add(new Candidate(term.name(), term.engAbbr(), term.domain(), candidateGrade,
                    List.copyOf(entry.getValue()),
                    ConformanceEstimator.estimate(column, domain, term.allowedValues())));
        }
        candidates.sort(Comparator.comparing((Candidate candidate) -> -RANK.get(candidate.grade()))
                .thenComparing(candidate -> -candidate.evidence().size())
                .thenComparing(Candidate::engAbbr));
        List<Candidate> shown = candidates.size() > MAX_CANDIDATES
                ? List.copyOf(candidates.subList(0, MAX_CANDIDATES)) : candidates;
        String columnGrade = shown.isEmpty() ? "UNKNOWN" : shown.getFirst().grade();
        return new ColumnSuggestion(tableRef, column.name(), data, columnGrade, shown, conflicts);
    }

    /** 근거 묶음(이름·코멘트·라벨) 가운데 비어 있지 않은 것이 둘 이상인데 함께 가리키는 용어가 없으면 충돌이다. */
    private static boolean disagree(Set<String> name, Set<String> comment, Set<String> usage) {
        List<Set<String>> present = new ArrayList<>();
        for (Set<String> group : List.of(name, comment, usage)) {
            if (!group.isEmpty()) {
                present.add(group);
            }
        }
        if (present.size() < 2) {
            return false;
        }
        Set<String> common = new HashSet<>(present.getFirst());
        present.forEach(common::retainAll);
        return common.isEmpty();
    }

    private record Match(StandardDictionary.Term term, String evidence, String grade) {}

    /**
     * 글 하나(코멘트·라벨)를 용어명·이음동의어·단어 조합으로 맞춘다. 코멘트는 용어명이면 EXACT·동의어면 SYNONYM 이고,
     * 화면 라벨은 화면 문구일 뿐이라 늘 INFERRED 다.
     */
    private List<Match> match(String text, String prefix, boolean comment) {
        String normalized = normalize(text);
        List<Match> matches = new ArrayList<>();
        if (normalized == null) {
            return matches;
        }
        for (StandardDictionary.Term term : byName.getOrDefault(normalized, List.of())) {
            matches.add(new Match(term, prefix + "_TERM_NAME", comment ? "EXACT" : "INFERRED"));
        }
        for (StandardDictionary.Term term : bySynonym.getOrDefault(normalized, List.of())) {
            matches.add(new Match(term, prefix + "_SYNONYM", comment ? "SYNONYM" : "INFERRED"));
        }
        if (matches.isEmpty()) {
            String composed = compose(normalized);
            StandardDictionary.Term term = composed == null ? null : byEngAbbr.get(composed);
            if (term != null) {
                matches.add(new Match(term, prefix + "_WORDS", "INFERRED"));
            }
        }
        return matches;
    }

    /** 표준 단어를 앞에서부터 가장 길게 맞춰 영문약어를 잇는다. 남는 글자가 있으면 조합하지 않는다. */
    String compose(String normalized) {
        List<String> parts = new ArrayList<>();
        int at = 0;
        while (at < normalized.length()) {
            String abbr = null;
            int end = Math.min(normalized.length(), at + MAX_WORD_LENGTH);
            for (; end > at; end--) {
                abbr = wordAbbr.get(normalized.substring(at, end));
                if (abbr != null) {
                    break;
                }
            }
            if (abbr == null) {
                return null;
            }
            parts.add(abbr);
            at = end;
        }
        return parts.isEmpty() ? null : String.join("_", parts);
    }

    /**
     * 비교용 표기. 괄호 안 설명과 첫 구분자({@code :}·{@code ,}·{@code ;}) 뒤를 버리고 공백·밑줄을 지운다.
     * 예: {@code "등록 일자(YYYYMMDD)"} → {@code "등록일자"}.
     */
    static String normalize(String text) {
        if (text == null) {
            return null;
        }
        String value = text.replaceAll("[(（\\[{][^)）\\]}]*[)）\\]}]", "");
        int cut = value.length();
        for (char separator : new char[] {':', '：', ',', ';', '\n'}) {
            int index = value.indexOf(separator);
            if (index >= 0 && index < cut) {
                cut = index;
            }
        }
        value = value.substring(0, cut).replaceAll("[\\s_]+", "").strip();
        return value.isEmpty() ? null : value;
    }

    private static Map<String, List<String>> labels(AppUsageReport usage) {
        Map<String, List<String>> labels = new HashMap<>();
        if (usage == null) {
            return labels;
        }
        for (ColumnUsage column : usage.columns()) {
            for (UsageEvidence evidence : column.usages()) {
                if (!LABEL_KINDS.contains(evidence.kind()) || evidence.label() == null
                        || evidence.label().isBlank()) {
                    continue;
                }
                String table = evidence.table() == null ? "" : evidence.table().toUpperCase(Locale.ROOT);
                List<String> list = labels.computeIfAbsent(
                        table + "\u0000" + column.column().toUpperCase(Locale.ROOT), key -> new ArrayList<>());
                if (!list.contains(evidence.label())) {
                    list.add(evidence.label());
                }
            }
        }
        return labels;
    }

    private static void add(Map<String, Set<String>> evidence, Map<String, String> grade,
                            Map<String, StandardDictionary.Term> terms, StandardDictionary.Term term,
                            String kind, String candidateGrade) {
        String key = key(term);
        terms.putIfAbsent(key, term);
        evidence.computeIfAbsent(key, ignored -> new TreeSet<>()).add(kind);
        grade.merge(key, candidateGrade, (left, right) -> RANK.get(left) >= RANK.get(right) ? left : right);
    }

    private static String key(StandardDictionary.Term term) {
        return term.engAbbr().toUpperCase(Locale.ROOT);
    }

    /** 첫 후보가 같은 컬럼이 둘 이상이면 개념 군집으로 묶는다. */
    private static List<ConceptCluster> clusters(List<ColumnSuggestion> columns) {
        Map<String, List<String>> members = new TreeMap<>();
        Map<String, String> names = new HashMap<>();
        for (ColumnSuggestion column : columns) {
            if (column.candidates().isEmpty()) {
                continue;
            }
            Candidate top = column.candidates().getFirst();
            members.computeIfAbsent(top.engAbbr(), key -> new ArrayList<>())
                    .add(column.table() + "." + column.column());
            names.putIfAbsent(top.engAbbr(), top.termName());
        }
        List<ConceptCluster> clusters = new ArrayList<>();
        members.forEach((abbr, list) -> {
            if (list.size() > 1) {
                clusters.add(new ConceptCluster(abbr, names.get(abbr), list.stream().sorted().toList()));
            }
        });
        return clusters;
    }
}
