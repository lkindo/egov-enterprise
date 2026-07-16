package nuri.migration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.validate.MappingValidator;
import nuri.migration.validate.ValidationResult;
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationVerifier;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
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

    @Override
    public void run(ApplicationArguments args) {
        String mappingArg = optionOrNull(args, "mapping");
        if (mappingArg == null) {
            log.info("사용법: --mapping=<mapping.yml> [--mode=dry-run|commit]");
            return;
        }
        MigrationMode mode = "commit".equalsIgnoreCase(optionOrDefault(args, "mode", "dry-run"))
                ? MigrationMode.COMMIT : MigrationMode.DRY_RUN;

        MappingSpec spec = loader.load(Path.of(mappingArg));

        ValidationResult validation = validator.validate(spec);
        validation.warnings().forEach(w -> log.warn("[검증] {}", w));
        if (!validation.ok()) {
            validation.errors().forEach(e -> log.error("[검증 실패] {}", e));
            log.error("매핑 검증 실패 — 이관을 중단합니다.");
            return;
        }

        log.info("이관 시작: mode={}, tables={}", mode, spec.tables().size());
        List<EtlExecutor.TableResult> results = executor.execute(spec, mode);
        MigrationReport report = verifier.verify(results);
        log.info(System.lineSeparator() + report.toSummary());
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
