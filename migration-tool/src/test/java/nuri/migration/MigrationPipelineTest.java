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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.net.URISyntaxException;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

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
        assertThat(t.columns()).hasSize(4);
        assertThat(spec.codemaps()).containsKey("user_status");
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
