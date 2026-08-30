package nuri.migration.artifact;

import nuri.migration.model.MappingSpec.DbConfig;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/** Credential을 제외한 실제 JDBC 위치 의미만 canonical hash material로 만든다. */
final class JdbcEndpointIdentity {

    private static final String ORACLE_PREFIX = "jdbc:oracle:";
    private static final String DB2_NETWORK_PREFIX = "jdbc:db2://";

    private JdbcEndpointIdentity() {}

    static String digest(DbConfig config) {
        Objects.requireNonNull(config, "source endpoint config");
        String url = requireUrl(config.url());
        String canonicalUrl = canonicalUrl(url);
        return CanonicalSha256.digest(CanonicalJsonSupport.bytes(new EndpointLocationMaterial(
                1, "credential-redacted-jdbc-location", canonicalUrl)));
    }

    private static String canonicalUrl(String url) {
        String redacted = stripAuthorityUserInfo(stripOracleCredentials(url));
        int queryStart = redacted.indexOf('?');
        String beforeQuery = queryStart < 0 ? redacted : redacted.substring(0, queryStart);
        String query = queryStart < 0 ? "" : redacted.substring(queryStart + 1);
        int colonPropertyStart = db2ColonPropertyStart(beforeQuery);
        int semicolonPropertyStart = beforeQuery.indexOf(';');
        int propertyStart = colonPropertyStart >= 0 ? colonPropertyStart : semicolonPropertyStart;
        String base = propertyStart < 0 ? beforeQuery : beforeQuery.substring(0, propertyStart);
        String properties = propertyStart < 0 ? "" : beforeQuery.substring(propertyStart + 1);

        StringBuilder canonical = new StringBuilder(base);
        appendProperties(canonical, ';', properties, false);
        appendProperties(canonical, '?', query, true);
        return canonical.toString();
    }

    private static int db2ColonPropertyStart(String url) {
        if (!url.regionMatches(true, 0, DB2_NETWORK_PREFIX, 0, DB2_NETWORK_PREFIX.length())) {
            return -1;
        }
        int databaseStart = url.indexOf('/', DB2_NETWORK_PREFIX.length());
        if (databaseStart < 0) {
            return -1;
        }
        int candidate = url.indexOf(':', databaseStart + 1);
        if (candidate < 0) {
            return -1;
        }
        int firstPropertyEnd = url.indexOf(';', candidate + 1);
        if (firstPropertyEnd < 0) {
            firstPropertyEnd = url.length();
        }
        String firstProperty = url.substring(candidate + 1, firstPropertyEnd);
        int equals = firstProperty.indexOf('=');
        if (equals <= 0 || !isPropertyKey(firstProperty.substring(0, equals).trim())) {
            return -1;
        }
        return candidate;
    }

    private static boolean isPropertyKey(String value) {
        if (value.isEmpty()) {
            return false;
        }
        for (int index = 0; index < value.length(); index++) {
            char current = value.charAt(index);
            if (!Character.isLetterOrDigit(current)
                    && current != '_'
                    && current != '-'
                    && current != '.') {
                return false;
            }
        }
        return true;
    }

    private static String stripOracleCredentials(String url) {
        String lower = url.toLowerCase(Locale.ROOT);
        if (!lower.startsWith(ORACLE_PREFIX)) {
            return url;
        }
        int driverSeparator = url.indexOf(':', ORACLE_PREFIX.length());
        int at = driverSeparator < 0 ? -1 : url.indexOf('@', driverSeparator + 1);
        if (at < 0) {
            return url;
        }
        String candidate = url.substring(driverSeparator + 1, at);
        if (!candidate.contains("/")) {
            return url;
        }
        return url.substring(0, driverSeparator + 1) + '@' + url.substring(at + 1);
    }

    private static String stripAuthorityUserInfo(String url) {
        int marker = url.indexOf("//");
        if (marker < 0) {
            return url;
        }
        int start = marker + 2;
        int end = firstIndex(url, start, '/', '?', ';', '#');
        int at = url.lastIndexOf('@', end - 1);
        return at < start ? url : url.substring(0, start) + url.substring(at + 1);
    }

    private static int firstIndex(String value, int start, char... delimiters) {
        int result = value.length();
        for (char delimiter : delimiters) {
            int index = value.indexOf(delimiter, start);
            if (index >= 0 && index < result) {
                result = index;
            }
        }
        return result;
    }

    private static void appendProperties(
            StringBuilder target,
            char prefix,
            String raw,
            boolean query
    ) {
        if (raw.isBlank()) {
            return;
        }
        List<String> retained = new ArrayList<>();
        for (String token : splitProperties(raw, query)) {
            String canonical = canonicalProperty(token);
            if (canonical != null) {
                retained.add(canonical);
            }
        }
        retained.sort(Comparator.naturalOrder());
        if (!retained.isEmpty()) {
            target.append(prefix).append(String.join(Character.toString(prefix == ';' ? ';' : '&'), retained));
        }
    }

    private static List<String> splitProperties(String raw, boolean query) {
        List<String> tokens = new ArrayList<>();
        StringBuilder token = new StringBuilder();
        boolean braced = false;
        for (int index = 0; index < raw.length(); index++) {
            char current = raw.charAt(index);
            if (current == '{' && !braced) {
                braced = true;
            } else if (current == '}' && braced) {
                if (index + 1 < raw.length() && raw.charAt(index + 1) == '}') {
                    token.append(current).append(raw.charAt(++index));
                    continue;
                }
                braced = false;
            }
            if (!braced && (current == ';' || query && current == '&')) {
                tokens.add(token.toString());
                token.setLength(0);
            } else {
                token.append(current);
            }
        }
        tokens.add(token.toString());
        return tokens;
    }

    private static String canonicalProperty(String raw) {
        String token = raw.trim();
        if (token.isEmpty()) {
            return null;
        }
        int equals = token.indexOf('=');
        String rawKey = equals < 0 ? token : token.substring(0, equals).trim();
        String rawValue = equals < 0 ? "" : token.substring(equals + 1);
        String key = normalizedKey(rawKey);
        if (sensitiveKey(key)) {
            return null;
        }
        return key + (equals < 0 ? "" : "=" + rawValue);
    }

    private static String normalizedKey(String value) {
        return decode(value).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private static boolean sensitiveKey(String key) {
        return key.equals("user")
                || key.equals("username")
                || key.equals("userid")
                || key.equals("uid")
                || key.equals("login")
                || key.equals("loginname")
                || key.equals("password")
                || key.equals("passwd")
                || key.equals("pwd")
                || key.equals("pass")
                || key.equals("principal")
                || key.equals("apikey")
                || key.equals("accesskey")
                || key.contains("credential")
                || key.endsWith("password")
                || key.endsWith("passwd")
                || key.endsWith("secret")
                || key.endsWith("token");
    }

    private static String decode(String value) {
        try {
            return URLDecoder.decode(value, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException malformedEncoding) {
            return value;
        }
    }

    private static String requireUrl(String url) {
        if (url == null || url.isBlank() || !url.equals(url.trim())) {
            throw new IllegalArgumentException("source JDBC URL must be non-blank and trimmed");
        }
        return url;
    }

    private record EndpointLocationMaterial(int schemaVersion, String purpose, String canonicalUrl) {}
}
