package nuri.api.config;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import nuri.business.security.authorization.AuthorizationSnapshotService;
import nuri.business.security.authorization.PermissionCodes;
import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/** Explicit disposable E2E rehearsal. Ordinary startup never opts in or executes Contract DDL. */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "nuri.authorization.isolated-cutover", havingValue = "true")
public class IsolatedAuthorizationRehearsalConfig {
    static final String ACK="CONFIRMED_DISPOSABLE_AUTHZ_DATABASE";
    private static final Set<String> HOSTS=Set.of("127.0.0.1","localhost","db","db-e2e");

    record Target(String host,int port,String database) {}

    @Bean
    FlywayMigrationStrategy authorizationIsolatedCutover(Environment environment) {
        Set<String> profiles=Set.copyOf(Arrays.asList(environment.getActiveProfiles()));
        String ack=environment.getProperty("nuri.authorization.disposable-database-ack","");
        Target expected=validateTarget(profiles,environment.getProperty("spring.datasource.url",""),ack);
        return flyway -> {
            // Check the effective datasource before Flyway can write a single migration.
            try (var connection=flyway.getConfiguration().getDataSource().getConnection()) {
                Target actual=validateTarget(profiles,connection.getMetaData().getURL(),ack);
                if (!expected.equals(actual)) throw new IllegalStateException("Disposable datasource target changed");
                if (!"PostgreSQL".equals(connection.getMetaData().getDatabaseProductName())) {
                    throw new IllegalStateException("Disposable authorization rehearsal requires PostgreSQL");
                }
            } catch (java.sql.SQLException failure) {
                throw new IllegalStateException("Cannot verify disposable authorization datasource",failure);
            }
            // The immutable Contract compares V2_98/V2_99 snapshots exactly. Later migrations
            // may update navigation only after that Contract has committed.
            Flyway.configure().configuration(flyway.getConfiguration()).target("2.99").load().migrate();
            try (var connection=flyway.getConfiguration().getDataSource().getConnection()) {
                connection.setAutoCommit(false);
                try {
                    var jdbc=new JdbcTemplate(new SingleConnectionDataSource(connection,true));
                    Long legacy=jdbc.queryForObject("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' "
                            + "AND table_name IN ('tb_user_authrt_map','tb_authrt_role_map','tb_menu_crt_dtl','tb_role_prgrm_map','tb_role_hierarchy','tb_role_info')",Long.class);
                    if (legacy!=null && legacy>0) {
                        jdbc.queryForObject("SELECT set_config('app.authorization_cutover_evidence',?,true)",String.class,
                                AuthorizationSnapshotService.digest("DISPOSABLE_E2E_FIXTURE:"+expected.database()));
                        jdbc.queryForObject("SELECT set_config('app.authorization_backup_sha256',?,true)",String.class,
                                AuthorizationSnapshotService.digest("DISPOSABLE_FIXTURE_NO_OPERATIONAL_BACKUP"));
                        jdbc.queryForObject("SELECT set_config('app.authorization_catalog_version',?,true)",String.class,PermissionCodes.CATALOG_VERSION);
                        try (var input=new ClassPathResource("db/cutover/authorization-contract.sql").getInputStream();
                             var statement=connection.createStatement()) {
                            statement.setQueryTimeout(30);
                            statement.execute(new String(input.readAllBytes(),StandardCharsets.UTF_8));
                        }
                    }
                    AuthorizationSchemaBarrierConfig.verify(jdbc);
                    connection.commit();
                } catch (Exception failure) {
                    connection.rollback();
                    throw new IllegalStateException("Explicit disposable authorization rehearsal failed",failure);
                }
            } catch (java.sql.SQLException failure) {
                throw new IllegalStateException("Disposable authorization rehearsal connection failed",failure);
            }
            flyway.migrate();
        };
    }

    static Target validateTarget(Set<String> profiles,String url,String ack) {
        if (!profiles.equals(Set.of("e2e")) || !ACK.equals(ack)) {
            throw new IllegalStateException("Authorization rehearsal requires only the e2e profile and explicit disposable database acknowledgement");
        }
        if (!url.startsWith("jdbc:postgresql://")) throw new IllegalStateException("Disposable PostgreSQL URL is required");
        URI target;
        try { target=URI.create(url.substring("jdbc:".length())); }
        catch (IllegalArgumentException invalid) { throw new IllegalStateException("Invalid disposable database URL"); }
        String database=target.getPath()==null?"":target.getPath().replaceFirst("^/","");
        if (target.getHost()==null || !HOSTS.contains(target.getHost()) || target.getRawUserInfo()!=null || target.getRawFragment()!=null
                || !database.matches("authz_e2e(?:_[a-z0-9]{1,40})?")) {
            throw new IllegalStateException("Authorization rehearsal is limited to named local disposable databases");
        }
        if (target.getRawQuery()!=null) {
            Map<String,String> query=new java.util.HashMap<>();
            for (String entry:target.getRawQuery().split("&")) {
                String[] pair=entry.split("=",2);
                String name=java.net.URLDecoder.decode(pair[0],StandardCharsets.UTF_8);
                String value=pair.length==2?java.net.URLDecoder.decode(pair[1],StandardCharsets.UTF_8):"";
                if (query.put(name,value)!=null || !Set.of("currentSchema","prepareThreshold","socketTimeout","connectTimeout","ApplicationName").contains(name)) {
                    throw new IllegalStateException("Unexpected disposable datasource option");
                }
            }
            if (query.containsKey("currentSchema") && !"public".equals(query.get("currentSchema"))) {
                throw new IllegalStateException("Authorization rehearsal requires the public schema");
            }
        }
        return new Target(target.getHost(),target.getPort()==-1?5432:target.getPort(),database);
    }
}
