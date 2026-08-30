package nuri.migration.identity;

import java.util.Base64;
import java.util.Objects;

/** varchar runtime-state 컬럼에 저장할 versioned typed tuple text encoding. */
public final class TypedKeyEncoding {

    private static final String PREFIX = "tk1:";

    private TypedKeyEncoding() {}

    public static String encode(TypedKeyTuple tuple, int maxCharacters, String field) {
        Objects.requireNonNull(tuple, "tuple");
        if (maxCharacters <= 0) {
            throw new IllegalArgumentException("encoded key maxCharacters must be positive");
        }
        String encoded = PREFIX + Base64.getUrlEncoder().withoutPadding()
                .encodeToString(tuple.canonicalBytes());
        if (encoded.length() > maxCharacters) {
            throw new IllegalArgumentException((field == null ? "typed key" : field)
                    + " encoded length " + encoded.length() + " exceeds schema limit " + maxCharacters);
        }
        return encoded;
    }

    public static TypedKeyTuple decode(String encoded) {
        Objects.requireNonNull(encoded, "encoded");
        if (!encoded.startsWith(PREFIX)) {
            if (encoded.startsWith("tk")) {
                throw new IllegalArgumentException("unsupported typed key encoding version");
            }
            throw new IllegalArgumentException("value is not a versioned typed key encoding");
        }
        try {
            byte[] canonical = Base64.getUrlDecoder().decode(encoded.substring(PREFIX.length()));
            return TypedKeyTuple.fromCanonicalBytes(canonical);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("invalid typed key canonical encoding", e);
        }
    }

    public static boolean isTyped(String encoded) {
        return encoded != null && encoded.startsWith(PREFIX);
    }
}
