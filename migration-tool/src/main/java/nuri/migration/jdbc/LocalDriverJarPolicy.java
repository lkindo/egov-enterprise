package nuri.migration.jdbc;

import java.nio.file.FileStore;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.jar.Attributes;
import java.util.jar.JarFile;

/** 외부 driver는 명시된 로컬 regular JAR만 허용하고 링크·중복·원격 경계를 차단한다. */
public final class LocalDriverJarPolicy {

    private static final java.util.Set<String> KNOWN_LOCAL_FILE_SYSTEMS = java.util.Set.of(
            "ntfs", "refs", "fat", "fat32", "exfat",
            "ext2", "ext3", "ext4", "xfs", "btrfs", "zfs",
            "apfs", "hfs", "hfs+", "ufs", "vxfs",
            "tmpfs", "ramfs", "overlay", "iso9660", "udf");

    public List<ValidatedDriverJar> validate(List<Path> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            throw SourceDriverException.policy();
        }
        try {
            List<ValidatedDriverJar> validated = new ArrayList<>();
            for (Path candidate : candidates) {
                ValidatedDriverJar jar = validateOne(candidate);
                rejectDuplicate(validated, jar);
                validated.add(jar);
            }
            return List.copyOf(validated);
        } catch (SourceDriverException failure) {
            throw failure;
        } catch (Exception failure) {
            throw SourceDriverException.policy();
        }
    }

    private static ValidatedDriverJar validateOne(Path candidate) throws Exception {
        Objects.requireNonNull(candidate, "candidate");
        String raw = candidate.toString();
        if (!candidate.isAbsolute()
                || !"file".equalsIgnoreCase(candidate.getFileSystem().provider().getScheme())
                || raw.startsWith("\\\\") || raw.startsWith("//")
                || containsGlob(raw)
                || candidate.getFileName() == null
                || !candidate.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".jar")) {
            throw SourceDriverException.policy();
        }
        Path normalized = candidate.normalize();
        rejectLinks(normalized);
        if (!Files.isRegularFile(normalized, LinkOption.NOFOLLOW_LINKS)) {
            throw SourceDriverException.policy();
        }
        FileStore store = Files.getFileStore(normalized);
        if (!isKnownLocalFileSystem(store.type())) {
            throw SourceDriverException.policy();
        }
        Path real = normalized.toRealPath(LinkOption.NOFOLLOW_LINKS);
        String digest = DriverJarDigests.sha256(real);
        validateArchive(real);
        return new ValidatedDriverJar(real, digest);
    }

    static boolean isKnownLocalFileSystem(String type) {
        return type != null && KNOWN_LOCAL_FILE_SYSTEMS.contains(type.toLowerCase(Locale.ROOT));
    }

    static void validateArchive(Path jarPath) throws Exception {
        try (JarFile jar = new JarFile(jarPath.toFile(), false)) {
            // Manifest Class-Path would silently expand the approved URL set.
            if (jar.getManifest() != null
                    && jar.getManifest().getMainAttributes()
                    .getValue(Attributes.Name.CLASS_PATH) != null) {
                throw SourceDriverException.policy();
            }
        }
    }

    private static void rejectLinks(Path path) throws Exception {
        Path current = path.getRoot();
        if (current == null) {
            throw SourceDriverException.policy();
        }
        for (Path name : path) {
            current = current.resolve(name);
            BasicFileAttributes attributes = Files.readAttributes(
                    current, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
            if (attributes.isSymbolicLink() || !current.equals(path) && attributes.isOther()) {
                throw SourceDriverException.policy();
            }
        }
    }

    private static void rejectDuplicate(
            List<ValidatedDriverJar> accepted,
            ValidatedDriverJar candidate
    ) throws Exception {
        for (ValidatedDriverJar existing : accepted) {
            if (existing.path().equals(candidate.path())
                    || Files.isSameFile(existing.path(), candidate.path())) {
                throw SourceDriverException.policy();
            }
        }
    }

    private static boolean containsGlob(String value) {
        return value.indexOf('*') >= 0 || value.indexOf('?') >= 0
                || value.indexOf('[') >= 0 || value.indexOf(']') >= 0
                || value.indexOf('{') >= 0 || value.indexOf('}') >= 0;
    }
}
