package nuri.migration.discovery;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;

/**
 * Stable identity 충돌을 무통지 overwrite로 바꾸지 않는 inventory accumulator다.
 *
 * <p>동일 객체의 반복 행은 제거하고, baseline과 vendor enrichment의 비충돌 정보는
 * 순서와 무관하게 합친다. 같은 stable ID에 상충 내용이 나타나면 canonical 객체
 * 하나만 보존하면서 blocking visibility finding을 남긴다.</p>
 */
public final class CatalogObjectRegistry {

    public static final String COLLISION_OPERATION = "catalog-object-stable-id-collision";

    private final Map<String, CatalogObject> objects = new LinkedHashMap<>();
    private final Map<String, List<CatalogObject>> candidates = new LinkedHashMap<>();
    private final Set<String> reportedCollisions = new LinkedHashSet<>();
    private final List<VisibilityFinding> findings;

    public CatalogObjectRegistry(List<VisibilityFinding> findings) {
        this.findings = Objects.requireNonNull(findings, "findings");
    }

    public void add(CatalogObject object, String sourceOperation) {
        Objects.requireNonNull(object, "object");
        requireText(sourceOperation, "sourceOperation");
        String stableId = object.stableId();
        List<CatalogObject> stableCandidates = candidates.computeIfAbsent(
                stableId, ignored -> new ArrayList<>());
        if (stableCandidates.contains(object)) {
            return;
        }
        stableCandidates.add(object);
        Reduction reduction = reduce(stableCandidates);
        objects.put(stableId, reduction.object());
        if (!reduction.collision() || !reportedCollisions.add(stableId)) {
            return;
        }
        findings.add(new VisibilityFinding(
                VisibilityStatus.UNREADABLE,
                reduction.object().kind(),
                reduction.object().catalog(),
                reduction.object().schema(),
                COLLISION_OPERATION,
                "different catalog objects resolved to the same stable identity; objects were not merged: "
                        + stableId,
                null));
    }

    private static Reduction reduce(List<CatalogObject> candidates) {
        List<CatalogObject> ordered = candidates.stream()
                .sorted(Comparator.comparing(CatalogObjectRegistry::canonicalContentKey)
                        .thenComparing(CatalogObjectRegistry::canonicalContentMaterial))
                .toList();
        CatalogObject canonical = ordered.get(0);
        boolean collision = false;
        for (int index = 1; index < ordered.size(); index++) {
            CatalogObject merged = merge(canonical, ordered.get(index));
            if (merged == null) {
                collision = true;
            } else {
                canonical = merged;
            }
        }
        return new Reduction(canonical, collision);
    }

    private static CatalogObject merge(CatalogObject first, CatalogObject second) {
        if (!first.hasSameStableIdentityMaterial(second)) {
            return null;
        }
        if (!definitionConsistent(first) || !definitionConsistent(second)) {
            return null;
        }
        String firstHash = effectiveDefinitionHash(first);
        String secondHash = effectiveDefinitionHash(second);
        if (firstHash != null && secondHash != null && !firstHash.equals(secondHash)) {
            return null;
        }
        String mergedHash = firstHash != null ? firstHash : secondHash;

        String mergedDefinition;
        if (first.nativeDefinition() == null) {
            mergedDefinition = second.nativeDefinition();
        } else if (second.nativeDefinition() == null || first.nativeDefinition().equals(second.nativeDefinition())) {
            mergedDefinition = first.nativeDefinition();
        } else {
            return null;
        }

        TreeMap<String, String> mergedAttributes = new TreeMap<>(first.attributes());
        for (Map.Entry<String, String> attribute : second.attributes().entrySet()) {
            if (mergedAttributes.containsKey(attribute.getKey())
                    && !Objects.equals(mergedAttributes.get(attribute.getKey()), attribute.getValue())) {
                return null;
            }
            mergedAttributes.put(attribute.getKey(), attribute.getValue());
        }
        return new CatalogObject(
                first.kind(),
                first.catalog(),
                first.schema(),
                first.name(),
                first.quoted(),
                mergedDefinition,
                mergedHash,
                first.canonicalDependencies(),
                mergedAttributes);
    }

    private static String effectiveDefinitionHash(CatalogObject object) {
        if (object.nativeDefinition() == null) {
            return object.definitionHash();
        }
        String actual = CatalogObject.definitionHash(object.nativeDefinition());
        return object.definitionHash() == null || object.definitionHash().equals(actual)
                ? actual
                : null;
    }

    private static boolean definitionConsistent(CatalogObject object) {
        return object.nativeDefinition() == null
                || object.definitionHash() == null
                || object.definitionHash().equals(CatalogObject.definitionHash(object.nativeDefinition()));
    }

    private static String canonicalContentKey(CatalogObject object) {
        return CatalogObject.definitionHash(canonicalContentMaterial(object));
    }

    private static String canonicalContentMaterial(CatalogObject object) {
        StringBuilder material = new StringBuilder();
        appendLengthPrefixed(material, object.stableId());
        appendLengthPrefixed(material, effectiveDefinitionHash(object));
        appendLengthPrefixed(material, object.definitionHash());
        appendLengthPrefixed(material, object.nativeDefinition() == null
                ? null
                : CatalogObject.definitionHash(object.nativeDefinition()));
        for (CatalogObject.ObjectReference dependency : object.canonicalDependencies()) {
            appendLengthPrefixed(material, dependency.kind().name());
            appendLengthPrefixed(material, dependency.catalog());
            appendLengthPrefixed(material, dependency.schema());
            appendLengthPrefixed(material, dependency.name());
        }
        new TreeMap<>(object.attributes()).forEach((key, value) -> {
            appendLengthPrefixed(material, key);
            appendLengthPrefixed(material, value);
        });
        return material.toString();
    }

    private static void appendLengthPrefixed(StringBuilder target, String value) {
        if (value == null) {
            target.append("-1:");
            return;
        }
        target.append(value.length()).append(':').append(value);
    }

    public List<CatalogObject> objects() {
        return List.copyOf(objects.values());
    }

    private static String requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        return value;
    }

    private record Reduction(CatalogObject object, boolean collision) {}
}
