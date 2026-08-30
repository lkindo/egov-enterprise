package nuri.migration;

import lombok.RequiredArgsConstructor;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingLoader;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.validate.MappingValidator;
import nuri.migration.verify.MigrationVerifier;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/** 승인 artifact가 없는 legacy CLI source-read를 차단하고 workflow 진입점으로 유도한다. */
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
        if (args.containsOption("command")) {
            return; // 승인 workflow runner만 command를 소유해 이중 실행을 차단한다.
        }
        String mappingArg = optionOrNull(args, "mapping");
        if (mappingArg == null) {
            throw new MigrationExecutionException(
                    "필수 옵션 --mapping=<mapping.yml> 이 없습니다. [--mode=dry-run|commit]");
        }
        String modeArgument = optionOrDefault(args, "mode", "dry-run");
        if (!"dry-run".equals(modeArgument) && !"commit".equals(modeArgument)) {
            throw new MigrationExecutionException(
                    "지원하지 않는 --mode입니다. --mode=dry-run|commit 중 하나가 필요합니다.");
        }
        MigrationMode mode = MigrationMode.parse(modeArgument);
        if (mode == MigrationMode.COMMIT) {
            throw new MigrationExecutionException(
                    "직접 --mode=commit은 승인 artifact를 우회하므로 금지됩니다. "
                            + "discover -> plan -> validate -> load workflow를 사용하세요.");
        }

        throw new MigrationExecutionException(
                "직접 dry-run은 adapter/inventory/source-freeze 승인을 우회하므로 금지됩니다. "
                        + "discover -> plan -> validate -> load workflow를 사용하세요.");
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
