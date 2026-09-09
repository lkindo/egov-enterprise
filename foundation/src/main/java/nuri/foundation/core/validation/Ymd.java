package nuri.foundation.core.validation;

/** Gregorian yyyyMMdd input contract, also exported by @Pattern to OpenAPI/Zod. */
public final class Ymd {
    private Ymd() { }

    // Empty means an omitted optional date. Whitespace and year 0000 are never dates.
    // Separate month lengths and leap years keep Java and JavaScript validation identical.
    public static final String OPTIONAL_PATTERN = "^(?:|(?!0000)(?:[0-9]{4}(?:"
            + "(?:0[13578]|1[02])(?:0[1-9]|[12][0-9]|3[01])|"
            + "(?:0[469]|11)(?:0[1-9]|[12][0-9]|30)|02(?:0[1-9]|1[0-9]|2[0-8]))|"
            + "(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|"
            + "(?:0[48]|[2468][048]|[13579][26])00)0229))(?![\\s\\S])";
}
