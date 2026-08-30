package nuri.migration.identity;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;

/** 순서와 타입을 보존하는 단일·복합 migration identity. */
public final class TypedKeyTuple {

    public enum NullPolicy {
        REJECT,
        ALLOW
    }

    private static final byte[] CANONICAL_HEADER = new byte[] { 'T', 'K', 1 };

    private final List<TypedValue> values;
    private final NullPolicy nullPolicy;

    private TypedKeyTuple(NullPolicy nullPolicy, List<TypedValue> values) {
        this.nullPolicy = Objects.requireNonNull(nullPolicy, "nullPolicy");
        this.values = List.copyOf(Objects.requireNonNull(values, "values"));
        if (this.values.isEmpty()) {
            throw new IllegalArgumentException("typed key tuple must not be empty");
        }
        if (this.values.stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException("typed key tuple values must not contain Java null");
        }
        if (nullPolicy == NullPolicy.REJECT && this.values.stream().anyMatch(TypedValue::isNull)) {
            throw new IllegalArgumentException("typed key tuple rejects SQL null values by default");
        }
    }

    public static TypedKeyTuple of(TypedValue... values) {
        Objects.requireNonNull(values, "values");
        return new TypedKeyTuple(NullPolicy.REJECT, Arrays.asList(values.clone()));
    }

    public static TypedKeyTuple of(NullPolicy nullPolicy, TypedValue... values) {
        Objects.requireNonNull(values, "values");
        return new TypedKeyTuple(nullPolicy, Arrays.asList(values.clone()));
    }

    public List<TypedValue> values() {
        return values;
    }

    public NullPolicy nullPolicy() {
        return nullPolicy;
    }

    /** 구성요소 수와 각 값의 길이를 포함하여 구분자 충돌을 원천 차단한다. */
    public byte[] canonicalBytes() {
        try {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (DataOutputStream output = new DataOutputStream(bytes)) {
                output.write(CANONICAL_HEADER);
                output.writeInt(values.size());
                for (TypedValue value : values) {
                    byte[] encoded = value.canonicalBytes();
                    output.writeInt(encoded.length);
                    output.write(encoded);
                }
            }
            return bytes.toByteArray();
        } catch (IOException impossible) {
            throw new IllegalStateException("in-memory typed key encoding failed", impossible);
        }
    }

    /** versioned canonical bytes를 순서 보존 tuple로 복원한다. */
    public static TypedKeyTuple fromCanonicalBytes(byte[] encoded) {
        Objects.requireNonNull(encoded, "encoded");
        try (DataInputStream input = new DataInputStream(new ByteArrayInputStream(encoded))) {
            for (byte expected : CANONICAL_HEADER) {
                if (input.readByte() != expected) {
                    throw new IllegalArgumentException("unknown typed key canonical version/header");
                }
            }
            int size = input.readInt();
            if (size <= 0 || size > 128) {
                throw new IllegalArgumentException("invalid typed key component count: " + size);
            }
            java.util.ArrayList<TypedValue> values = new java.util.ArrayList<>(size);
            for (int i = 0; i < size; i++) {
                int length = input.readInt();
                if (length <= 0 || length > input.available()) {
                    throw new IllegalArgumentException("invalid typed key component length");
                }
                byte[] value = input.readNBytes(length);
                if (value.length != length) {
                    throw new IllegalArgumentException("truncated typed key component");
                }
                values.add(TypedValue.fromCanonicalBytes(value));
            }
            if (input.available() != 0) {
                throw new IllegalArgumentException("typed key canonical trailing data");
            }
            NullPolicy policy = values.stream().anyMatch(TypedValue::isNull)
                    ? NullPolicy.ALLOW : NullPolicy.REJECT;
            return new TypedKeyTuple(policy, values);
        } catch (IOException e) {
            throw new IllegalArgumentException("invalid typed key canonical encoding", e);
        }
    }

    public String sha256() {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(canonicalBytes()));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    @Override
    public boolean equals(Object other) {
        return this == other || other instanceof TypedKeyTuple that && values.equals(that.values);
    }

    @Override
    public int hashCode() {
        return values.hashCode();
    }

    @Override
    public String toString() {
        return "TypedKeyTuple[arity=" + values.size() + ", nullPolicy=" + nullPolicy + ']';
    }
}
