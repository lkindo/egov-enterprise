package nuri.migration.artifact;

import nuri.migration.adapter.AdapterIdentity;
import nuri.migration.adapter.SourceAdapter;
import nuri.migration.adapter.SourceReadSessionPolicy;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.model.MappingSpec;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.transform.TypeConverter;
import nuri.migration.validate.MappingValidator;
import nuri.migration.verify.MigrationVerifier;
import nuri.migration.workflow.SourceLoadSurfaceGate;

import java.io.IOException;
import java.io.InputStream;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.jar.JarFile;

/** 승인 plan을 실제 실행 바이트·adapter 정책·선택 transformer 계약에 결속한다. */
public record MigrationExecutionContract(
        int schemaVersion,
        String moduleImplementationDigest,
        Map<String, String> coreClassDigests,
        AdapterContract adapter,
        String transformerContractDigest
) {

    public static final int CURRENT_SCHEMA_VERSION = 1;
    private static final List<Class<?>> CORE_CLASSES = List.of(
            EtlExecutor.class,
            TypeConverter.class,
            MappingValidator.class,
            MigrationVerifier.class,
            SourceLoadSurfaceGate.class);

    public MigrationExecutionContract {
        if (schemaVersion != CURRENT_SCHEMA_VERSION) {
            throw new IllegalArgumentException("unsupported migration execution contract version");
        }
        moduleImplementationDigest = requireText(
                moduleImplementationDigest, "moduleImplementationDigest");
        coreClassDigests = Map.copyOf(Objects.requireNonNull(coreClassDigests, "coreClassDigests"));
        adapter = Objects.requireNonNull(adapter, "adapter");
        transformerContractDigest = requireText(
                transformerContractDigest, "transformerContractDigest");
    }

    public static MigrationExecutionContract capture(
            MappingSpec mapping,
            SourceAdapter adapter,
            TransformerRegistry transformers
    ) {
        Objects.requireNonNull(mapping, "mapping");
        Objects.requireNonNull(adapter, "adapter");
        Objects.requireNonNull(transformers, "transformers");
        LinkedHashMap<String, String> core = new LinkedHashMap<>();
        CORE_CLASSES.stream().sorted(Comparator.comparing(Class::getName))
                .forEach(type -> core.put(type.getName(), classDigest(type)));
        List<String> selected = mapping.tables().stream()
                .flatMap(table -> table.columns().stream())
                .map(MappingSpec.ColumnMapping::transform)
                .filter(value -> value != null && !value.isBlank())
                .distinct().sorted().toList();
        String transformerDigest = transformers.executionContractDigest(
                selected, classDigest(TransformerRegistry.class));
        ModuleImplementation module = moduleImplementation();
        return new MigrationExecutionContract(
                CURRENT_SCHEMA_VERSION,
                module.digest(),
                core,
                AdapterContract.from(adapter),
                transformerDigest);
    }

    public String digest() {
        return CanonicalArtifactDigest.sha256(this);
    }

    private static String classDigest(Class<?> type) {
        String resource = "/" + type.getName().replace('.', '/') + ".class";
        try (InputStream input = type.getResourceAsStream(resource)) {
            if (input == null) {
                throw new IllegalStateException("execution contract class bytes are unavailable");
            }
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) >= 0) {
                if (read > 0) {
                    digest.update(buffer, 0, read);
                }
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (IOException failure) {
            throw new IllegalStateException("execution contract class bytes are unavailable");
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is required by the Java platform");
        }
    }

    /** JAR 배포면 JAR 전체 bytes, exploded 배포면 migration-tool class와 Flyway resource bytes를 결속한다. */
    private static ModuleImplementation moduleImplementation() {
        return computeModuleImplementation();
    }

    private static ModuleImplementation computeModuleImplementation() {
        Path codeSource = codeSourcePath();
        if (Files.isRegularFile(codeSource, LinkOption.NOFOLLOW_LINKS)) {
            return jarImplementation(codeSource);
        }
        if (Files.isDirectory(codeSource, LinkOption.NOFOLLOW_LINKS)) {
            return directoryImplementation(codeSource, resourceRootPath());
        }
        throw new IllegalStateException("migration module implementation bytes are unavailable");
    }

    private static ModuleImplementation directoryImplementation(Path classesRoot, Path resourcesRoot) {
        Objects.requireNonNull(classesRoot, "classesRoot");
        Objects.requireNonNull(resourcesRoot, "resourcesRoot");
        Path packageRoot = classesRoot.resolve("nuri").resolve("migration");
        Path migrationResourceRoot = resourcesRoot.resolve("db").resolve("migration-tool");
        if (!Files.isDirectory(packageRoot, LinkOption.NOFOLLOW_LINKS)) {
            throw new IllegalStateException("migration module implementation bytes are unavailable");
        }
        if (!Files.isDirectory(migrationResourceRoot, LinkOption.NOFOLLOW_LINKS)) {
            throw new IllegalStateException("migration module implementation bytes are unavailable");
        }
        try {
            List<Path> classes;
            try (java.util.stream.Stream<Path> stream = Files.walk(packageRoot)) {
                classes = stream
                        .filter(path -> Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS))
                        .filter(path -> path.getFileName().toString().endsWith(".class"))
                        .toList();
            }
            List<Path> resources;
            try (java.util.stream.Stream<Path> stream = Files.walk(migrationResourceRoot)) {
                resources = stream
                        .filter(path -> Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS))
                        .toList();
            }
            if (classes.isEmpty() || resources.isEmpty()) {
                throw new IllegalStateException("migration module implementation bytes are unavailable");
            }
            List<ImplementationEntry> entries = java.util.stream.Stream.concat(
                            classes.stream().map(path -> new ImplementationEntry(
                                    entryName(classesRoot, path), path)),
                            resources.stream().map(path -> new ImplementationEntry(
                                    entryName(resourcesRoot, path), path)))
                    .sorted(Comparator.comparing(ImplementationEntry::name))
                    .toList();
            MessageDigest digest = newDigest();
            updateFramed(digest, "migration-module-directory-v2".getBytes(StandardCharsets.UTF_8));
            TreeSet<String> names = new TreeSet<>();
            for (ImplementationEntry entry : entries) {
                updateFramed(digest, entry.name().getBytes(StandardCharsets.UTF_8));
                updateFramed(digest, Files.readAllBytes(entry.path()));
                if (entry.name().startsWith("nuri/migration/")
                        && entry.name().endsWith(".class")) {
                    names.add(entry.name());
                }
            }
            return new ModuleImplementation(
                    HexFormat.of().formatHex(digest.digest()), Set.copyOf(names));
        } catch (IOException failure) {
            throw new IllegalStateException("migration module implementation bytes are unavailable");
        }
    }

    private static ModuleImplementation jarImplementation(Path jar) {
        MessageDigest digest = newDigest();
        TreeSet<String> names = new TreeSet<>();
        try (InputStream input = Files.newInputStream(jar); JarFile archive = new JarFile(jar.toFile())) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) >= 0) {
                if (read > 0) {
                    digest.update(buffer, 0, read);
                }
            }
            archive.stream()
                    .map(java.util.jar.JarEntry::getName)
                    .filter(name -> name.endsWith(".class"))
                    .filter(name -> name.startsWith("nuri/migration/")
                            || name.contains("/classes/nuri/migration/"))
                    .forEach(names::add);
        } catch (IOException failure) {
            throw new IllegalStateException("migration module implementation bytes are unavailable");
        }
        if (names.isEmpty()) {
            throw new IllegalStateException("migration module implementation bytes are unavailable");
        }
        return new ModuleImplementation(
                HexFormat.of().formatHex(digest.digest()), Set.copyOf(names));
    }

    private static Path codeSourcePath() {
        try {
            URL location = MigrationExecutionContract.class.getProtectionDomain()
                    .getCodeSource().getLocation();
            if (location == null || !"file".equalsIgnoreCase(location.getProtocol())) {
                throw new IllegalStateException("migration module implementation bytes are unavailable");
            }
            return Path.of(location.toURI()).toRealPath(LinkOption.NOFOLLOW_LINKS);
        } catch (IOException | URISyntaxException | NullPointerException failure) {
            throw new IllegalStateException("migration module implementation bytes are unavailable");
        }
    }

    private static Path resourceRootPath() {
        try {
            URL location = MigrationExecutionContract.class.getResource("/db/migration-tool");
            if (location == null || !"file".equalsIgnoreCase(location.getProtocol())) {
                throw new IllegalStateException("migration module implementation bytes are unavailable");
            }
            Path migrationRoot = Path.of(location.toURI()).toRealPath(LinkOption.NOFOLLOW_LINKS);
            Path databaseRoot = migrationRoot.getParent();
            Path resourcesRoot = databaseRoot == null ? null : databaseRoot.getParent();
            if (resourcesRoot == null
                    || !migrationRoot.equals(resourcesRoot.resolve("db").resolve("migration-tool")
                            .toRealPath(LinkOption.NOFOLLOW_LINKS))) {
                throw new IllegalStateException("migration module implementation bytes are unavailable");
            }
            return resourcesRoot;
        } catch (IOException | URISyntaxException | NullPointerException failure) {
            throw new IllegalStateException("migration module implementation bytes are unavailable");
        }
    }

    private static String entryName(Path root, Path path) {
        return root.relativize(path).toString().replace('\\', '/');
    }

    private static void updateFramed(MessageDigest digest, byte[] bytes) {
        digest.update(ByteBuffer.allocate(Long.BYTES).putLong(bytes.length).array());
        digest.update(bytes);
    }

    private static MessageDigest newDigest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is required by the Java platform");
        }
    }

    static Set<String> implementationClassNamesForTesting() {
        return moduleImplementation().classNames();
    }

    static String directoryImplementationDigestForTesting(Path classesRoot, Path resourcesRoot) {
        return directoryImplementation(classesRoot, resourcesRoot).digest();
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value;
    }

    /** 선택 adapter의 실행 의미만 포함하며 JDBC URL·credential은 포함하지 않는다. */
    public record AdapterContract(
            String adapterId,
            String databaseFamily,
            String versionPolicy,
            String identityEvidence,
            String isolationMode,
            boolean sourceFreezeRequired,
            boolean quotedIdentifiersSupported,
            boolean lobStreamingSupported,
            String executionPolicy,
            String policyEvidence,
            String mechanism
    ) {
        static AdapterContract from(SourceAdapter adapter) {
            AdapterIdentity identity = Objects.requireNonNull(adapter.identity(), "adapter identity");
            SourceReadSessionPolicy policy = Objects.requireNonNull(
                    adapter.sourceReadSessionPolicy(), "source read session policy");
            if (!adapter.id().equals(identity.adapterId())) {
                throw new IllegalStateException("adapter execution identity mismatch");
            }
            return new AdapterContract(
                    adapter.id(),
                    identity.databaseFamily().name(),
                    identity.versionPolicy(),
                    identity.evidenceLevel().name(),
                    policy.isolationMode().name(),
                    policy.sourceFreezeRequired(),
                    policy.quotedIdentifiersSupported(),
                    policy.lobStreamingSupported(),
                    policy.executionPolicy().name(),
                    policy.evidenceLevel().name(),
                    policy.mechanism());
        }
    }

    private record ModuleImplementation(String digest, Set<String> classNames) {
        private ModuleImplementation {
            digest = requireText(digest, "module implementation digest");
            classNames = Set.copyOf(Objects.requireNonNull(classNames, "classNames"));
        }
    }

    private record ImplementationEntry(String name, Path path) {}
}
