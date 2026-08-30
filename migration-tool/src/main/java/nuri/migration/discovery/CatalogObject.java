package nuri.migration.discovery;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Collections;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

/** 벤더 중립 객체 표현. 원본 식별자의 대소문자와 순서를 변경하지 않는다. */
public record CatalogObject(
        ObjectKind kind,
        String catalog,
        String schema,
        String name,
        boolean quoted,
        String nativeDefinition,
        String definitionHash,
        List<ObjectReference> dependencies,
        Map<String, String> attributes) {

    public CatalogObject {
        kind = Objects.requireNonNull(kind, "kind");
        name = requireText(name, "name");
        dependencies = List.copyOf(Objects.requireNonNull(dependencies, "dependencies"));
        attributes = Collections.unmodifiableMap(new LinkedHashMap<>(
                Objects.requireNonNull(attributes, "attributes")));
    }

    public String qualifiedName() {
        return Stream.of(catalog, schema, name)
                .filter(value -> value != null && !value.isBlank())
                .map(value -> quoted ? quote(value) : value)
                .reduce((left, right) -> left + "." + right)
                .orElse(name);
    }

    public String stableId() {
        MessageDigest digest = sha256();
        updateLengthPrefixed(digest, kind.name());
        updateLengthPrefixed(digest, catalog);
        updateLengthPrefixed(digest, schema);
        updateLengthPrefixed(digest, name);
        updateLengthPrefixed(digest, Boolean.toString(quoted));

        List<String> dependencyIds = dependencies.stream()
                .map(ObjectReference::stableId)
                .sorted()
                .toList();
        updateLengthPrefixed(digest, Integer.toString(dependencyIds.size()));
        dependencyIds.forEach(dependencyId -> updateLengthPrefixed(digest, dependencyId));

        List<Map.Entry<String, String>> structuralAttributes = structuralIdentityAttributes();
        updateLengthPrefixed(digest, Integer.toString(structuralAttributes.size()));
        for (Map.Entry<String, String> entry : structuralAttributes) {
            updateLengthPrefixed(digest, entry.getKey());
            updateLengthPrefixed(digest, entry.getValue());
        }
        return urn(digest.digest());
    }

    /**
     * 구조 세부정보가 없는 {@link ObjectReference}와 비교할 때만 쓰는 base identity다.
     * review/disposition key에는 구조 충돌을 막는 {@link #stableId()}를 사용한다.
     */
    public String referenceId() {
        return stableId(kind, catalog, schema, name);
    }

    boolean hasSameStableIdentityMaterial(CatalogObject other) {
        if (other == null
                || kind != other.kind
                || !Objects.equals(catalog, other.catalog)
                || !Objects.equals(schema, other.schema)
                || !name.equals(other.name)
                || quoted != other.quoted) {
            return false;
        }
        return canonicalDependencies().equals(other.canonicalDependencies())
                && structuralIdentityAttributes().equals(other.structuralIdentityAttributes());
    }

    List<ObjectReference> canonicalDependencies() {
        Comparator<String> nullableText = Comparator.nullsFirst(Comparator.naturalOrder());
        return dependencies.stream()
                .sorted(Comparator.comparing((ObjectReference reference) -> reference.kind().name())
                        .thenComparing(ObjectReference::catalog, nullableText)
                        .thenComparing(ObjectReference::schema, nullableText)
                        .thenComparing(ObjectReference::name))
                .toList();
    }

    private List<Map.Entry<String, String>> structuralIdentityAttributes() {
        LinkedHashMap<String, String> identity = new LinkedHashMap<>();
        if (kind == ObjectKind.FOREIGN_KEY) {
            copyAttribute(identity, "parentTable");
            copyAttribute(identity, "columns");
            copyAttribute(identity, "referencedTable");
            copyAttribute(identity, "referencedColumns");
        } else if (kind == ObjectKind.ROUTINE) {
            copyAttribute(identity, "routineType");
        }
        return identity.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .toList();
    }

    private void copyAttribute(Map<String, String> target, String key) {
        String value = attributes.get(key);
        if (value != null) {
            target.put(key, value);
        }
    }

    /** 원문을 inventory에 보관하도록 명시적으로 선택한 경우 hash도 함께 고정한다. */
    public static CatalogObject withDefinition(
            ObjectKind kind,
            String catalog,
            String schema,
            String name,
            boolean quoted,
            String nativeDefinition,
            List<ObjectReference> dependencies,
            Map<String, String> attributes) {
        return new CatalogObject(
                kind,
                catalog,
                schema,
                name,
                quoted,
                nativeDefinition,
                nativeDefinition == null ? null : definitionHash(nativeDefinition),
                dependencies,
                attributes);
    }

    /** 원문은 보관하지 않고 비교 가능한 hash만 남기는 기본 보안 경로다. */
    public static CatalogObject hashOnlyDefinition(
            ObjectKind kind,
            String catalog,
            String schema,
            String name,
            boolean quoted,
            String nativeDefinition,
            List<ObjectReference> dependencies,
            Map<String, String> attributes) {
        LinkedHashMap<String, String> safeAttributes = new LinkedHashMap<>(attributes);
        if (nativeDefinition != null) {
            safeAttributes.put("definitionCapture", "HASH_ONLY");
        }
        return new CatalogObject(
                kind,
                catalog,
                schema,
                name,
                quoted,
                null,
                nativeDefinition == null ? null : definitionHash(nativeDefinition),
                dependencies,
                safeAttributes);
    }

    public static String definitionHash(String definition) {
        Objects.requireNonNull(definition, "definition");
        return "sha256:" + HexFormat.of().formatHex(digest(definition.getBytes(StandardCharsets.UTF_8)));
    }

    private static String stableId(ObjectKind kind, String catalog, String schema, String name) {
        MessageDigest digest = sha256();
        updateLengthPrefixed(digest, kind.name());
        updateLengthPrefixed(digest, catalog);
        updateLengthPrefixed(digest, schema);
        updateLengthPrefixed(digest, name);
        return urn(digest.digest());
    }

    private static String urn(byte[] digest) {
        return "urn:migration-object:sha256:" + HexFormat.of().formatHex(digest);
    }

    private static void updateLengthPrefixed(MessageDigest digest, String value) {
        if (value == null) {
            digest.update(ByteBuffer.allocate(Integer.BYTES).putInt(-1).array());
            return;
        }
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        digest.update(ByteBuffer.allocate(Integer.BYTES).putInt(bytes.length).array());
        digest.update(bytes);
    }

    private static byte[] digest(byte[] value) {
        return sha256().digest(value);
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is required by the Java platform", impossible);
        }
    }

    private static String quote(String value) {
        return '"' + value.replace("\"", "\"\"") + '"';
    }

    private static String requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        return value;
    }

    /** 다른 객체에 대한 의존 관계. 원본 이름을 그대로 보존한다. */
    public record ObjectReference(ObjectKind kind, String catalog, String schema, String name) {
        public ObjectReference {
            kind = Objects.requireNonNull(kind, "kind");
            name = requireText(name, "name");
        }

        public String stableId() {
            return CatalogObject.stableId(kind, catalog, schema, name);
        }
    }
}
