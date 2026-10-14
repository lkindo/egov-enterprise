package nuri.migration;

import nuri.migration.adapter.SourceAdapterRegistry;
import nuri.migration.artifact.ArtifactFileStore;
import nuri.migration.artifact.CatalogSnapshotArtifactCodec;
import nuri.migration.artifact.CollectionArtifactCodec;
import nuri.migration.artifact.MigrationPlanArtifactCodec;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.plan.MigrationPlanner;
import nuri.migration.postgres.PostgresStandardDictionaryReader;
import nuri.migration.postgres.PostgresTargetSchemaFingerprinter;
import nuri.migration.profile.SourceProfile;
import nuri.migration.profile.SourceProfile.ColumnProfile;
import nuri.migration.profile.SourceProfile.CommentEvidence;
import nuri.migration.profile.SourceProfile.TableProfile;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.suggest.StandardDictionary;
import nuri.migration.suggest.SuggestionReport;
import nuri.migration.validate.MappingValidator;
import nuri.migration.validate.ledger.TermLedger;
import nuri.migration.validate.ledger.TermLedgerLoader;
import nuri.migration.validate.ledger.TermLedgerValidator;
import nuri.migration.verify.MigrationVerifier;
import nuri.migration.workflow.WorkflowReviewLoader;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

/** [ADR-0029 L2b-2] term-suggest 는 대상 DB 의 확장 표준 사전을 읽어 후보와 원장 초안을 만든다. */
@Testcontainers
class TermSuggestPostgresIntegrationTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    private static final String NO_EXTENSION =
            "이 schema 에서 표준 메타 확장 컬럼(V2_128)을 찾지 못해 후보를 만들 수 없습니다";

    @TempDir
    Path temp;

    private final MappingLoader loader = mock(MappingLoader.class);
    private final SourceIntrospector introspector = mock(SourceIntrospector.class);

    @Test
    void theDictionaryIsReadOnlyAfterTheStandardMetaExtension() throws Exception {
        try (Connection connection = open()) {
            meta(connection, "dict_old", false);
            assertThatThrownBy(() -> new PostgresStandardDictionaryReader().read(connection, "dict_old"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage(NO_EXTENSION);
            assertThatThrownBy(() -> new PostgresStandardDictionaryReader().read(connection, "no_such_schema"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage(NO_EXTENSION);
            assertThatThrownBy(() -> new PostgresStandardDictionaryReader().read(connection, "x\"; DROP"))
                    .isInstanceOf(IllegalArgumentException.class);

            meta(connection, "dict_new", true);
            StandardDictionary dictionary = new PostgresStandardDictionaryReader().read(connection, "dict_new");

            assertThat(dictionary.terms()).extracting(StandardDictionary.Term::engAbbr)
                    .containsExactly("REG_YMD", "STLI_NM", "USE_YN");
            StandardDictionary.Term registered = dictionary.terms().getFirst();
            assertThat(registered.synonyms()).containsExactly("작성일자", "기록일자");
            assertThat(dictionary.terms().get(1).deprecated()).isTrue();
            assertThat(dictionary.terms().get(2).allowedValues()).isEqualTo("Y : 예, N : 아니오");
            assertThat(dictionary.words()).contains(new StandardDictionary.Word("유무", "YN", false));
            assertThat(dictionary.domains()).contains(
                    new StandardDictionary.Domain("날짜/시간", "연월일C8", "CHAR", 8),
                    new StandardDictionary.Domain("날짜/시간", "연월일시분초D", "DATETIME", null));
        }
    }

    @Test
    void termSuggestWritesCandidatesAndAProposedLedgerDraft() throws Exception {
        try (Connection connection = open()) {
            meta(connection, "public", true);
        }
        Path profile = temp.resolve("profile.json");
        Files.writeString(profile, new CollectionArtifactCodec().writeProfile(profile(), "a".repeat(64)));
        Path suggestions = temp.resolve("suggestions.json");
        Path draft = temp.resolve("term-ledger.draft.yml");
        bindTarget();

        runner().run(args("--command=term-suggest", "--mapping=" + temp.resolve("mapping.yml"),
                "--profile=" + profile, "--suggestions=" + suggestions, "--ledger-draft=" + draft));

        SuggestionReport report = new CollectionArtifactCodec().readSuggestions(Files.readString(suggestions))
                .payload();
        assertThat(report.inventorySemanticDigest()).isEqualTo("a".repeat(64));
        assertThat(report.columns()).extracting(SuggestionReport.ColumnSuggestion::column,
                        SuggestionReport.ColumnSuggestion::grade)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("wrt_dt", "SYNONYM"),
                        org.assertj.core.groups.Tuple.tuple("stli_nm", "UNKNOWN"));
        assertThat(Files.readString(suggestions)).doesNotContain(POSTGRES.getPassword())
                .doesNotContain(POSTGRES.getJdbcUrl());

        TermLedger ledger = new TermLedgerLoader().load(Files.readString(draft));
        assertThat(new TermLedgerValidator().validate(ledger)).isEmpty();
        assertThat(ledger.entries()).extracting(TermLedger.Entry::status).containsOnly("PROPOSED");
        assertThat(ledger.entries().getFirst().term().engAbbr()).isEqualTo("REG_YMD");
        assertThat(ledger.entries()).extracting(TermLedger.Entry::id)
                .containsExactly("public.legacy_user.wrt_dt", "public.legacy_user.stli_nm");
        assertThat(ledger.entries()).extracting(entry -> entry.source().table()).containsOnly("public.legacy_user");
    }

    @Test
    void aDraftThatCannotBeMadeLeavesNeitherOutputBehind() throws Exception {
        try (Connection connection = open()) {
            meta(connection, "dict_draft", true);
        }
        Path profile = temp.resolve("profile.json");
        SourceProfile twins = new SourceProfile(SourceProfile.CURRENT_VERSION, null, true, List.of(
                table("legacy_user", column("wrt_dt", "작성일자", Map.of("YMD8", 4L))),
                table("LEGACY_USER", column("WRT_DT", "작성일자", Map.of("YMD8", 4L)))));
        Files.writeString(profile, new CollectionArtifactCodec().writeProfile(twins, "a".repeat(64)));
        bindTarget();

        assertThatThrownBy(() -> runner().run(args("--command=term-suggest",
                "--mapping=" + temp.resolve("mapping.yml"), "--profile=" + profile, "--meta-schema=dict_draft",
                "--suggestions=" + temp.resolve("out.json"), "--ledger-draft=" + temp.resolve("draft.yml"))))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageStartingWith("term-suggest 산출물을 쓰지 않았습니다: 대소문자만 다른");
        assertThat(temp.resolve("out.json")).doesNotExist();
        assertThat(temp.resolve("draft.yml")).doesNotExist();
    }

    @Test
    void aTargetWithoutTheExtensionStopsTermSuggestWithoutWritingAnything() throws Exception {
        try (Connection connection = open()) {
            meta(connection, "dict_gate", false);
        }
        Path profile = temp.resolve("profile.json");
        Files.writeString(profile, new CollectionArtifactCodec().writeProfile(profile(), "a".repeat(64)));
        bindTarget();

        assertThatThrownBy(() -> runner().run(args("--command=term-suggest",
                "--mapping=" + temp.resolve("mapping.yml"), "--profile=" + profile,
                "--suggestions=" + temp.resolve("out.json"), "--meta-schema=dict_gate")))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessage(NO_EXTENSION);
        assertThat(temp.resolve("out.json")).doesNotExist();

        SourceProfile outdated = new SourceProfile(1, null, true, profile().tables());
        Files.writeString(profile, new CollectionArtifactCodec().writeProfile(outdated, "a".repeat(64)));
        assertThatThrownBy(() -> runner().run(args("--command=term-suggest",
                "--mapping=" + temp.resolve("mapping.yml"), "--profile=" + profile,
                "--suggestions=" + temp.resolve("out.json"))))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageStartingWith("프로파일 산출물의 판이 맞지 않습니다");
        assertThat(temp.resolve("out.json")).doesNotExist();

        Files.writeString(profile, "{}");
        assertThatThrownBy(() -> runner().run(args("--command=term-suggest",
                "--mapping=" + temp.resolve("mapping.yml"), "--profile=" + profile,
                "--suggestions=" + temp.resolve("out.json"))))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageStartingWith("수집 산출물을 읽지 못해 term-suggest 를 중단했습니다");
    }

    private void bindTarget() throws Exception {
        MappingSpec.DbConfig target = new MappingSpec.DbConfig(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(),
                POSTGRES.getPassword(), "org.postgresql.Driver", "target");
        // endpoint ID 가 초안 YAML 의 고정 키(source)와 같은 단어여도 접속정보로 오인하지 않는다.
        MappingSpec.DbConfig source = new MappingSpec.DbConfig("jdbc:mysql://legacy-host/erp", "legacy_reader",
                "legacy-secret-1", "com.mysql.cj.jdbc.Driver", "source");
        Files.writeString(temp.resolve("mapping.yml"), "target: {}\n");
        given(loader.loadContent(any(String.class)))
                .willReturn(new MappingSpec(source, target, List.of(), Map.of()));
        given(introspector.jdbc(target)).willReturn(new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())));
    }

    private MigrationWorkflowRunner runner() {
        return new MigrationWorkflowRunner(loader, mock(MappingValidator.class), mock(EtlExecutor.class),
                mock(MigrationVerifier.class), introspector, SourceAdapterRegistry.defaults(),
                new ArtifactFileStore(), new CatalogSnapshotArtifactCodec(), new MigrationPlanArtifactCodec(),
                new MigrationPlanner(), new WorkflowReviewLoader(), mock(PostgresTargetSchemaFingerprinter.class));
    }

    /** pgjdbc inventory 와 같은 모양이다 — catalog 는 현재 DB 이름, schema·표·컬럼은 소문자. */
    private static SourceProfile profile() {
        return new SourceProfile(SourceProfile.CURRENT_VERSION, null, true, List.of(table("legacy_user",
                column("wrt_dt", "작성일자", Map.of("YMD8", 4L)), column("stli_nm", "법정리명", Map.of()))));
    }

    private static TableProfile table(String name, ColumnProfile... columns) {
        return new TableProfile(POSTGRES.getDatabaseName(), "public", name, "PROFILED", null, 4, false,
                new CommentEvidence(null, false, null, "ABSENT"), List.of(columns));
    }

    private static ColumnProfile column(String name, String comment, Map<String, Long> patterns) {
        return new ColumnProfile(name, 1, "VARCHAR", 12, 20L, null, true, 4, 0, 0, 4, 0, 0, 0, 0, 1, 8, 32, 0, 4,
                false, patterns, 0, 0, null, null, false, List.of(), 0, 0, null,
                new CommentEvidence(comment, false, null, "MATCH"));
    }

    /** V2_0·V2_128 의 메타 표 모양을 필요한 컬럼만 옮긴다. {@code extended} 가 아니면 V2_128 이전이다. */
    private static void meta(Connection connection, String schema, boolean extended) throws Exception {
        if (!"public".equals(schema)) {
            execute(connection, "CREATE SCHEMA " + schema);
        }
        execute(connection, "CREATE TABLE " + schema + ".meta_standard_terms (term_name varchar(255),"
                + " eng_abbr varchar(100), domain_name varchar(100)"
                + (extended ? ", synonyms text, allowed_values text, deprecated_yn varchar(1) NOT NULL DEFAULT 'N'"
                : "") + ")");
        execute(connection, "CREATE TABLE " + schema + ".meta_standard_words (word_name varchar(100),"
                + " eng_abbr varchar(100), rprs_yn varchar(1))");
        execute(connection, "CREATE TABLE " + schema + ".meta_standard_domains (domain_group varchar(100),"
                + " domain_name varchar(100), data_type varchar(50), data_length integer)");
        if (!extended) {
            return;
        }
        execute(connection, "INSERT INTO " + schema + ".meta_standard_terms VALUES"
                + " ('사용여부', 'USE_YN', '여부C1', NULL, 'Y : 예, N : 아니오', 'N'),"
                + " ('등록일자', 'REG_YMD', '연월일C8', '작성일자, 기록일자', NULL, 'N'),"
                + " ('법정리명', 'STLI_NM', '명V100', NULL, NULL, 'Y')");
        execute(connection, "INSERT INTO " + schema + ".meta_standard_words VALUES"
                + " ('등록', 'REG', 'Y'), ('일자', 'YMD', 'Y'), ('유무', 'YN', 'N')");
        execute(connection, "INSERT INTO " + schema + ".meta_standard_domains VALUES"
                + " ('날짜/시간', '연월일C8', 'CHAR', 8), ('날짜/시간', '연월일시분초D', 'DATETIME', NULL),"
                + " ('코드', '여부C1', 'CHAR', 1), ('명칭', '명V100', 'VARCHAR', 100)");
    }

    private static Connection open() throws Exception {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }

    private static void execute(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private static DefaultApplicationArguments args(String... values) {
        return new DefaultApplicationArguments(values);
    }
}
