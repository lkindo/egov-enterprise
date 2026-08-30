package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.CodeMapper;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.validate.MappingValidator;
import nuri.migration.validate.ValidationResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 이관 파이프라인 스모크 테스트: DSL 로드 · 변환/코드맵 · 검증 · ETL dry-run(H2). */
class MigrationPipelineTest {

    private final MappingLoader loader = new MappingLoader();
    private final TransformerRegistry transformers = new TransformerRegistry();

    @Test
    void loadsMappingYml() {
        MappingSpec spec = loader.load(resource("mapping-sample.yml"));
        assertThat(spec.tables()).hasSize(1);
        MappingSpec.TableMapping t = spec.tables().get(0);
        assertThat(t.source()).isEqualTo("LEGACY_USER");
        assertThat(t.target()).isEqualTo("tb_user_info");
        assertThat(t.orderBy()).isEqualTo("USER_ID");
        assertThat(t.columns()).hasSize(4);
        assertThat(spec.codemaps()).containsKey("user_status");
        assertThat(spec.run().runId()).isEqualTo("sample-run");
        assertThat(spec.run().sourceNamespace()).isEqualTo("fixture-crm");
    }

    @Test
    void loadsCompositeOrderKeysWithoutBreakingTheSingleOrderByDsl(@TempDir Path tmp) throws Exception {
        Path mapping = tmp.resolve("composite-mapping.yml");
        Files.writeString(mapping, """
                source:
                  url: jdbc:h2:mem:src
                  username: sa
                  password: ''
                tables:
                  - source: LEGACY_ITEM
                    target: tb_item
                    orderByKeys: [TENANT_ID, ITEM_SEQ]
                    columns: []
                """, StandardCharsets.UTF_8);

        MappingSpec composite = loader.load(mapping);
        MappingSpec single = loader.load(resource("mapping-sample.yml"));

        assertThat(composite.tables().get(0).effectiveOrderKeys())
                .containsExactly("TENANT_ID", "ITEM_SEQ");
        assertThat(single.tables().get(0).effectiveOrderKeys()).containsExactly("USER_ID");
    }

    @Test
    void rejectsUnknownDslKeysInsteadOfIgnoringAStaleExample(@TempDir Path tmp) throws Exception {
        Path mapping = tmp.resolve("mapping.yml");
        Files.writeString(mapping, """
                source:
                  url: jdbc:h2:mem:src
                  username: sa
                  password: ''
                tables:
                  - source: LEGACY_USER
                    target: tb_user_info
                    id_strategy:
                      column: user_id
                      source_key: USER_ID
                """, StandardCharsets.UTF_8);

        assertThatThrownBy(() -> loader.load(mapping))
                .hasMessageContaining("mapping 파일 로드 실패");
    }

    @Test
    void rejectsDuplicateYamlKeysInsteadOfKeepingTheLastValue(@TempDir Path tmp) throws Exception {
        Path mapping = tmp.resolve("duplicate.yml");
        Files.writeString(mapping, """
                source:
                  url: jdbc:h2:mem:first
                  url: jdbc:h2:mem:second
                  username: sa
                  password: ''
                tables: []
                """, StandardCharsets.UTF_8);

        assertThatThrownBy(() -> loader.load(mapping))
                .hasMessageContaining("mapping 파일 로드 실패");
    }

    @Test
    void rejectsLiteralDatabasePasswords(@TempDir Path tmp) throws Exception {
        Path mapping = tmp.resolve("literal-password.yml");
        Files.writeString(mapping, """
                source:
                  url: jdbc:postgresql://source/db
                  username: migration_reader
                  password: do-not-commit-this
                tables: []
                """, StandardCharsets.UTF_8);

        assertThatThrownBy(() -> loader.load(mapping))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("password", "평문", "${NAME}");
    }

    @Test
    void resolvesExactEnvironmentPlaceholdersAfterYamlParsing(@TempDir Path tmp) throws Exception {
        Path mapping = tmp.resolve("mapping.yml");
        Files.writeString(mapping, """
                source:
                  url: "${SOURCE_DB_URL}"
                  username: "${SOURCE_DB_USER}"
                  password: "${SOURCE_DB_PASSWORD}"
                  driver: org.postgresql.Driver
                tables: []
                """, StandardCharsets.UTF_8);
        MappingLoader environmentLoader = new MappingLoader(name -> Map.of(
                "SOURCE_DB_URL", "jdbc:postgresql://source/db",
                "SOURCE_DB_USER", "migration_reader",
                "SOURCE_DB_PASSWORD", "secret:#value"
        ).get(name));

        MappingSpec spec = environmentLoader.load(mapping);

        assertThat(spec.source().url()).isEqualTo("jdbc:postgresql://source/db");
        assertThat(spec.source().username()).isEqualTo("migration_reader");
        assertThat(spec.source().password()).isEqualTo("secret:#value");
    }

    @Test
    void rejectsMissingOrEmbeddedEnvironmentPlaceholders(@TempDir Path tmp) throws Exception {
        Path missing = tmp.resolve("missing.yml");
        Files.writeString(missing, """
                source:
                  url: "${SOURCE_DB_URL}"
                tables: []
                """, StandardCharsets.UTF_8);
        assertThatThrownBy(() -> new MappingLoader(name -> null).load(missing))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("SOURCE_DB_URL");

        Path embedded = tmp.resolve("embedded.yml");
        Files.writeString(embedded, """
                source:
                  url: "jdbc:postgresql://${SOURCE_DB_HOST}/db"
                tables: []
                """, StandardCharsets.UTF_8);
        assertThatThrownBy(() -> new MappingLoader(name -> "ignored").load(embedded))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("전체 값 형식");
    }

    @Test
    void transformersAndCodemap() {
        assertThat(transformers.apply("trim", "  x ")).isEqualTo("x");
        assertThat(transformers.apply("upper", "ab")).isEqualTo("AB");
        assertThat(transformers.apply("unknown", "v")).isEqualTo("v"); // 미등록 → 원본
        Map<String, String> cm = Map.of("1", "A", "0", "D", "default", "P");
        assertThat(CodeMapper.map(cm, "1")).isEqualTo("A");
        assertThat(CodeMapper.map(cm, "9")).isEqualTo("P"); // default
    }

    @Test
    void validatorPassesForStandardTargets() {
        MappingSpec spec = loader.load(resource("mapping-sample.yml"));
        MappingValidator validator = new MappingValidator(transformers, resource("db-columns-fixture.json").toString());
        ValidationResult result = validator.validate(spec);
        assertThat(result.ok()).isTrue();
        assertThat(result.errors()).isEmpty();
    }

    @Test
    void validatorFlagsUnknownTargetColumn() {
        MappingSpec spec = loader.load(resource("mapping-invalid.yml"));
        MappingValidator validator = new MappingValidator(transformers, resource("db-columns-fixture.json").toString());
        ValidationResult result = validator.validate(spec);
        assertThat(result.ok()).isFalse();
        assertThat(result.errors()).anyMatch(e -> e.contains("nonexistent_col"));
    }

    @Test
    void liveTargetValidationUsesActualJdbcMetadataBeforeCommit() {
        JdbcTemplate target = h2("live_target_ok");
        target.execute("CREATE TABLE tb_user_info (user_id varchar(30), user_nm varchar(50), "
                + "user_stts_cd varchar(10), frst_rgtr_id varchar(50))");
        MappingSpec spec = loader.load(resource("mapping-sample.yml"));
        MappingValidator validator = new MappingValidator(transformers, resource("db-columns-fixture.json").toString());

        ValidationResult result = validator.validateLiveTarget(spec, target);

        assertThat(result.ok()).isTrue();
    }

    @Test
    void liveTargetValidationFailsForMissingTableOrColumn() {
        JdbcTemplate missingTable = h2("live_target_missing_table");
        MappingSpec spec = loader.load(resource("mapping-sample.yml"));
        MappingValidator validator = new MappingValidator(transformers, resource("db-columns-fixture.json").toString());
        assertThat(validator.validateLiveTarget(spec, missingTable).errors())
                .anyMatch(error -> error.contains("없는 테이블"));

        JdbcTemplate missingColumn = h2("live_target_missing_column");
        missingColumn.execute("CREATE TABLE tb_user_info (user_id varchar(30))");
        assertThat(validator.validateLiveTarget(spec, missingColumn).errors())
                .anyMatch(error -> error.contains("tb_user_info.user_nm"));
    }

    @Test
    void liveSourceValidationChecksEveryMappedColumnAndIdSourceKey() {
        JdbcTemplate source = h2("live_source_columns");
        source.execute("CREATE TABLE LEGACY_USER (USER_ID varchar(20), USER_NM varchar(50))");
        MappingSpec spec = new MappingSpec(null, null, List.of(
                new MappingSpec.TableMapping("LEGACY_USER", "tb_user_info", null, List.of(
                        new MappingSpec.ColumnMapping("USER_NM", "user_nm", null, null, null, null, null),
                        new MappingSpec.ColumnMapping("MISSING_COL", "user_stts_cd", null, null, null, null, null)
                ), new MappingSpec.IdStrategy("user_id", "USR", "MISSING_ID"))), Map.of());
        MappingValidator validator = new MappingValidator(transformers, resource("db-columns-fixture.json").toString());

        ValidationResult result = validator.validateLiveSource(spec, source);

        assertThat(result.errors()).anySatisfy(error -> assertThat(error).contains("MISSING_COL"));
        assertThat(result.errors()).anySatisfy(error -> assertThat(error).contains("sourceKey", "MISSING_ID"));
    }

    @Test
    void jdbcMetadataPatternMatchesCannotMasqueradeAsTheRequestedSourceTable() {
        JdbcTemplate source = h2("live_source_pattern");
        // JDBC metadata treats '_' in LEGACY_USER as a wildcard. Exact result filtering must reject this table.
        source.execute("CREATE TABLE LEGACYXUSER (USER_ID varchar(20), USER_NM varchar(50), STAT varchar(1))");
        MappingSpec spec = loader.load(resource("mapping-sample.yml"));
        MappingValidator validator = new MappingValidator(transformers, resource("db-columns-fixture.json").toString());

        ValidationResult result = validator.validateLiveSource(spec, source);

        assertThat(result.errors()).anySatisfy(error -> assertThat(error)
                .contains("없는 테이블", "LEGACY_USER"));
    }

    @Test
    void etlDryRunTransformsRows() {
        JdbcTemplate jt = h2("etltest");
        jt.execute("CREATE TABLE LEGACY_USER (USER_ID varchar(20), USER_NM varchar(50), STAT varchar(1))");
        jt.update("INSERT INTO LEGACY_USER VALUES ('u1', '  Kim ', '1')");

        MappingSpec base = loader.load(resource("mapping-sample.yml"));
        MappingSpec spec = new MappingSpec(
                new MappingSpec.DbConfig("jdbc:h2:mem:etltest;DB_CLOSE_DELAY=-1", "sa", "", "org.h2.Driver"),
                null, base.tables(), base.codemaps());

        EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), transformers);
        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.DRY_RUN);

        assertThat(results).hasSize(1);
        EtlExecutor.TableResult r = results.get(0);
        assertThat(r.read()).isEqualTo(1);
        assertThat(r.transformed()).isEqualTo(1);
        assertThat(r.written()).isZero(); // dry-run: 쓰기 없음
        assertThat(r.errors()).isEmpty();
    }

    @Test
    void etlCommitRequiresAnExplicitTarget() {
        MappingSpec base = loader.load(resource("mapping-sample.yml"));
        MappingSpec spec = new MappingSpec(base.source(), null, base.tables(), base.codemaps());
        EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), transformers);

        assertThatThrownBy(() -> executor.execute(spec, MigrationMode.COMMIT))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("mapping.target");
    }

    private static JdbcTemplate h2(String name) {
        DriverManagerDataSource ds = new DriverManagerDataSource(
                "jdbc:h2:mem:" + name + ";DB_CLOSE_DELAY=-1", "sa", "");
        ds.setDriverClassName("org.h2.Driver");
        return new JdbcTemplate(ds);
    }

    private static Path resource(String name) {
        try {
            java.net.URL url = MigrationPipelineTest.class.getClassLoader().getResource(name);
            if (url == null) {
                throw new IllegalStateException("테스트 리소스 없음: " + name);
            }
            return Path.of(url.toURI());
        } catch (URISyntaxException e) {
            throw new IllegalStateException(e);
        }
    }
}
