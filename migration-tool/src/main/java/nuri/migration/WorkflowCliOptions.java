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
        boolean sourceFreezeAcknowledged
) {

    private static final Map<WorkflowCommand, Set<String>> ALLOWED = Map.of(
            WorkflowCommand.DISCOVER,
            Set.of("command", "mapping", "inventory", "source-adapter", "schemas",
                    "catalogs", "object-kinds", "include-system-objects",
                    "source-driver-jar", "source-driver-class"),
            WorkflowCommand.PLAN,
            Set.of("command", "mapping", "inventory", "plan", "review", "source-adapter",
                    "schemas", "catalogs", "object-kinds", "include-system-objects"),
            WorkflowCommand.VALIDATE,
            Set.of("command", "plan"),
            WorkflowCommand.LOAD,
            Set.of("command", "mapping", "inventory", "plan", "mode", "source-adapter",
                    "schemas", "catalogs", "object-kinds", "include-system-objects",
                    "source-driver-jar", "source-driver-class",
                    "ack-adapter", "ack-source-driver", "ack-source-freeze"));

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

        Path mapping = requiredPath(arguments, command, "mapping",
                command == WorkflowCommand.DISCOVER || command == WorkflowCommand.PLAN || command == WorkflowCommand.LOAD);
        Path inventory = requiredPath(arguments, command, "inventory",
                command == WorkflowCommand.DISCOVER || command == WorkflowCommand.PLAN || command == WorkflowCommand.LOAD);
        Path plan = requiredPath(arguments, command, "plan", command != WorkflowCommand.DISCOVER);
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
        return new WorkflowCliOptions(
                command, mapping, inventory, plan, review, sourceAdapter,
                catalogs, schemas, objectKinds, includeSystemObjects,
                sourceDriverJars, sourceDriverClass, mode,
                acknowledgement, sourceDriverAcknowledgement, freeze);
    }

    private static WorkflowCommand parseCommand(String value) {
        return switch (value) {
            case "discover" -> WorkflowCommand.DISCOVER;
            case "plan" -> WorkflowCommand.PLAN;
            case "validate" -> WorkflowCommand.VALIDATE;
            case "load" -> WorkflowCommand.LOAD;
            default -> throw new IllegalArgumentException(
                    "unsupported --command; discover|plan|validate|load required");
        };
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
            return values.stream().map(WorkflowCliOptions::path).toList();
        } catch (RuntimeException failure) {
            throw new IllegalArgumentException("workflow path is invalid");
        }
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
