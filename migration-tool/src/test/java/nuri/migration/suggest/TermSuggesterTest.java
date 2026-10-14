package nuri.migration.suggest;

import nuri.migration.appscan.AppUsageReport;
import nuri.migration.profile.SourceProfile;
import nuri.migration.profile.SourceProfile.ColumnProfile;
import nuri.migration.profile.SourceProfile.CommentEvidence;
import nuri.migration.profile.SourceProfile.TableProfile;
import nuri.migration.suggest.SuggestionReport.Candidate;
import nuri.migration.suggest.SuggestionReport.ColumnSuggestion;
import nuri.migration.suggest.SuggestionReport.ConceptCluster;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static nuri.migration.suggest.ProfileFixture.column;
import static org.assertj.core.api.Assertions.assertThat;

/** 규칙 기반 용어 후보(ADR-0029 L2b-2). 근거·등급·충돌과 폐기 용어 제외를 고정한다. */
class TermSuggesterTest {

    private static final StandardDictionary DICTIONARY = dictionary();
    private final TermSuggester suggester = new TermSuggester(DICTIONARY);

    @Test
    void aColumnNamedLikeAStandardAbbreviationIsAnExactCandidate() {
        ColumnSuggestion suggestion = single(column("reg_ymd").text(10).pattern("YMD8", 10));

        assertThat(suggestion.grade()).isEqualTo("EXACT");
        assertThat(suggestion.dataCategory()).isEqualTo("DATE8");
        Candidate top = suggestion.candidates().getFirst();
        assertThat(top).extracting(Candidate::termName, Candidate::engAbbr, Candidate::domain)
                .containsExactly("등록일자", "REG_YMD", "연월일C8");
        assertThat(top.evidence()).containsExactly("NAME_ENG_ABBR");
        assertThat(top.conformance().rate()).isEqualByComparingTo("100.0");
        assertThat(top.conformance().transform()).as("힌트는 mapping 어휘다(L3a-2)").isEqualTo("transform:ymd8");
        assertThat(suggestion.conflicts()).isEmpty();
    }

    @Test
    void aCommentThatIsATermNameIsExactAndASynonymIsGradedAsSuch() {
        ColumnSuggestion named = single(column("REGDT").comment("등록 일자(YYYYMMDD)").text(4).pattern("YMD8", 4));
        assertThat(named.grade()).isEqualTo("EXACT");
        assertThat(named.candidates().getFirst().evidence()).containsExactly("COMMENT_TERM_NAME");

        ColumnSuggestion synonym = single(column("WRT_DT").comment("작성일자").text(4).pattern("YMD8", 4));
        assertThat(synonym.grade()).isEqualTo("SYNONYM");
        assertThat(synonym.candidates().getFirst().evidence()).containsExactly("COMMENT_SYNONYM");
    }

    @Test
    void standardWordsThatSpellAnAbbreviationAreOnlyInferred() {
        ColumnSuggestion suggestion = single(column("USE_AT").comment("사용 유무").text(5).pattern("YN", 5));

        assertThat(suggestion.grade()).isEqualTo("INFERRED");
        assertThat(suggestion.candidates().getFirst())
                .extracting(Candidate::engAbbr, Candidate::evidence)
                .containsExactly("USE_YN", List.of("COMMENT_WORDS"));
        assertThat(new TermSuggester(DICTIONARY).compose("사용자명")).isEqualTo("USER_NM");
        assertThat(new TermSuggester(DICTIONARY).compose("사용미상")).isNull();
    }

    @Test
    void aScreenLabelForTheColumnIsInferredEvidence() {
        AppUsageReport usage = usage(
                evidence("SCREEN_LABEL", "LEGACY_USER", "사용자명"),
                evidence("SQL_BINDING", "LEGACY_USER", "등록일자"),
                evidence("LIST_COLUMN_LABEL", "OTHER_TABLE", "등록일자"));

        ColumnSuggestion suggestion = suggester.suggest(profile(table("LEGACY_USER", column("NM").text(3))),
                digest('a'), digest('b'), usage, digest('c')).columns().getFirst();

        assertThat(suggestion.grade()).isEqualTo("INFERRED");
        assertThat(suggestion.candidates()).extracting(Candidate::engAbbr).containsExactly("USER_NM");
        assertThat(suggestion.candidates().getFirst().evidence()).containsExactly("USAGE_TERM_NAME");
    }

    @Test
    void evidenceThatPointsToDifferentTermsIsDowngradedAndReported() {
        ColumnSuggestion suggestion = single(column("USER_NM").comment("등록일자").text(3));

        assertThat(suggestion.conflicts()).containsExactly("SOURCES_DISAGREE");
        assertThat(suggestion.candidates()).extracting(Candidate::engAbbr, Candidate::grade)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("REG_YMD", "INFERRED"),
                        org.assertj.core.groups.Tuple.tuple("USER_NM", "INFERRED"));
        assertThat(suggestion.grade()).isEqualTo("INFERRED");

        ColumnSuggestion agreeing = single(column("USER_NM").comment("사용자명").text(3));
        assertThat(agreeing.conflicts()).isEmpty();
        assertThat(agreeing.candidates().getFirst().evidence())
                .containsExactly("COMMENT_TERM_NAME", "NAME_ENG_ABBR");
        assertThat(agreeing.grade()).isEqualTo("EXACT");
    }

    @Test
    void dataThatCannotBeTheDomainDowngradesTheCandidate() {
        ColumnSuggestion suggestion = single(column("REG_YMD").text(6).pattern("HMS6", 6));

        assertThat(suggestion.dataCategory()).isEqualTo("TIME6");
        assertThat(suggestion.conflicts()).containsExactly("DATA_DOMAIN:REG_YMD");
        assertThat(suggestion.grade()).isEqualTo("INFERRED");
    }

    @Test
    void deprecatedTermsAreNeverSuggestedAndUnmatchedColumnsAreUnknown() {
        SuggestionReport report = suggester.suggest(profile(table("T",
                        column("STLI_NM").comment("법정리명").text(2), column("X1").text(2))),
                digest('a'), digest('b'), null, null);

        assertThat(report.columns()).allSatisfy(suggestion -> {
            assertThat(suggestion.grade()).isEqualTo("UNKNOWN");
            assertThat(suggestion.candidates()).isEmpty();
        });
        assertThat(report.grades()).isEqualTo(Map.of("UNKNOWN", 2L));
        assertThat(report.appUsageDigest()).isNull();
        assertThat(report.inventorySemanticDigest()).isEqualTo(digest('a'));
        assertThat(report.profileDigest()).isEqualTo(digest('b'));
    }

    @Test
    void atMostFiveCandidatesAreShownBestFirst() {
        ColumnSuggestion suggestion = single(column("TMP").comment("임시값").text(1));

        assertThat(suggestion.candidates()).hasSize(TermSuggester.MAX_CANDIDATES)
                .extracting(Candidate::engAbbr).containsExactly("TMP_A", "TMP_B", "TMP_C", "TMP_D", "TMP_E");
    }

    @Test
    void columnsWithTheSameTopTermFormAConceptClusterAndTablesUseTheInventoryName() {
        SourceProfile profile = new SourceProfile(SourceProfile.CURRENT_VERSION, null, true, List.of(
                table("OLD", "LEGACY_USER", column("REG_YMD").text(1).pattern("YMD8", 1)),
                table("NEW", "LEGACY_USER", column("REGDT").comment("등록일자").text(1).pattern("YMD8", 1)),
                table("NEW", "CODE", column("USER_NM").text(1))));

        SuggestionReport report = suggester.suggest(profile, digest('a'), digest('b'), null, null);

        assertThat(report.columns()).extracting(ColumnSuggestion::table)
                .containsExactly("OLD.LEGACY_USER", "NEW.LEGACY_USER", "NEW.CODE");
        assertThat(report.columns()).extracting(ColumnSuggestion::tableStatus).containsOnly("PROFILED");
        assertThat(TermSuggester.qualified(tableIn("ERP", "DBO", "EMP"))).isEqualTo("DBO.EMP");
        assertThat(TermSuggester.qualified(tableIn("def", "legacy", "tb_user"))).isEqualTo("legacy.tb_user");
        assertThat(TermSuggester.qualified(tableIn("legacy-db", "public", "tb_user"))).isEqualTo("public.tb_user");
        assertThat(TermSuggester.qualified(tableIn("ERP", " ", "EMP"))).isEqualTo("EMP");
        assertThat(TermSuggester.qualified(tableIn(" ", null, "EMP"))).isEqualTo("EMP");
        assertThat(report.clusters()).containsExactly(new ConceptCluster("REG_YMD", "등록일자",
                List.of("NEW.LEGACY_USER.REGDT", "OLD.LEGACY_USER.REG_YMD")));
        assertThat(report.grades()).isEqualTo(Map.of("EXACT", 3L));
    }

    @Test
    void skippedTablesKeepTheirStatusInTheReportAndStayOutOfTheDraft() {
        TableProfile skipped = new TableProfile(null, "PUBLIC", "Emp", "SKIPPED_IDENTIFIER", null, 0, false,
                new CommentEvidence(null, false, null, "ABSENT"), List.of(column("REG_YMD").build()));
        SuggestionReport report = suggester.suggest(profile(skipped, table("EMP", column("REG_YMD").text(1)
                .pattern("YMD8", 1))), digest('a'), digest('b'), null, null);

        assertThat(report.columns()).extracting(ColumnSuggestion::table, ColumnSuggestion::tableStatus)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("PUBLIC.Emp", "SKIPPED_IDENTIFIER"),
                        org.assertj.core.groups.Tuple.tuple("PUBLIC.EMP", "PROFILED"));
        assertThat(new LedgerDraftWriter().draft(report).entries())
                .extracting(entry -> entry.source().table()).containsExactly("PUBLIC.EMP");
    }

    @Test
    void aTableReadOnlyUpToTheRowLimitHasNoConformanceRate() {
        TableProfile truncated = new TableProfile(null, "PUBLIC", "LEGACY_USER", "PROFILED", null, 10, true,
                new CommentEvidence(null, false, null, "ABSENT"),
                List.of(column("REG_YMD").text(10).pattern("YMD8", 10).build()));
        Candidate top = suggester.suggest(profile(truncated), digest('a'), digest('b'), null, null)
                .columns().getFirst().candidates().getFirst();

        assertThat(top.conformance().rate()).isNull();
        assertThat(top.conformance().violations())
                .containsExactly(new SuggestionReport.Violation("SAMPLED", null));
    }

    @Test
    void numericCountsAndSixDigitValuesDoNotContradictAnExactName() {
        ColumnSuggestion count = single(column("ATCH_FILE_CNT").number(100).declared(10L, 0)
                .pattern("ONE_ZERO", 96));
        assertThat(count.dataCategory()).isEqualTo("FLAG");
        assertThat(count.conflicts()).isEmpty();
        assertThat(count.grade()).isEqualTo("EXACT");
        assertThat(count.candidates().getFirst().conformance().rate()).isEqualByComparingTo("100.0");

        ColumnSuggestion yearMonth = single(column("BSNS_YM").text(180).pattern("HMS6", 180));
        assertThat(yearMonth.dataCategory()).isEqualTo("TIME6");
        assertThat(yearMonth.conflicts()).isEmpty();
        assertThat(yearMonth.grade()).isEqualTo("EXACT");
    }

    @Test
    void theStrongestGradeOfOneTermWinsAndCandidatesAreRankedByGradeThenEvidence() {
        ColumnSuggestion merged = single(column("REG_YMD").comment("작성일자").text(2).pattern("YMD8", 2));
        assertThat(merged.candidates().getFirst()).extracting(Candidate::grade, Candidate::evidence)
                .containsExactly("EXACT", List.of("COMMENT_SYNONYM", "NAME_ENG_ABBR"));

        TermSuggester ranked = new TermSuggester(new StandardDictionary(List.of(
                term("작성일자", "WRT_YMD", "연월일C8", List.of(), null, false),
                term("등록일자", "REG_YMD", "연월일C8", List.of("작성일자"), null, false),
                term("사용자명", "USER_NM", "명V100", List.of(), null, false),
                term("사용자명", "AUSR_NM", "명V100", List.of(), null, false)), List.of(), List.of()));
        assertThat(ranked.suggest(profile(table("T", column("WRITTEN").comment("작성일자").text(1))),
                        digest('a'), digest('b'), null, null).columns().getFirst().candidates())
                .extracting(Candidate::engAbbr).containsExactly("WRT_YMD", "REG_YMD");
        assertThat(ranked.suggest(profile(table("T", column("USER_NM").comment("사용자명").text(1))),
                        digest('a'), digest('b'), null, null).columns().getFirst().candidates())
                .extracting(Candidate::engAbbr).containsExactly("USER_NM", "AUSR_NM");
        assertThat(new StandardDictionary.Term("명", "NM", "명V100", null, null, false).synonyms()).isEmpty();
    }

    @Test
    void normalizationDropsExplanationsSeparatorsAndSpaces() {
        assertThat(TermSuggester.normalize(": 설명만 있다")).isNull();
        assertThat(TermSuggester.normalize("등록 일자(YYYYMMDD)")).isEqualTo("등록일자");
        assertThat(TermSuggester.normalize("상태코드: A 신청, B 승인")).isEqualTo("상태코드");
        assertThat(TermSuggester.normalize("[구]사용자_명")).isEqualTo("사용자명");
        assertThat(TermSuggester.normalize("  ")).isNull();
        assertThat(TermSuggester.normalize(null)).isNull();
    }

    private ColumnSuggestion single(ProfileFixture column) {
        return suggester.suggest(profile(table("LEGACY_USER", column)), digest('a'), digest('b'), null, null)
                .columns().getFirst();
    }

    private static SourceProfile profile(TableProfile... tables) {
        return new SourceProfile(SourceProfile.CURRENT_VERSION, null, true, List.of(tables));
    }

    private static TableProfile table(String name, ProfileFixture... columns) {
        return table("PUBLIC", name, columns);
    }

    private static TableProfile table(String schema, String name, ProfileFixture... columns) {
        List<ColumnProfile> built = new ArrayList<>();
        for (ProfileFixture column : columns) {
            built.add(column.build());
        }
        return new TableProfile(null, schema, name, "PROFILED", null, 10, false,
                new CommentEvidence(null, false, null, "ABSENT"), built);
    }

    private static TableProfile tableIn(String catalog, String schema, String name) {
        return new TableProfile(catalog, schema, name, "PROFILED", null, 0, false,
                new CommentEvidence(null, false, null, "ABSENT"), List.of());
    }

    private static AppUsageReport.UsageEvidence evidence(String kind, String table, String label) {
        return new AppUsageReport.UsageEvidence(kind, "web/user.jsp", 3, table, null, null, null, label);
    }

    private static AppUsageReport usage(AppUsageReport.UsageEvidence... evidences) {
        return new AppUsageReport(AppUsageReport.CURRENT_VERSION, "COMPLETE",
                new AppUsageReport.FileCounts(1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0), List.of(),
                List.of(new AppUsageReport.ColumnUsage("NM", List.of(evidences))), List.of(), List.of(), List.of(),
                List.of(), 0);
    }

    private static String digest(char value) {
        return String.valueOf(value).repeat(64);
    }

    static StandardDictionary dictionary() {
        List<StandardDictionary.Term> terms = new ArrayList<>(List.of(
                term("등록일자", "REG_YMD", "연월일C8", List.of("작성일자"), null, false),
                term("사용자명", "USER_NM", "명V100", List.of(), null, false),
                term("사용여부", "USE_YN", "여부C1", List.of(), "Y : 예, N : 아니오", false),
                term("법정리명", "STLI_NM", "명V100", List.of(), null, true),
                term("상태코드", "STTS_CD", "코드C3", List.of(), "A01 : 신청", false),
                term("첨부파일수", "ATCH_FILE_CNT", "수N10", List.of(), null, false),
                term("사업연월", "BSNS_YM", "연월C6", List.of(), null, false)));
        for (String suffix : List.of("F", "B", "E", "A", "D", "C")) {
            terms.add(term("임시" + suffix, "TMP_" + suffix, "명V100", List.of("임시값"), null, false));
        }
        return new StandardDictionary(terms, List.of(
                new StandardDictionary.Word("등록", "REG", true),
                new StandardDictionary.Word("일자", "YMD", true),
                new StandardDictionary.Word("사용", "USE", true),
                new StandardDictionary.Word("사용자", "USER", true),
                new StandardDictionary.Word("명", "NM", true),
                new StandardDictionary.Word("여부", "YN", true),
                new StandardDictionary.Word("유무", "YN", true),
                new StandardDictionary.Word("유무", "EXST", false)), List.of(
                new StandardDictionary.Domain("날짜/시간", "연월일C8", "CHAR", 8),
                new StandardDictionary.Domain("명칭", "명V100", "VARCHAR", 100),
                new StandardDictionary.Domain("코드", "여부C1", "CHAR", 1),
                new StandardDictionary.Domain("코드", "코드C3", "VARCHAR", 3),
                new StandardDictionary.Domain("수량", "수N10", "NUMERIC", 10),
                new StandardDictionary.Domain("날짜/시간", "연월C6", "CHAR", 6)));
    }

    private static StandardDictionary.Term term(String name, String abbr, String domain, List<String> synonyms,
                                                String allowed, boolean deprecated) {
        return new StandardDictionary.Term(name, abbr, domain, synonyms, allowed, deprecated);
    }
}
