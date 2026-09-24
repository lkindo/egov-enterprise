package nuri.api.harness;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

/**
 * Generated artifacts keep an independent, explicit source population. A missing file is never
 * inferred to be an optional domain: only a removal recorded by the source projection plan is optional.
 * Production edits remain possible; source additions/removals and census changes require a reviewed
 * projection-manifest change, which the separate baseline integrity gate also records.
 */
public final class ReusableHarnessProfile {
    private static final String MANIFEST = "config/governance/reusable-harness-profile.json";
    private static final List<String> MODULES = List.of("foundation", "business-core", "business-app", "api-server");
    private static final ReusableHarnessProfile CURRENT = load(HarnessSourceIndex.repoRoot());
    private final Path root;
    private final JsonNode projection;

    private ReusableHarnessProfile(Path root, JsonNode projection) {
        this.root = root;
        this.projection = projection;
    }

    public static ReusableHarnessProfile current() { return CURRENT; }
    public boolean projected() { return projection != null; }
    boolean customDomains() { return projected() && "custom".equals(projection.path("profile").asString()); }

    public int count(String key, int canonical) {
        if (!projected()) return canonical;
        JsonNode value = projection.path("census").path(key);
        if (!value.isIntegralNumber() || value.intValue() < 0) {
            throw new IllegalStateException("Missing/invalid projected harness census: " + key);
        }
        return value.intValue();
    }

    boolean retainsSource(String path) {
        if (!projected()) return true;
        String relative = path.split("#", 2)[0];
        if (contains("retained", "path", relative)) {
            if (!Files.isRegularFile(root.resolve(relative))) {
                throw new IllegalStateException("Required projected source disappeared: " + relative);
            }
            return true;
        }
        if (contains("removed", "path", relative)) return false;
        throw new IllegalStateException("Unregistered source cannot be treated as a removed domain: " + relative);
    }

    boolean retainsType(String target) {
        if (!projected() || target.startsWith("EXTERNAL#")) return true;
        // Census entries use binary names for nested DTOs; ownership belongs to their source file.
        String name = target.split("#", 2)[0].split("\\$", 2)[0];
        List<JsonNode> matches = new ArrayList<>();
        for (String collection : List.of("retained", "removed")) {
            for (JsonNode row : projection.path(collection)) {
                String fqcn = row.path("type").asString();
                if (fqcn.equals(name) || fqcn.substring(fqcn.lastIndexOf('.') + 1).equals(name)) matches.add(row);
            }
        }
        if (matches.size() != 1) throw new IllegalStateException("Ambiguous/unregistered projected type: " + name);
        return retainsSource(matches.getFirst().path("path").asString());
    }

    private boolean contains(String collection, String field, String value) {
        for (JsonNode row : projection.path(collection)) if (value.equals(row.path(field).asString())) return true;
        return false;
    }

    static ReusableHarnessProfile load(Path root) {
        try {
            ObjectMapper mapper = JsonMapper.builder().configureForJackson2().build();
            JsonNode profiles = mapper.readTree(root.resolve("config/reusable-base-profiles.json").toFile());
            Path lockPath = root.resolve("reusable-base-lock.json");
            boolean marked = !profiles.path("sourcePolicy").path("generatedProfile").isMissingNode();
            if (!marked && !Files.exists(lockPath) && !Files.exists(root.resolve(MANIFEST))) {
                return new ReusableHarnessProfile(root, null);
            }
            JsonNode manifest = mapper.readTree(root.resolve(MANIFEST).toFile());
            JsonNode lock = mapper.readTree(lockPath.toFile());
            String profile = manifest.path("profile").asString();
            if (manifest.path("schemaVersion").asInt() != 1 || profile.isBlank()
                    || !profile.equals(profiles.path("sourcePolicy").path("generatedProfile").asString())
                    || !profile.equals(lock.path("profile").asString())
                    || !manifest.path("packs").equals(lock.path("packs"))
                    || !manifest.path("packs").equals(profiles.path("profiles").path(profile).path("packs"))
                    || !manifest.path("excludedDomains").equals(lock.path("java").path("excludedDomains"))
                    || !manifest.path("sourceCommit").equals(lock.path("sourceCommit"))) {
                throw new IllegalStateException("Reusable harness profile/lock/source scope mismatch");
            }
            String digest = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(HarnessSourceIndex.read(root.resolve("config/reusable-base-profiles.json"))
                            .getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            if (!digest.equals(manifest.path("profileManifestSha256").asString())) {
                throw new IllegalStateException("Reusable harness profile manifest hash mismatch");
            }
            Set<String> expected = new TreeSet<>();
            for (JsonNode row : manifest.path("retained")) {
                String path = row.path("path").asString();
                Path resolved = root.resolve(path).normalize();
                if (path.isBlank() || !resolved.startsWith(root.normalize()) || !expected.add(path)) {
                    throw new IllegalStateException("Invalid/duplicate projected source path: " + path);
                }
            }
            Set<String> actual = new TreeSet<>();
            for (String module : MODULES) {
                Path sourceRoot = root.resolve(module + "/src/main/java");
                if (!Files.isDirectory(sourceRoot)) throw new IllegalStateException("Required source root missing: " + sourceRoot);
                HarnessSourceIndex.javaSources(sourceRoot).stream().filter(Files::isRegularFile)
                        .forEach(path -> actual.add(root.relativize(path).toString().replace('\\', '/')));
            }
            if (expected.isEmpty() || !expected.equals(actual)) {
                Set<String> missing = new TreeSet<>(expected); missing.removeAll(actual);
                Set<String> unknown = new TreeSet<>(actual); unknown.removeAll(expected);
                throw new IllegalStateException("Projected source population drift: missing=" + missing + ", unknown=" + unknown);
            }
            return new ReusableHarnessProfile(root, manifest);
        } catch (IOException error) {
            throw new UncheckedIOException("Reusable harness projection evidence is missing/unreadable", error);
        } catch (java.security.NoSuchAlgorithmException error) {
            throw new IllegalStateException(error);
        }
    }
}
