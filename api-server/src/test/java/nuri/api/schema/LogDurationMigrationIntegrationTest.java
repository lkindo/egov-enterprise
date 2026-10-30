package nuri.api.schema;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.Duration;
import java.util.List;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import nuri.api.config.LogDurationReadinessConfig;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Promoted Flyway provenance, actual observed volume, bounded Sync and Redirect refusal. */
@Tag("schema-validation")
class LogDurationMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {
    @Test
    void preservesObservedVolumeAndGuardsRedirectWithRealFlyway() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.144")));
        try (var connection=openConnection(); var statement=connection.createStatement()) {
            statement.executeUpdate("INSERT INTO tb_sys_log(dmnd_id,srvc_nm,mthd_nm,prcs_tm,ocrn_ymd) "
                    + "SELECT 'DURATION_'||n,rpad('fixture',80,'s'),rpad('fixture',80,'m'),(n%170)::bigint,'20261030' FROM generate_series(1,71) n");
            statement.executeUpdate("INSERT INTO tb_web_log(url,prcs_tm,occr_ymd) "
                    + "SELECT rpad('/synthetic-duration/'||n||'/'||md5(n::text),192,'x'),(n%2751)::bigint,'20261030' FROM generate_series(1,36473) n");
            try(var widths=statement.executeQuery("SELECT min(pg_column_size(t)) FROM tb_sys_log t UNION ALL SELECT min(pg_column_size(t)) FROM tb_web_log t")) {
                while(widths.next()) assertThat(widths.getInt(1)).isGreaterThanOrEqualTo(184);
            }
        }
        List<String> before;
        try (var connection=openConnection()) { before=snapshots(connection); }
        flyway(MigrationVersion.fromVersion("2.145")).migrate();
        var queries=new java.util.ArrayList<String>();
        var tracked=new org.springframework.jdbc.datasource.DelegatingDataSource(flyway(null).getConfiguration().getDataSource()) {
            @Override public Connection getConnection() throws SQLException {
                return track(super.getConnection(),queries);
            }
        };
        var factoryCreated=new java.util.concurrent.atomic.AtomicBoolean();
        var startup=new ApplicationContextRunner().withUserConfiguration(LogDurationReadinessConfig.class)
                .withBean(javax.sql.DataSource.class,()->tracked)
                .withBean("entityManagerFactory",Object.class,()->{factoryCreated.set(true);return new Object();});
        // No Flyway initializer is installed here: this exercises the normal remote-dev Flyway-off boundary.
        startup.run(context->assertThat(context).hasFailed().getFailure()
                .hasStackTraceContaining("Log duration Sync is incomplete"));
        assertThat(factoryCreated).as("readiness must fail before the entity manager factory initializes").isFalse();
        LogDurationCutoverTestSupport.assertRedirectRefusesUnsynchronizedRows(flyway(null));
        try (var connection=openConnection()) {
            connection.setAutoCommit(false);
            explainAndRollback(connection,"start");
            int batch=0;
            while(LogDurationCutoverTestSupport.pending(connection)>0) {
                long started=System.nanoTime();
                assertThat(LogDurationCutoverTestSupport.batch(connection)).isPositive();
                connection.commit();
                assertThat(Duration.ofNanos(System.nanoTime()-started)).isLessThan(Duration.ofSeconds(15));
                if(++batch==36) explainAndRollback(connection,"middle");
                if(LogDurationCutoverTestSupport.pending(connection)<=500) explainAndRollback(connection,"end");
                assertThat(batch).isLessThan(200);
            }
            connection.commit();
            assertThat(batch).isEqualTo(73);
            assertThat(snapshots(connection)).isEqualTo(before);
            connection.commit();
        }
        startup.run(context->assertThat(context).hasNotFailed());
        assertThat(factoryCreated).isTrue();
        flyway(null).migrate();
        assertThat(flyway(null).validateWithResult().validationSuccessful).isTrue();
        queries.clear();
        startup.run(context->assertThat(context).hasNotFailed());
        assertThat(queries).as("completed startup checks catalogs without reading either log heap")
                .noneMatch(query->query.contains("FROM public.tb_sys_log") || query.contains("FROM public.tb_web_log"));
        try(var connection=openConnection();var statement=connection.createStatement()) {
            statement.execute("ALTER TABLE tb_web_log DISABLE TRIGGER tr_sync_web_log_prcs_req_msec");
            try {
                startup.run(context->assertThat(context).hasFailed().getFailure()
                        .hasStackTraceContaining("approved column, trigger or function contract differs"));
            } finally { statement.execute("ALTER TABLE tb_web_log ENABLE TRIGGER tr_sync_web_log_prcs_req_msec"); }
        }
        try(var connection=openConnection();var statement=connection.createStatement()) {
            connection.setAutoCommit(false);
            var clean=connection.setSavepoint();
            statement.execute("ALTER TABLE tb_web_log ENABLE ROW LEVEL SECURITY");
            assertThatThrownBy(()->LogDurationCutoverTestSupport.batch(connection)).isInstanceOf(SQLException.class)
                    .hasMessageContaining("table shape, RLS");
            connection.rollback(clean);
            statement.executeUpdate("UPDATE meta_standard_domains SET data_length=18 WHERE domain_name='밀리초N19'");
            assertThatThrownBy(()->LogDurationCutoverTestSupport.batch(connection)).isInstanceOf(SQLException.class)
                    .hasMessageContaining("domain name or exact definition conflicts");
            connection.rollback(clean);
            // Same function OID with a changed body must fail before an operator can report readiness.
            statement.execute("CREATE OR REPLACE FUNCTION public.fn_sync_sys_log_prcs_req_msec() RETURNS trigger "
                    + "LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$ BEGIN RETURN NEW; END; $$");
            assertThatThrownBy(()->LogDurationCutoverTestSupport.batch(connection)).isInstanceOf(SQLException.class)
                    .hasMessageContaining("function definition differs");
            connection.rollback(clean);
            assertThat(LogDurationCutoverTestSupport.pending(connection)).isZero();
            connection.rollback();
        }
    }

    @Test
    void disposableE2eInitializerPreservesLegacyDevSeedsAcrossTheStagedTransition() throws Exception {
        String database="authz_e2e_"+java.util.UUID.randomUUID().toString().replace("-", "");
        try(var connection=openConnection();var statement=connection.createStatement()) {
            statement.execute("CREATE DATABASE "+database);
            String currentUrl=connection.getMetaData().getURL();
            String targetUrl=currentUrl.substring(0,currentUrl.lastIndexOf('/')+1)+database;
            var original=flyway(null).getConfiguration();
            var disposable=org.flywaydb.core.Flyway.configure().dataSource(targetUrl,original.getUser(),original.getPassword())
                    .locations("classpath:db/migration","classpath:db/seed-dev").load();
            try {
                new ApplicationContextRunner().withUserConfiguration(nuri.api.config.IsolatedAuthorizationRehearsalConfig.class)
                        .withInitializer(context->context.getEnvironment().setActiveProfiles("e2e"))
                        .withPropertyValues("nuri.authorization.isolated-cutover=true",
                                "nuri.authorization.disposable-database-ack=CONFIRMED_DISPOSABLE_AUTHZ_DATABASE",
                                "spring.datasource.url="+targetUrl)
                        .run(context->{
                            assertThat(context).hasNotFailed();
                            context.getBean(org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy.class).migrate(disposable);
                        });
                assertThat(disposable.validateWithResult().validationSuccessful).isTrue();
                try(var seeded=disposable.getConfiguration().getDataSource().getConnection();var check=seeded.createStatement();
                    var rows=check.executeQuery("SELECT count(*),count(*) FILTER(WHERE prcs_tm IS NOT DISTINCT FROM prcs_req_msec) "
                            +"FROM tb_sys_log WHERE dmnd_id LIKE 'SEED_SYSLOG_%'")) {
                    assertThat(rows.next()).isTrue();assertThat(rows.getLong(1)).isEqualTo(12);assertThat(rows.getLong(2)).isEqualTo(12);
                }
            } finally { statement.execute("DROP DATABASE "+database+" WITH (FORCE)"); }
        }
    }

    private static Connection track(Connection delegate,List<String> queries) {
        return (Connection)java.lang.reflect.Proxy.newProxyInstance(Connection.class.getClassLoader(),new Class<?>[]{Connection.class},
                (proxy,method,args)->{
                    try {
                        Object value=method.invoke(delegate,args);
                        if (method.getName().equals("createStatement")) {
                            return java.lang.reflect.Proxy.newProxyInstance(java.sql.Statement.class.getClassLoader(),new Class<?>[]{java.sql.Statement.class},
                                    (statement,operation,arguments)->{
                                        if (arguments!=null && arguments.length>0 && arguments[0] instanceof String sql) queries.add(sql);
                                        try { return operation.invoke(value,arguments); }
                                        catch(java.lang.reflect.InvocationTargetException failure) { throw failure.getCause(); }
                                    });
                        }
                        return value;
                    } catch(java.lang.reflect.InvocationTargetException failure) { throw failure.getCause(); }
                });
    }

    private static List<String> snapshots(Connection connection) throws SQLException {
        try(var statement=connection.createStatement();var rows=statement.executeQuery("""
                SELECT md5(string_agg((to_jsonb(t)-'prcs_req_msec')::text,'' ORDER BY sys_log_sn)) FROM tb_sys_log t
                UNION ALL
                SELECT md5(string_agg((to_jsonb(t)-'prcs_req_msec')::text,'' ORDER BY web_log_sn)) FROM tb_web_log t
                """)) {
            var result=new java.util.ArrayList<String>();while(rows.next())result.add(rows.getString(1));return result;
        }
    }

    private static void explainAndRollback(Connection connection,String phase) throws Exception {
        var savepoint=connection.setSavepoint();
        String sql=LogDurationCutoverTestSupport.BACKFILL;
        int start=sql.indexOf("WITH selected AS MATERIALIZED");
        try(var statement=connection.createStatement()) {
            statement.execute(sql.substring(0,start));
            String[] updates=sql.substring(start).split("(?<=;)\\s*(?=WITH selected)");
            assertThat(updates).hasSize(2);
            for(String update:updates) {
                try(var rows=statement.executeQuery("EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) "+update)) {
                    assertThat(rows.next()).isTrue();
                    var plan=JsonMapper.builder().build().readTree(rows.getString(1)).get(0);
                    assertThat(plan.get("Execution Time").asDouble()).isLessThan(5000);
                    System.out.println("[log-duration-plan] phase="+phase+" executionMs="+plan.get("Execution Time")
                            +" sharedHitBlocks="+plan.get("Plan").get("Shared Hit Blocks")
                            +" sharedReadBlocks="+plan.get("Plan").get("Shared Read Blocks"));
                }
            }
        } finally { connection.rollback(savepoint); }
    }
}
