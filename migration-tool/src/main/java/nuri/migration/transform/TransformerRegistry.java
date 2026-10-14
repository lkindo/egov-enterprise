package nuri.migration.transform;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.UnaryOperator;
import java.util.regex.Pattern;

import nuri.migration.artifact.CanonicalArtifactDigest;
import nuri.migration.domain.DomainValues;
import nuri.migration.domain.DomainViolation;

/**
 * 값 변환기 레지스트리 — {@code mapping.yml}의 {@code transform: <name>} 을 실제 함수로 해석.
 * 내장: trim / upper / lower / date(→LocalDate) / timestamp(→LocalDateTime) / date-truncate(일시 → 날짜, 명시적 시각 절단).
 * 프로젝트별 확장은 {@link #register(String, UnaryOperator)}.
 *
 * <p>[ADR-0029 L3a-1] 표준 도메인 변환기 ymd8·ymd8-truncate·ymdhms14·hms6·yn·date-text·timestamp-text·
 * timestamp-from-date 와 date-truncate(v2) 는 {@link DomainValues} 의 순수 함수다. 거부는 위반 코드만 담은
 * {@code DomainValueRejected} 로 알리고, 실행기는 그것을 {@code DOMAIN_VIOLATION(<코드>)} 로 기록한다. 이진 값도
 * 위반 코드({@code UNSUPPORTED_VALUE_TYPE})로 거부한다.</p>
 */
@Component
public class TransformerRegistry {

    private static final Pattern SHA256 = Pattern.compile("[0-9a-f]{64}");

    /*
     * 도메인 변환기가 낼 수 있는 위반 코드. 검증기는 nullify 가 그 load 가 낼 수 있는 코드인지 이 표로 판정한다
     * (ADR-0029 L3a-1) — DomainValues 의 실제 거부와 어긋나면 TransformerRegistryTest 가 알린다.
     */
    private static final Set<DomainViolation> SHAPE = Collections.unmodifiableSet(EnumSet.of(
            DomainViolation.BLANK, DomainViolation.FORMAT, DomainViolation.UNSUPPORTED_VALUE_TYPE));
    private static final Set<DomainViolation> DATE_TIME = union(SHAPE, DomainViolation.INVALID_DATE);
    /** 날짜만 있는 값은 자리표시·달력으로 거부하고, 시각은 버리거나(truncate) 일시로 받는다. */
    private static final Set<DomainViolation> TIMESTAMP_TEXT = union(DATE_TIME, DomainViolation.PLACEHOLDER_DATE);
    private static final Set<DomainViolation> TRUNCATED_DATE = TIMESTAMP_TEXT;
    private static final Set<DomainViolation> DATE = union(TRUNCATED_DATE, DomainViolation.TIME_PRESENT);

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
        // [2026-10-13 DEC-OPS-309] type: date 는 자정이 아닌 시각을 거부한다. 시각을 버리는 것이 의도일 때만
        //   이 변환기로 밝힌다 — 선택한 변환기는 실행 계약 digest 에 결속돼 승인 대상이 된다.
        // [ADR-0029 L3a-1] v2 는 ymd8 의 입력을 더 받고 자리표시 날짜를 거부한다. 계약 id 가 바뀌어 v1 로 승인한 plan 은
        //   다시 승인해야 한다.
        registerDomain("date-truncate", "builtin:date-truncate:v2", DomainValues::dateTruncate, TRUNCATED_DATE);
        registerDomain("ymd8", "builtin:ymd8:v1", DomainValues::ymd8, DATE);
        registerDomain("ymd8-truncate", "builtin:ymd8-truncate:v1", DomainValues::ymd8Truncate, TRUNCATED_DATE);
        registerDomain("ymdhms14", "builtin:ymdhms14:v1", DomainValues::ymdhms14, DATE_TIME);
        registerDomain("hms6", "builtin:hms6:v1", DomainValues::hms6, SHAPE);
        registerDomain("yn", "builtin:yn:v1", DomainValues::yn, SHAPE);
        registerDomain("date-text", "builtin:date-text:v1", DomainValues::dateText, DATE);
        registerDomain("timestamp-text", "builtin:timestamp-text:v1", DomainValues::timestampText, TIMESTAMP_TEXT);
        registerDomain("timestamp-from-date", "builtin:timestamp-from-date:v1", DomainValues::timestampFromDate,
                DATE);
    }

    /** source compatibility only. 승인 실행에서 사용되면 versionless extension으로 fail-closed한다. */
    public final void register(String name, UnaryOperator<Object> fn) {
        transformers.put(requireName(name), new Definition(fn, null, null, false, Set.of()));
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
                Objects.requireNonNull(fn, "fn"), version, implementationDigest, false, Set.of()));
    }

    public boolean has(String name) {
        return transformers.containsKey(name);
    }

    /** 내장 변환기인가. 같은 이름을 사용자 변환기로 덮어쓰면 내장이 아니다. 미등록이면 false. */
    public boolean isBuiltin(String name) {
        Definition definition = name == null ? null : transformers.get(name);
        return definition != null && definition.builtin();
    }

    /**
     * 표준 도메인 변환기인가(ADR-0029 L3a-1). 같은 이름을 사용자 변환기로 덮어쓰면 아니다 — 그 변환기가 던진
     * {@code DomainValueRejected} 는 위반 코드로 인정하지 않는다. 미등록이면 false.
     */
    public boolean isDomain(String name) {
        Definition definition = name == null ? null : transformers.get(name);
        return definition != null && definition.domain();
    }

    /** 표준 도메인 변환기가 낼 수 있는 위반 코드. 도메인 변환기가 아니면(덮어쓴 이름·미등록 포함) 빈 집합이다. */
    public Set<DomainViolation> domainViolations(String name) {
        Definition definition = name == null ? null : transformers.get(name);
        return definition == null ? Set.of() : definition.violations();
    }

    /** 변환기 적용. 이름이 비었으면 원본, 미등록이면 원본 반환(검증 단계가 경고). */
    public Object apply(String name, Object value) {
        if (name == null || name.isBlank()) {
            return value;
        }
        Definition definition = transformers.get(name);
        if (value instanceof byte[] && definition != null && definition.builtin() && !definition.domain()) {
            throw new IllegalArgumentException("text transformer cannot consume binary data");
        }
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
                CanonicalArtifactDigest.sha256(contractId), true, Set.of()));
    }

    /** 표준 도메인 변환기. 이진 값은 변환기가 위반 코드로 거부한다. {@code violations} 는 낼 수 있는 위반 코드다. */
    private void registerDomain(String name, String contractId, UnaryOperator<Object> fn,
                                Set<DomainViolation> violations) {
        transformers.put(requireName(name), new Definition(
                Objects.requireNonNull(fn, "fn"), contractId,
                CanonicalArtifactDigest.sha256(contractId), true, violations));
    }

    private static Set<DomainViolation> union(Set<DomainViolation> base, DomainViolation added) {
        EnumSet<DomainViolation> union = EnumSet.copyOf(base);
        union.add(added);
        return Collections.unmodifiableSet(union);
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
            boolean builtin,
            Set<DomainViolation> violations
    ) {
        private Definition {
            Objects.requireNonNull(fn, "fn");
            Objects.requireNonNull(violations, "violations");
        }

        /** 표준 도메인 변환기는 낼 수 있는 위반 코드가 있다. */
        boolean domain() {
            return !violations.isEmpty();
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
