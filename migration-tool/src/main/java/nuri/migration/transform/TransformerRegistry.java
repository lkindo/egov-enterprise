package nuri.migration.transform;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.UnaryOperator;
import java.util.regex.Pattern;

import nuri.migration.artifact.CanonicalArtifactDigest;

/**
 * 값 변환기 레지스트리 — {@code mapping.yml}의 {@code transform: <name>} 을 실제 함수로 해석.
 * 내장: trim / upper / lower / date(→LocalDate) / timestamp(→LocalDateTime).
 * 프로젝트별 확장은 {@link #register(String, UnaryOperator)}.
 */
@Component
public class TransformerRegistry {

    private static final Pattern SHA256 = Pattern.compile("[0-9a-f]{64}");

    private final Map<String, Definition> transformers = new ConcurrentHashMap<>();

    public TransformerRegistry() {
        registerBuiltin("trim", "builtin:trim:v1", v -> v == null ? null : v.toString().trim());
        registerBuiltin("upper", "builtin:upper:locale-root:v1",
                v -> v == null ? null : v.toString().toUpperCase(Locale.ROOT));
        registerBuiltin("lower", "builtin:lower:locale-root:v1",
                v -> v == null ? null : v.toString().toLowerCase(Locale.ROOT));
        registerBuiltin("date", "builtin:date:iso-local-date:v1",
                v -> v == null ? null : LocalDate.parse(v.toString().trim(), DateTimeFormatter.ISO_LOCAL_DATE));
        registerBuiltin("timestamp", "builtin:timestamp:iso-local-date-time:v1",
                TransformerRegistry::parseTimestamp);
    }

    /** source compatibility only. 승인 실행에서 사용되면 versionless extension으로 fail-closed한다. */
    public final void register(String name, UnaryOperator<Object> fn) {
        transformers.put(requireName(name), new Definition(fn, null, null, false));
    }

    /** 승인 실행에 사용할 custom transformer는 version과 구현 digest를 명시해야 한다. */
    public final void register(
            String name,
            String contractVersion,
            String implementationDigest,
            UnaryOperator<Object> fn
    ) {
        String version = requireText(contractVersion, "contractVersion");
        if (implementationDigest == null || !SHA256.matcher(implementationDigest).matches()) {
            throw new IllegalArgumentException("transformer implementation digest must be lowercase SHA-256");
        }
        transformers.put(requireName(name), new Definition(
                Objects.requireNonNull(fn, "fn"), version, implementationDigest, false));
    }

    public boolean has(String name) {
        return transformers.containsKey(name);
    }

    /** 변환기 적용. 이름이 비었으면 원본, 미등록이면 원본 반환(검증 단계가 경고). */
    public Object apply(String name, Object value) {
        if (name == null || name.isBlank()) {
            return value;
        }
        Definition definition = transformers.get(name);
        return definition == null ? value : definition.fn().apply(value);
    }

    /** MappingSpec에서 실제 선택된 변환기만 canonical execution contract에 결속한다. */
    public String executionContractDigest(Iterable<String> selectedNames, String registryClassDigest) {
        List<ContractEntry> entries = new ArrayList<>();
        for (String name : selectedNames) {
            if (name == null || name.isBlank()) {
                continue;
            }
            Definition definition = transformers.get(name);
            if (definition == null) {
                throw new IllegalStateException("selected transformer is not registered");
            }
            if (!definition.builtin()
                    && (definition.contractVersion() == null || definition.implementationDigest() == null)) {
                throw new IllegalStateException(
                        "selected custom transformer requires an explicit contract version and digest");
            }
            entries.add(new ContractEntry(
                    name,
                    definition.contractVersion(),
                    definition.implementationDigest(),
                    definition.builtin()));
        }
        entries = entries.stream().distinct()
                .sorted(Comparator.comparing(ContractEntry::name)).toList();
        return CanonicalArtifactDigest.sha256(new RegistryContract(
                1, requireText(registryClassDigest, "registryClassDigest"), entries));
    }

    private void registerBuiltin(String name, String contractId, UnaryOperator<Object> fn) {
        transformers.put(requireName(name), new Definition(
                Objects.requireNonNull(fn, "fn"), contractId,
                CanonicalArtifactDigest.sha256(contractId), true));
    }

    private static String requireName(String name) {
        String value = requireText(name, "name");
        if (!value.equals(value.trim())) {
            throw new IllegalArgumentException("transformer name must be trimmed");
        }
        return value;
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value;
    }

    private static Object parseTimestamp(Object v) {
        if (v == null) {
            return null;
        }
        return LocalDateTime.parse(v.toString().trim().replace(' ', 'T'));
    }

    private record Definition(
            UnaryOperator<Object> fn,
            String contractVersion,
            String implementationDigest,
            boolean builtin
    ) {
        private Definition {
            Objects.requireNonNull(fn, "fn");
        }
    }

    private record ContractEntry(
            String name,
            String contractVersion,
            String implementationDigest,
            boolean builtin
    ) {}

    private record RegistryContract(
            int schemaVersion,
            String registryClassDigest,
            List<ContractEntry> selectedTransformers
    ) {}
}
