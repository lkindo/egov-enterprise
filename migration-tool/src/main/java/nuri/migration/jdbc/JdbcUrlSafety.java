package nuri.migration.jdbc;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Properties;
import java.util.regex.Pattern;

/**
 * 이관 연결의 JDBC 주소 경계. 소스·타깃 연결이 모두 지난다.
 *
 * <p>주소는 드라이버가 해석하므로 속성 하나로 클라이언트 파일을 서버에 넘기거나({@code allowLoadLocalInfile}), 서버가 준 값을 역직렬화하거나
 * ({@code autoDeserialize}), 임의 클래스를 불러올 수 있다({@code socketFactory}). 이관 작업공간이 만드는 주소는 이 속성을 끈 값으로 싣지만
 * 직접 쓴 매핑은 그 경로를 지나지 않는다. 그래서 켜는 값과 클래스를 지정하는 속성을 거부하고, 드라이버 기본값이 켜져 있어도 꺼지도록
 * MySQL·MariaDB 연결에는 끈 값을 함께 넘긴다.
 */
public final class JdbcUrlSafety {

    /** 속성 이름 앞에 올 수 있는 구분자 — 쿼리({@code ?&}), 세미콜론 형식, MySQL 주소 형식({@code (key=value)}). */
    private static final String BOUNDARY = "[?&;(,\\s]";

    private static final Pattern ENABLED_FLAG = Pattern.compile("(?i)" + BOUNDARY
            + "(allowLoadLocalInfile|allowUrlInLocalInfile|autoDeserialize|allowLocalInfile)\\s*=\\s*(?!false(?:[&;),\\s]|$))");

    private static final Pattern CLASS_OR_FILE_OPTION = Pattern.compile("(?i)" + BOUNDARY
            + "(allowLoadLocalInfileInPath|socketFactory|socketFactoryArg|sslfactory|sslfactoryarg|sslhostnameverifier"
            + "|sslpasswordcallback|loggerFile|loggerLevel|authenticationPluginClassName|queryInterceptors|statementInterceptors"
            + "|exceptionInterceptors|connectionLifecycleInterceptors|propertiesTransform)\\s*=");

    private JdbcUrlSafety() {
    }

    /** 위험한 연결 속성이 없는가. 드라이버처럼 퍼센트 인코딩을 푼 값으로도 본다. */
    public static boolean isSafe(String url) {
        if (url == null) {
            return true;
        }
        return isSafeText(url) && isSafeText(decoded(url));
    }

    /** MySQL·MariaDB 드라이버에 함께 넘길 끈 값. 다른 드라이버에는 넘기지 않는다 — 모르는 속성을 거부하는 드라이버가 있다. */
    public static Properties hardenedProperties(String url) {
        Properties properties = new Properties();
        String lower = url == null ? "" : url.toLowerCase(Locale.ROOT);
        if (lower.startsWith("jdbc:mysql:")) {
            properties.setProperty("allowLoadLocalInfile", "false");
            properties.setProperty("allowUrlInLocalInfile", "false");
            properties.setProperty("autoDeserialize", "false");
        } else if (lower.startsWith("jdbc:mariadb:")) {
            properties.setProperty("allowLocalInfile", "false");
        }
        return properties;
    }

    private static boolean isSafeText(String text) {
        return !ENABLED_FLAG.matcher(text).find() && !CLASS_OR_FILE_OPTION.matcher(text).find();
    }

    private static String decoded(String url) {
        try {
            return URLDecoder.decode(url.replace("+", "%2B"), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException malformed) {
            return url;
        }
    }
}
