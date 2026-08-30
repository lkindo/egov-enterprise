package nuri.migration.discovery;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * inventory가 의미하는 정확한 discovery 경계와 44-kind 전수 scope manifest다.
 * 목록은 생성 시 정렬해 JSON 배열 순서까지 canonical하게 고정한다.
 */
public record DiscoveryScope(
        int schemaVersion,
        String adapterId,
        List<String> catalogs,
        List<String> schemas,
        List<ObjectKind> objectKinds,
        boolean includeSystemObjects,
        List<ObjectScope> objectScopeManifest) {

    public static final int CURRENT_SCHEMA_VERSION = 1;
    public static final String UNBOUND_ADAPTER_ID = "unbound";

    public DiscoveryScope {
        if (schemaVersion <= 0) {
            throw new IllegalArgumentException("schemaVersion must be positive");
        }
        adapterId = requireText(adapterId, "adapterId");
        catalogs = canonicalText(catalogs, "catalogs");
        schemas = canonicalText(schemas, "schemas");
        objectKinds = canonicalKinds(objectKinds);
        objectScopeManifest = canonicalManifest(objectScopeManifest);
        validateManifest(objectKinds, objectScopeManifest);
    }

    public static DiscoveryScope capture(
            String adapterId,
            DiscoveryRequest request,
            Set<ObjectKind> notApplicableKinds,
            Set<ObjectKind> schemaGlobalKinds) {
        Objects.requireNonNull(request, "request");
        Set<ObjectKind> notApplicable = Set.copyOf(
                Objects.requireNonNull(notApplicableKinds, "notApplicableKinds"));
        Set<ObjectKind> schemaGlobal = Set.copyOf(
                Objects.requireNonNull(schemaGlobalKinds, "schemaGlobalKinds"));
        List<ObjectScope> manifest = new ArrayList<>(ObjectKind.values().length);
        for (ObjectKind kind : ObjectKind.values()) {
            DiscoveryScopeStatus status;
            if (!request.includes(kind)) {
                status = DiscoveryScopeStatus.NOT_REQUESTED;
            } else if (notApplicable.contains(kind)) {
                status = DiscoveryScopeStatus.NOT_APPLICABLE;
            } else if (!request.schemas().isEmpty() && schemaGlobal.contains(kind)) {
                status = DiscoveryScopeStatus.NOT_REQUESTED;
            } else {
                status = DiscoveryScopeStatus.REQUESTED;
            }
            manifest.add(new ObjectScope(kind, status));
        }
        return new DiscoveryScope(
                CURRENT_SCHEMA_VERSION,
                adapterId,
                List.copyOf(request.catalogs()),
                List.copyOf(request.schemas()),
                List.copyOf(request.objectKinds()),
                request.includeSystemObjects(),
                manifest);
    }

    /** 저수준 codec 호환용이며 승인 workflow에서는 bound adapter scope를 요구한다. */
    public static DiscoveryScope unbound(DiscoveryRequest request) {
        return capture(UNBOUND_ADAPTER_ID, request, Set.of(), Set.of());
    }

    public boolean bound() {
        return !UNBOUND_ADAPTER_ID.equals(adapterId);
    }

    public DiscoveryScopeStatus status(ObjectKind kind) {
        Objects.requireNonNull(kind, "kind");
        return objectScopeManifest.stream()
                .filter(entry -> entry.objectKind() == kind)
                .findFirst()
                .orElseThrow()
                .status();
    }

    /** adapter가 실제로 census할 kind만 남기되 원래 catalog/schema/system 경계는 보존한다. */
    public DiscoveryRequest effectiveRequest() {
        EnumSet<ObjectKind> effectiveKinds = EnumSet.noneOf(ObjectKind.class);
        objectScopeManifest.stream()
                .filter(entry -> entry.status() == DiscoveryScopeStatus.REQUESTED)
                .map(ObjectScope::objectKind)
                .forEach(effectiveKinds::add);
        return new DiscoveryRequest(
                new LinkedHashSet<>(catalogs),
                new LinkedHashSet<>(schemas),
                effectiveKinds,
                includeSystemObjects);
    }

    public boolean matches(String currentAdapterId, DiscoveryRequest currentRequest) {
        Objects.requireNonNull(currentRequest, "currentRequest");
        return adapterId.equals(currentAdapterId)
                && new HashSet<>(catalogs).equals(currentRequest.catalogs())
                && new HashSet<>(schemas).equals(currentRequest.schemas())
                && new HashSet<>(objectKinds).equals(currentRequest.objectKinds())
                && includeSystemObjects == currentRequest.includeSystemObjects();
    }

    public void requireExact(String currentAdapterId, DiscoveryRequest currentRequest) {
        if (!matches(currentAdapterId, currentRequest)) {
            throw new IllegalArgumentException("discovery scope exact match 실패");
        }
    }

    private static List<String> canonicalText(List<String> source, String field) {
        Objects.requireNonNull(source, field);
        LinkedHashSet<String> unique = new LinkedHashSet<>();
        for (String value : source) {
            if (value == null || value.isBlank() || !value.equals(value.trim())) {
                throw new IllegalArgumentException(field + " must contain non-blank trimmed values");
            }
            if (!unique.add(value)) {
                throw new IllegalArgumentException(field + " must not contain duplicates");
            }
        }
        return unique.stream().sorted().toList();
    }

    private static List<ObjectKind> canonicalKinds(List<ObjectKind> source) {
        Objects.requireNonNull(source, "objectKinds");
        if (source.stream().anyMatch(Objects::isNull)) {
            throw new NullPointerException("objectKinds must not contain null");
        }
        Set<ObjectKind> unique = new HashSet<>(source);
        if (unique.size() != source.size()) {
            throw new IllegalArgumentException("objectKinds must not contain duplicates");
        }
        return unique.stream().sorted(Comparator.comparing(Enum::name)).toList();
    }

    private static List<ObjectScope> canonicalManifest(List<ObjectScope> source) {
        Objects.requireNonNull(source, "objectScopeManifest");
        return source.stream()
                .map(entry -> Objects.requireNonNull(entry, "objectScopeManifest entry"))
                .sorted(Comparator.comparing(entry -> entry.objectKind().name()))
                .toList();
    }

    private static void validateManifest(
            List<ObjectKind> requestedKinds,
            List<ObjectScope> manifest) {
        EnumMap<ObjectKind, DiscoveryScopeStatus> statuses = new EnumMap<>(ObjectKind.class);
        for (ObjectScope entry : manifest) {
            if (statuses.put(entry.objectKind(), entry.status()) != null) {
                throw new IllegalArgumentException(
                        "objectScopeManifest has duplicate kind: " + entry.objectKind());
            }
        }
        if (statuses.size() != ObjectKind.values().length) {
            throw new IllegalArgumentException("objectScopeManifest must cover every ObjectKind");
        }
        Set<ObjectKind> requested = Set.copyOf(requestedKinds);
        statuses.forEach((kind, status) -> {
            if (!requested.contains(kind) && status != DiscoveryScopeStatus.NOT_REQUESTED) {
                throw new IllegalArgumentException(
                        "unselected ObjectKind must be NOT_REQUESTED: " + kind);
            }
        });
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank() || !value.equals(value.trim())) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value;
    }

    public record ObjectScope(ObjectKind objectKind, DiscoveryScopeStatus status) {
        public ObjectScope {
            objectKind = Objects.requireNonNull(objectKind, "objectKind");
            status = Objects.requireNonNull(status, "status");
        }
    }
}
