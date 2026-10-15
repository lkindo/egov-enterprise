package nuri.migration;

import nuri.migration.etl.MigrationMode;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import org.springframework.boot.ApplicationArguments;

import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.Collections;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** command별 허용 옵션을 exact-match하고 path 값은 toString에서 노출하지 않는다. */
public record WorkflowCliOptions(
        WorkflowCommand command,
        Path mapping,
        Path inventory,
        Path plan,
        Path review,
        String sourceAdapter,
        Set<String> catalogs,
        Set<String> schemas,
        Set<ObjectKind> objectKinds,
        boolean includeSystemObjects,
        List<Path> sourceDriverJars,
        String sourceDriverClass,
        MigrationMode mode,
        String adapterAcknowledgement,
        String sourceDriverEvidenceAcknowledgement,
        boolean sourceFreezeAcknowledged,
        Set<String> targetSchemas,
        Path profile,
        Long profileRowLimit,
        Path appSource,
        Path appUsage,
        Path suggestions,
        Path ledgerDraft,
        String metaSchema,
        Path skeleton,
        Path ledger,
        boolean controlSchemaUpgradeAcknowledged,
        Path archiveDir
) {

    private static final Map<WorkflowCommand, Set<String>> ALLOWED = Map.of(
            WorkflowCommand.DISCOVER,
            Set.of("command", "mapping", "inventory", "source-adapter", "schemas",
                    "catalogs", "object-kinds", "include-system-objects",
                    "source-driver-jar", "source-driver-class"),
            WorkflowCommand.PROFILE,
            Set.of("command", "mapping", "inventory", "profile", "profile-row-limit", "source-adapter",
                    "schemas", "catalogs", "object-kinds", "include-system-objects",
                    "source-driver-jar", "source-driver-class"),
            WorkflowCommand.APP_SCAN,
            Set.of("command", "app-source", "app-usage"),
            WorkflowCommand.TERM_SUGGEST,
            Set.of("command", "mapping", "profile", "app-usage", "suggestions", "ledger-draft", "meta-schema"),
            WorkflowCommand.MAPPING_GENERATE,
            Set.of("command", "skeleton", "ledger", "inventory", "mapping"),
            WorkflowCommand.PLAN,
            Set.of("command", "mapping", "inventory", "plan", "review", "source-adapter",
                    "schemas", "catalogs", "object-kinds", "include-system-objects", "target-schemas"),
            WorkflowCommand.VALIDATE,
            Set.of("command", "plan"),
            WorkflowCommand.LOAD,
            Set.of("command", "mapping", "inventory", "plan", "mode", "source-adapter",
                    "schemas", "catalogs", "object-kinds", "include-system-objects",
                    "source-driver-jar", "source-driver-class",
                    "ack-adapter", "ack-source-driver", "ack-source-freeze", "ack-control-schema-upgrade",
                    "target-schemas", "archive-dir"));

    public WorkflowCliOptions {
        command = Objects.requireNonNull(command, "command");
        catalogs = Collections.unmodifiableSet(new LinkedHashSet<>(
                Objects.requireNonNull(catalogs, "catalogs")));
        schemas = Collections.unmodifiableSet(new LinkedHashSet<>(Objects.requireNonNull(schemas, "schemas")));
        objectKinds = Objects.requireNonNull(objectKinds, "objectKinds");
        objectKinds = objectKinds.isEmpty()
                ? Set.of()
                : Collections.unmodifiableSet(EnumSet.copyOf(objectKinds));
        sourceDriverJars = List.copyOf(Objects.requireNonNull(sourceDriverJars, "sourceDriverJars"));
        mode = Objects.requireNonNull(mode, "mode");
        targetSchemas = Set.copyOf(Objects.requireNonNull(targetSchemas, "targetSchemas"));
    }

    public static WorkflowCliOptions parse(ApplicationArguments arguments) {
        Objects.requireNonNull(arguments, "arguments");
        if (!arguments.getNonOptionArgs().isEmpty()) {
            throw new IllegalArgumentException("workflow CLI does not accept non-option arguments");
        }
        WorkflowCommand command = parseCommand(required(arguments, "command"));
        Set<String> unknown = new LinkedHashSet<>(arguments.getOptionNames());
        unknown.removeAll(ALLOWED.get(command));
        if (!unknown.isEmpty()) {
            throw new IllegalArgumentException("unknown workflow option: " + unknown.stream().sorted().toList());
        }

        boolean sourceCommand = command == WorkflowCommand.DISCOVER || command == WorkflowCommand.PROFILE
                || command == WorkflowCommand.PLAN || command == WorkflowCommand.LOAD;
        boolean suggestCommand = command == WorkflowCommand.TERM_SUGGEST;
        boolean generateCommand = command == WorkflowCommand.MAPPING_GENERATE;
        // mapping-generate 의 --mapping 은 만들 mapping(출력)이다.
        Path mapping = requiredPath(arguments, command, "mapping", sourceCommand || suggestCommand || generateCommand);
        Path inventory = requiredPath(arguments, command, "inventory", sourceCommand || generateCommand);
        Path skeleton = requiredPath(arguments, command, "skeleton", generateCommand);
        Path ledger = requiredPath(arguments, command, "ledger", generateCommand);
        Path plan = requiredPath(arguments, command, "plan", command == WorkflowCommand.PLAN
                || command == WorkflowCommand.VALIDATE || command == WorkflowCommand.LOAD);
        Path profile = requiredPath(arguments, command, "profile",
                command == WorkflowCommand.PROFILE || suggestCommand);
        Long profileRowLimit = positiveLong(arguments, "profile-row-limit");
        Path appSource = requiredPath(arguments, command, "app-source", command == WorkflowCommand.APP_SCAN);
        Path appUsage = requiredPath(arguments, command, "app-usage", command == WorkflowCommand.APP_SCAN);
        Path suggestions = requiredPath(arguments, command, "suggestions", suggestCommand);
        Path ledgerDraft = optionalPath(arguments, "ledger-draft");
        String metaSchema = Objects.requireNonNullElse(optional(arguments, "meta-schema"), "public");
        if (suggestCommand) {
            requireDistinct("--suggestions 와 --ledger-draft 는 서로 다르고 입력 파일과도 다른 경로여야 합니다",
                    suggestions, ledgerDraft, mapping, profile, appUsage);
        }
        if (generateCommand) {
            requireDistinct("--mapping(만들 mapping)은 --skeleton·--ledger·--inventory 와 다른 경로여야 합니다",
                    mapping, null, skeleton, ledger, inventory);
        }
        Path review = optionalPath(arguments, "review");
        String sourceAdapter = optional(arguments, "source-adapter");
        Set<String> catalogs = parseCsv(arguments, "catalogs");
        Set<String> schemas = parseCsv(arguments, "schemas");
        Set<ObjectKind> objectKinds = parseObjectKinds(arguments);
        boolean includeSystemObjects = flag(arguments, "include-system-objects");
        List<Path> sourceDriverJars = repeatablePaths(arguments, "source-driver-jar");
        String sourceDriverClass = optional(arguments, "source-driver-class");
        if (sourceDriverClass != null && sourceDriverJars.isEmpty()) {
            throw new IllegalArgumentException(
                    "--source-driver-class에는 하나 이상의 --source-driver-jar가 필요합니다");
        }
        MigrationMode mode = command == WorkflowCommand.LOAD
                ? MigrationMode.parse(Objects.requireNonNullElse(optional(arguments, "mode"), "dry-run"))
                : MigrationMode.DRY_RUN;
        String acknowledgement = optional(arguments, "ack-adapter");
        String sourceDriverAcknowledgement = optionalDigest(arguments, "ack-source-driver");
        boolean freeze = flag(arguments, "ack-source-freeze");
        // [ADR-0029 L3c] 이미 있는 제어 스키마를 올리는 확인. dry-run 은 대상 제어 스키마를 건드리지 않으므로 받지 않는다.
        boolean controlSchemaUpgrade = flag(arguments, "ack-control-schema-upgrade");
        if (controlSchemaUpgrade && mode != MigrationMode.COMMIT) {
            throw new IllegalArgumentException("--ack-control-schema-upgrade 는 --mode=commit 에서만 씁니다");
        }
        Set<String> targetSchemas = arguments.containsOption("target-schemas")
                ? parseCsv(arguments, "target-schemas") : Set.of("public");
        // [ADR-0029 L3e] 보관 덤프·격리 키 반출 디렉터리. 위치 검사(절대 경로·링크·승인 산출물·Git 트리)는 load 가 한다.
        Path archiveDir = optionalPath(arguments, "archive-dir");
        if (archiveDir != null && mode != MigrationMode.COMMIT) {
            throw new IllegalArgumentException("--archive-dir 는 commit 에서만 씁니다 — dry-run 은 보관 파일을 쓰지 않습니다");
        }
        return new WorkflowCliOptions(
                command, mapping, inventory, plan, review, sourceAdapter,
                catalogs, schemas, objectKinds, includeSystemObjects,
                sourceDriverJars, sourceDriverClass, mode,
                acknowledgement, sourceDriverAcknowledgement, freeze, targetSchemas,
                profile, profileRowLimit, appSource, appUsage, suggestions, ledgerDraft, metaSchema,
                skeleton, ledger, controlSchemaUpgrade, archiveDir);
    }

    /** 출력 파일(앞의 두 경로)이 서로 같거나 입력 파일과 같으면 한쪽이 조용히 덮이므로 거부한다. */
    private static void requireDistinct(String message, Path firstOutput, Path secondOutput, Path... inputs) {
        Set<Path> seen = new LinkedHashSet<>();
        for (Path input : inputs) {
            if (input != null) {
                seen.add(input.toAbsolutePath().normalize());
            }
        }
        for (Path output : new Path[] {firstOutput, secondOutput}) {
            if (output != null && !seen.add(output.toAbsolutePath().normalize())) {
                throw new IllegalArgumentException(message);
            }
        }
    }

    private static WorkflowCommand parseCommand(String value) {
        return switch (value) {
            case "discover" -> WorkflowCommand.DISCOVER;
            case "profile" -> WorkflowCommand.PROFILE;
            case "app-scan" -> WorkflowCommand.APP_SCAN;
            case "term-suggest" -> WorkflowCommand.TERM_SUGGEST;
            case "mapping-generate" -> WorkflowCommand.MAPPING_GENERATE;
            case "plan" -> WorkflowCommand.PLAN;
            case "validate" -> WorkflowCommand.VALIDATE;
            case "load" -> WorkflowCommand.LOAD;
            default -> throw new IllegalArgumentException("unsupported --command;"
                    + " discover|profile|app-scan|term-suggest|mapping-generate|plan|validate|load required");
        };
    }

    private static Long positiveLong(ApplicationArguments arguments, String name) {
        String value = optional(arguments, name);
        if (value == null) {
            return null;
        }
        try {
            long parsed = Long.parseLong(value);
            if (parsed > 0) {
                return parsed;
            }
        } catch (NumberFormatException failure) {
            // 아래에서 같은 문구로 거부한다.
        }
        throw new IllegalArgumentException("--" + name + "는 1 이상의 정수여야 합니다");
    }

    private static Path requiredPath(
            ApplicationArguments arguments,
            WorkflowCommand command,
            String name,
            boolean required
    ) {
        String value = optional(arguments, name);
        if (value == null) {
            if (required) {
                throw new IllegalArgumentException("--" + name + " is required for "
                        + command.name().toLowerCase(Locale.ROOT));
            }
            return null;
        }
        return path(value);
    }

    private static Path optionalPath(ApplicationArguments arguments, String name) {
        String value = optional(arguments, name);
        return value == null ? null : path(value);
    }

    private static List<Path> repeatablePaths(ApplicationArguments arguments, String name) {
        List<String> values = arguments.getOptionValues(name);
        if (values == null) {
            return List.of();
        }
        if (values.isEmpty() || values.stream().anyMatch(value -> value == null || value.isBlank())) {
            throw new IllegalArgumentException("--" + name + "에는 각 선언마다 경로 값이 필요합니다");
        }
        try {
            return values.stream().map(WorkflowCliOptions::driverJarPath).toList();
        } catch (RuntimeException failure) {
            throw new IllegalArgumentException("workflow path is invalid");
        }
    }

    private static Path driverJarPath(String value) {
        if (isUriLike(value) || containsGlob(value)) {
            throw new IllegalArgumentException("workflow path is invalid");
        }
        return path(value);
    }

    private static boolean isUriLike(String value) {
        int colon = value.indexOf(':');
        if (colon < 1 || colon == 1 && Character.isLetter(value.charAt(0))) {
            return false;
        }
        if (!Character.isLetter(value.charAt(0))) {
            return false;
        }
        for (int index = 1; index < colon; index++) {
            char candidate = value.charAt(index);
            if (!Character.isLetterOrDigit(candidate)
                    && candidate != '+' && candidate != '-' && candidate != '.') {
                return false;
            }
        }
        return true;
    }

    private static boolean containsGlob(String value) {
        return value.indexOf('*') >= 0 || value.indexOf('?') >= 0
                || value.indexOf('[') >= 0 || value.indexOf(']') >= 0
                || value.indexOf('{') >= 0 || value.indexOf('}') >= 0;
    }

    private static Path path(String value) {
        try {
            return Path.of(value);
        } catch (InvalidPathException failure) {
            throw new IllegalArgumentException("workflow path is invalid");
        }
    }

    private static Set<String> parseCsv(ApplicationArguments arguments, String name) {
        List<String> values = arguments.getOptionValues(name);
        if (values == null) {
            return Set.of();
        }
        if (values.size() != 1) {
            throw new IllegalArgumentException(
                    "--" + name + "는 한 번만 선언해야 합니다");
        }
        LinkedHashSet<String> parsed = new LinkedHashSet<>();
        for (String candidate : values.getFirst().split(",", -1)) {
            String item = candidate.trim();
            if (item.isEmpty() || !parsed.add(item)) {
                throw new IllegalArgumentException(
                        "workflow scope CSV cannot contain blank or duplicate values");
            }
        }
        return parsed;
    }

    private static Set<ObjectKind> parseObjectKinds(ApplicationArguments arguments) {
        Set<String> names = parseCsv(arguments, "object-kinds");
        if (names.isEmpty()) {
            return EnumSet.allOf(ObjectKind.class);
        }
        EnumSet<ObjectKind> kinds = EnumSet.noneOf(ObjectKind.class);
        try {
            names.forEach(name -> kinds.add(ObjectKind.valueOf(name)));
        } catch (IllegalArgumentException failure) {
            throw new IllegalArgumentException("workflow object kind is invalid");
        }
        return kinds;
    }

    private static boolean flag(ApplicationArguments arguments, String name) {
        List<String> values = arguments.getOptionValues(name);
        if (values == null) {
            return false;
        }
        if (!values.isEmpty()) {
            throw new IllegalArgumentException("--" + name + " acknowledgement는 값 없이 선언해야 합니다");
        }
        return true;
    }

    private static String required(ApplicationArguments arguments, String name) {
        String value = optional(arguments, name);
        if (value == null) {
            throw new IllegalArgumentException("--" + name + " is required");
        }
        return value;
    }

    private static String optional(ApplicationArguments arguments, String name) {
        List<String> values = arguments.getOptionValues(name);
        if (values == null) {
            return null;
        }
        if (values.size() != 1 || values.getFirst() == null || values.getFirst().isBlank()) {
            throw new IllegalArgumentException("--" + name + " must have exactly one non-blank value");
        }
        return values.getFirst();
    }

    private static String optionalDigest(ApplicationArguments arguments, String name) {
        String value = optional(arguments, name);
        if (value != null && !value.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException("workflow evidence acknowledgement is invalid");
        }
        return value;
    }

    @Override
    public String toString() {
        return "WorkflowCliOptions[command=" + command + ", values=<redacted>]";
    }

    public DiscoveryRequest discoveryRequest() {
        return new DiscoveryRequest(catalogs, schemas, objectKinds, includeSystemObjects);
    }
}
