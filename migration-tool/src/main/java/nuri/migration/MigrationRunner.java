package nuri.migration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.validate.MappingValidator;
import nuri.migration.validate.ValidationResult;
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationVerifier;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.util.List;

/**
 * CLI 오케스트레이션: load → validate → execute → verify → report.
 * 실행: {@code --mapping=<mapping.yml> [--mode=dry-run|commit]}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MigrationRunner implements ApplicationRunner {

    private final MappingLoader loader;
    private final MappingValidator validator;
    private final EtlExecutor executor;
    private final MigrationVerifier verifier;
    private final SourceIntrospector introspector;

    @Override
    public void run(ApplicationArguments args) {
        String mappingArg = optionOrNull(args, "mapping");
        if (mappingArg == null) {
            throw new MigrationExecutionException(
                    "필수 옵션 --mapping=<mapping.yml> 이 없습니다. [--mode=dry-run|commit]");
        }
        MigrationMode mode;
        try {
            mode = MigrationMode.parse(optionOrDefault(args, "mode", "dry-run"));
        } catch (IllegalArgumentException e) {
            throw new MigrationExecutionException(e.getMessage(), e);
        }

        MappingSpec spec = loader.load(Path.of(mappingArg));
        if (spec.source() == null) {
            throw new MigrationExecutionException("mapping.source 접속 설정이 없습니다.");
        }
        if (spec.tables().isEmpty()) {
            throw new MigrationExecutionException("이관할 tables 매핑이 비어 있습니다.");
        }
        if (mode == MigrationMode.COMMIT && spec.target() == null) {
            throw new MigrationExecutionException("commit 모드에는 mapping.target 접속 설정이 필수입니다.");
        }

        ValidationResult validation = validator.validate(spec);
        validation.warnings().forEach(w -> log.warn("[검증] {}", w));
        if (!validation.ok()) {
            validation.errors().forEach(e -> log.error("[검증 실패] {}", e));
            throw new MigrationExecutionException(
                    "매핑 검증 실패(" + validation.errors().size() + "건) — 이관을 중단합니다.");
        }

        JdbcTemplate sourceJt = introspector.jdbc(spec.source());
        ValidationResult liveSource = validator.validateLiveSource(spec, sourceJt);
        if (!liveSource.ok()) {
            liveSource.errors().forEach(e -> log.error("[실 source 검증 실패] {}", e));
            throw new MigrationExecutionException(
                    "실 source schema 검증 실패(" + liveSource.errors().size() + "건) — 이관을 중단합니다.");
        }

        JdbcTemplate targetJt = null;
        if (mode == MigrationMode.COMMIT) {
            targetJt = introspector.jdbc(spec.target());
            ValidationResult liveTarget = validator.validateLiveTarget(spec, targetJt);
            if (!liveTarget.ok()) {
                liveTarget.errors().forEach(e -> log.error("[실 target 검증 실패] {}", e));
                throw new MigrationExecutionException(
                        "실 target schema 검증 실패(" + liveTarget.errors().size() + "건) — 이관을 중단합니다.");
            }
        }

        log.info("이관 시작: mode={}, tables={}", mode, spec.tables().size());
        List<EtlExecutor.TableResult> results = executor.execute(spec, mode);

        MigrationReport report = verifier.verify(spec, results, targetJt);
        log.info(System.lineSeparator() + report.toSummary());
        if (!report.ok()) {
            throw new MigrationExecutionException(
                    "이관 결과 검증 실패(" + report.overall()
                            + ") — 리포트를 확인하고 원인을 해소한 뒤 재실행하세요.");
        }
    }

    private static String optionOrNull(ApplicationArguments args, String name) {
        List<String> values = args.getOptionValues(name);
        return values == null || values.isEmpty() ? null : values.get(0);
    }

    private static String optionOrDefault(ApplicationArguments args, String name, String def) {
        String v = optionOrNull(args, name);
        return v == null ? def : v;
    }
}
