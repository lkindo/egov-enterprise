package nuri.api.config;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;

/** New log readers/writers cannot start with an incomplete Sync even when remote Flyway is disabled. */
@Configuration
@Profile({"!test & !mock-security & !mock-security-test", "tc"})
@ConditionalOnProperty(name = "app.database.vendor", havingValue = "postgresql", matchIfMissing = true)
public class LogDurationReadinessConfig {
    @Bean
    static BeanFactoryPostProcessor logDurationReadinessDependency() {
        return factory -> {
            if (factory.containsBeanDefinition("entityManagerFactory")) {
                var definition=factory.getBeanDefinition("entityManagerFactory");
                List<String> dependencies=new ArrayList<>();
                if (definition.getDependsOn()!=null) dependencies.addAll(Arrays.asList(definition.getDependsOn()));
                dependencies.add("logDurationReadinessBarrier");
                definition.setDependsOn(dependencies.toArray(String[]::new));
            }
        };
    }

    @Bean
    @DependsOnDatabaseInitialization
    InitializingBean logDurationReadinessBarrier(DataSource dataSource) {
        return () -> verify(dataSource);
    }

    private static void verify(DataSource dataSource) {
        try (var connection=dataSource.getConnection()) {
            connection.setReadOnly(true);
            connection.setAutoCommit(false);
            try (var statement=connection.createStatement()) {
                statement.setQueryTimeout(5);
                statement.execute("SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='3s'; SET LOCAL transaction_timeout='15s'");
                try (var rows=statement.executeQuery("""
                        SELECT count(*) AS log_tables,
                          count(*) FILTER (WHERE c.relkind='r' AND c.relpersistence='p' AND NOT c.relispartition
                            AND NOT c.relrowsecurity AND NOT c.relforcerowsecurity) AS normal_tables
                        FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
                        WHERE n.nspname='public' AND c.relname IN ('tb_sys_log','tb_web_log')
                        """)) {
                    if (!rows.next()) throw new IllegalStateException("Cannot inspect log duration schema readiness");
                    // A generated composition without either log feature has no log reader to redirect.
                    if (rows.getInt("log_tables")==0) return;
                    if (rows.getInt("log_tables")!=2 || rows.getInt("normal_tables")!=2) {
                        throw new IllegalStateException("Log duration table shape or RLS requires review before startup");
                    }
                }
                // A successful readiness migration (or the generated final-schema baseline) proves the
                // one-time whole-table reconciliation. Normal startup must not scale with log volume.
                boolean reconciled=false;
                try (var rows=statement.executeQuery("SELECT to_regclass('public.flyway_schema_history') IS NOT NULL")) {
                    if (rows.next() && rows.getBoolean(1)) {
                        try (var history=connection.createStatement()) {
                            history.setQueryTimeout(5);
                            try (var applied=history.executeQuery("""
                                    SELECT EXISTS(SELECT 1 FROM public.flyway_schema_history WHERE success AND type='SQL'
                                      AND ((version='2.146' AND script='V2_146__require_log_duration_parity_before_redirect.sql')
                                        OR (version='1.0' AND script='V1_0__baseline.sql')))
                                    """)) { reconciled=applied.next() && applied.getBoolean(1); }
                        }
                    }
                }
                try (var rows=statement.executeQuery("""
                        WITH expected(table_name,trigger_name,function_name,body_md5) AS (VALUES
                          ('tb_sys_log','tr_sync_sys_log_prcs_req_msec','fn_sync_sys_log_prcs_req_msec','41446683e9f7ad61dc677ca353fbfda9'),
                          ('tb_web_log','tr_sync_web_log_prcs_req_msec','fn_sync_web_log_prcs_req_msec','961612955b1991940fd01e6de750243a'))
                        SELECT count(*) FROM expected e
                        JOIN pg_catalog.pg_class c ON c.oid=to_regclass('public.'||e.table_name)
                        JOIN pg_catalog.pg_trigger t ON t.tgrelid=c.oid AND t.tgname=e.trigger_name
                        JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid AND p.oid=to_regprocedure('public.'||e.function_name||'()')
                        WHERE NOT t.tgisinternal AND t.tgenabled='O' AND t.tgtype=23 AND t.tgnargs=0 AND t.tgqual IS NULL
                          AND (SELECT count(*) FROM pg_catalog.pg_trigger WHERE tgrelid=c.oid AND NOT tgisinternal)=1
                          AND ARRAY(SELECT unnest(t.tgattr) ORDER BY 1)=ARRAY(SELECT attnum FROM pg_catalog.pg_attribute
                            WHERE attrelid=c.oid AND attname IN ('prcs_tm','prcs_req_msec') ORDER BY attnum)
                          AND md5(replace(p.prosrc,E'\\r\\n',E'\\n'))=e.body_md5
                          AND p.prorettype='pg_catalog.trigger'::regtype AND p.pronargs=0 AND NOT p.prosecdef
                          AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
                          AND p.proconfig=ARRAY['search_path=pg_catalog, public']
                          AND (SELECT count(*) FROM information_schema.columns WHERE table_schema='public'
                            AND table_name=e.table_name AND column_name IN ('prcs_tm','prcs_req_msec')
                            AND data_type='bigint' AND is_nullable='YES' AND column_default IS NULL)=2
                          AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_inherits WHERE inhrelid=c.oid OR inhparent=c.oid)
                          AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_rewrite WHERE ev_class=c.oid)
                          AND current_setting('session_replication_role')='origin'
                        """)) {
                    if (!rows.next() || rows.getInt(1)!=2) {
                        throw new IllegalStateException("Log duration approved column, trigger or function contract differs before startup");
                    }
                }
                if (reconciled) return;
                try (var rows=statement.executeQuery("""
                        SELECT EXISTS(SELECT 1 FROM public.tb_sys_log WHERE prcs_req_msec IS DISTINCT FROM prcs_tm)
                            OR EXISTS(SELECT 1 FROM public.tb_web_log WHERE prcs_req_msec IS DISTINCT FROM prcs_tm)
                        """)) {
                    if (!rows.next() || rows.getBoolean(1)) {
                        throw new IllegalStateException("Log duration Sync is incomplete. Follow the log duration transition runbook before starting new readers/writers.");
                    }
                }
            } finally { connection.rollback(); }
        } catch (SQLException error) {
            // Never expose server DETAIL, log content, credentials or connection arguments during startup.
            throw new IllegalStateException("Log duration readiness failed (SQLSTATE " + error.getSQLState()
                    + "). Follow docs/04-operations/log-duration-transition-proposal.md before startup.");
        }
    }
}
