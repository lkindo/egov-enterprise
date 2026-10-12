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
 *
 * <p>생성물 표지는 매니페스트 v2 의 활성 구성(config/modules/presets.json 의 {@code active})이다(11단계 C5). 표지·lock·투영 기록 가운데
 * 하나라도 있으면 생성물로 보고 셋이 서로 맞아야 한다 — 표지 없이 lock 만 있거나, 원본 presets.json 에 표지만 넣어 계획 대조를 끄는
 * 경로는 실패한다(presets 가 정확히 그 하나여야 하고 기록이 그 파일 해시에 결속된다).
 */
public final class ReusableHarnessProfile {
    private static final String MANIFEST = "config/governance/reusable-harness-profile.json";
    private static final String PRESETS = "config/modules/presets.json";
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
            JsonNode presets = mapper.readTree(root.resolve(PRESETS).toFile());
            Path lockPath = root.resolve("reusable-base-lock.json");
            boolean marked = !presets.path("active").isMissingNode();
            if (!marked && !Files.exists(lockPath) && !Files.exists(root.resolve(MANIFEST))) {
                return new ReusableHarnessProfile(root, null);
            }
            if (!marked) {
                // lock·하네스 프로필이 있는 생성물인데 표지가 없으면 원본으로 보지 않는다(11단계 C5 — node 의 생성물 판정과 같다).
                throw new IllegalStateException("Reusable harness profile requires the generated composition marker: " + PRESETS);
            }
            JsonNode manifest = mapper.readTree(root.resolve(MANIFEST).toFile());
            JsonNode lock = mapper.readTree(lockPath.toFile());
            String profile = manifest.path("profile").asString();
            JsonNode active = presets.path("presets");
            Set<String> activeDomains = new TreeSet<>();
            for (JsonNode domain : active.path(0).path("domains")) activeDomains.add(domain.asString());
            Set<String> recordedDomains = new TreeSet<>();
            for (JsonNode domain : manifest.path("domains")) recordedDomains.add(domain.asString());
            if (manifest.path("schemaVersion").asInt() != 2 || profile.isBlank()
                    || !profile.equals(presets.path("active").asString())
                    || !active.isArray() || active.size() != 1 || !profile.equals(active.path(0).path("id").asString())
                    || !profile.equals(lock.path("profile").asString())
                    || !manifest.path("domains").equals(lock.path("composition").path("resolvedDomains"))
                    || !activeDomains.equals(recordedDomains)
                    || !manifest.path("excludedDomains").equals(lock.path("java").path("excludedDomains"))
                    || !manifest.path("sourceCommit").equals(lock.path("sourceCommit"))) {
                throw new IllegalStateException("Reusable harness profile/lock/source scope mismatch");
            }
            String digest = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(HarnessSourceIndex.read(root.resolve(PRESETS))
                            .getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            if (!digest.equals(manifest.path("presetsSha256").asString())) {
                throw new IllegalStateException("Reusable harness profile composition hash mismatch");
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
