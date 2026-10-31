package nuri.migration.jdbc;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Properties;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 이관 연결의 JDBC 주소 경계. 소스·타깃 연결이 모두 지난다.
 *
 * <p>주소는 드라이버가 해석하므로 속성 하나로 클라이언트 파일을 서버에 넘기거나({@code allowLoadLocalInfile}), 서버가 준 값을 역직렬화하거나
 * ({@code autoDeserialize}), 임의 클래스를 불러올 수 있다({@code socketFactory}). 이관 작업공간이 만드는 주소는 이 속성을 끈 값으로 싣지만
 * 직접 쓴 매핑은 그 경로를 지나지 않는다. 그래서 켜는 값과 클래스·실행문을 받는 속성을 거부하고, 드라이버 기본값이 켜져 있어도 꺼지도록
 * MySQL·MariaDB 연결에는 끈 값을 함께 넘긴다.
 */
public final class JdbcUrlSafety {

    /**
     * 구분자 뒤의 {@code 이름=값}. 구분자는 쿼리({@code ?&}), 세미콜론 형식, MySQL 주소 형식({@code (key=value)}), DB2 형식({@code :key=value})이다.
     * 드라이버는 나눈 뒤에 이름과 값을 푼다 — 주소 전체를 먼저 풀면 값 안의 {@code %26} 을 구분자로 오인한다.
     */
    private static final Pattern OPTION = Pattern.compile("[?&;(,:\\s]\\s*([^=?&;(),:\\s]+)\\s*=\\s*([^&;),]*)");

    private static final Set<String> ENABLED_FLAGS = Set.of(
            "allowloadlocalinfile", "allowurlinlocalinfile", "autodeserialize", "allowlocalinfile");

    /** 값을 클래스 이름으로 받는 속성의 끝말. 드라이버마다 이름이 달라 설치 드라이버의 속성 목록에서 뽑은 꼴로 막는다. */
    private static final Pattern CLASS_OPTION_NAME = Pattern.compile(
            "(?:class|classname|factory|plugins?|interceptors|transform|callback|handler|verifier|providers?|checker|executor|strategy)$"
                    + "|\\.provider\\.");

    /** 위 꼴에 들지 않지만 값이 클래스 인자·파일·실행문인 속성. {@code init}·{@code initsql} 은 연결할 때 SQL 을 실행한다(H2·MariaDB). */
    private static final Set<String> EXECUTABLE_OPTIONS = Set.of(
            "allowloadlocalinfileinpath", "socketfactoryarg", "sslfactoryarg", "socketfactoryconstructorarg",
            "trustmanagerconstructorarg", "connectexecutorarg", "logger", "loggerfile", "loggerlevel", "init", "initsql",
            "oracle.jdbc.config.file");

    private JdbcUrlSafety() {
    }

    /** 위험한 연결 속성이 없는가. 드라이버처럼 속성을 나눈 뒤 이름과 값을 따로 퍼센트 디코딩해 본다. */
    public static boolean isSafe(String url) {
        if (url == null) {
            return true;
        }
        Matcher option = OPTION.matcher(url);
        while (option.find()) {
            String name = decoded(option.group(1)).trim().toLowerCase(Locale.ROOT);
            String value = decoded(option.group(2)).trim();
            if (EXECUTABLE_OPTIONS.contains(name) || CLASS_OPTION_NAME.matcher(name).find()
                    || (ENABLED_FLAGS.contains(name) && !"false".equalsIgnoreCase(value))) {
                return false;
            }
        }
        return true;
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

    private static String decoded(String text) {
        try {
            return URLDecoder.decode(text.replace("+", "%2B"), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException malformed) {
            return text;
        }
    }
}
