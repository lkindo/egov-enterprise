package nuri.api.schema;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Pattern;
import nuri.business.domain.log.SysLog;
import nuri.business.domain.log.WebLog;
import nuri.business.service.log.LogManageService;
import nuri.business.service.log.dto.WebLogDto;
import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.assertThat;

/** Actual new-column ORM writes, legacy writer compatibility, Long range and unchanged API DTO types. */
@Tag("schema-validation")
@SpringBootTest(properties="nuri.durable-work.enabled=false")
@Import({AuthorizationSchemaRehearsalTestConfiguration.class,LogDurationJpaIntegrationTest.CaptureTestConfiguration.class})
@ActiveProfiles({"test","tc"})
@Transactional
public class LogDurationJpaIntegrationTest {
    public static class CapturedSql implements StatementInspector {
        final List<String> statements = new CopyOnWriteArrayList<>();
        @Override public String inspect(String sql) { statements.add(sql); return sql; }
    }
    @TestConfiguration(proxyBeanMethods=false)
    public static class CaptureTestConfiguration {
        @Bean CapturedSql capturedSql() { return new CapturedSql(); }
        @Bean HibernatePropertiesCustomizer captureStatements(CapturedSql collector) {
            return properties->properties.put("hibernate.session_factory.statement_inspector",collector);
        }
    }
    @Autowired private CapturedSql capturedSql;
    @PersistenceContext private EntityManager entityManager;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private LogManageService systemLogs;
    @Autowired private JsonMapper json;

    @Test
    void writesOnlyNewPhysicalColumnsAndPreservesDtosNullsAndLegacyWriters() {
        var factory=entityManager.getEntityManagerFactory().unwrap(org.hibernate.engine.spi.SessionFactoryImplementor.class);
        assertThat(factory.getSessionFactoryOptions().getStatementInspector()).isSameAs(capturedSql);
        capturedSql.statements.clear();
        var system=systemLog(0L);
        var web=webLog(1200L);
        entityManager.persist(system);entityManager.persist(web);entityManager.flush();entityManager.clear();
        var inserts=capturedSql.statements.stream().map(sql->sql.replace("\"","").toLowerCase(Locale.ROOT))
                .filter(sql->Pattern.compile("insert\\s+into\\s+(?:public\\.)?tb_(?:sys|web)_log\\b").matcher(sql).find()).toList();
        assertThat(inserts).as("Captured SQL: %s",capturedSql.statements).hasSize(2).allSatisfy(sql->{
            assertThat(sql).contains("prcs_req_msec");
            assertThat(Pattern.compile("\\bprcs_tm\\b").matcher(sql).find()).isFalse();
        });
        assertThat(jdbc.queryForObject("SELECT prcs_tm FROM tb_sys_log WHERE sys_log_sn=?",Long.class,system.getSysLogSn())).isZero();
        assertThat(jdbc.queryForObject("SELECT prcs_tm FROM tb_web_log WHERE web_log_sn=?",Long.class,web.getWebLogSn())).isEqualTo(1200L);
        var systemJson=json.valueToTree(systemLogs.selectSysLogDetail(system.getSysLogSn()));
        var webJson=json.valueToTree(WebLogDto.from(entityManager.find(WebLog.class,web.getWebLogSn())));
        assertThat(systemJson.get("prcsTm").isString()).isTrue();
        assertThat(systemJson.get("prcsTm").asString()).isEqualTo("0");
        assertThat(webJson.get("prcsTm").isNumber()).isTrue();
        assertThat(webJson.get("prcsTm").asLong()).isEqualTo(1200L);

        // Old writers remain supported after Redirect; only one representation is supplied per statement.
        jdbc.update("UPDATE tb_sys_log SET prcs_tm=42 WHERE sys_log_sn=?",system.getSysLogSn());
        jdbc.update("UPDATE tb_web_log SET prcs_tm=NULL WHERE web_log_sn=?",web.getWebLogSn());
        entityManager.clear();
        assertThat(entityManager.find(SysLog.class,system.getSysLogSn()).getPrcsTm()).isEqualTo(42L);
        assertThat(entityManager.find(WebLog.class,web.getWebLogSn()).getPrcsTm()).isNull();
        for(Long duration:new Long[]{null,Long.MIN_VALUE,Long.MAX_VALUE}) {
            var sys=systemLog(duration);var view=webLog(duration);
            entityManager.persist(sys);entityManager.persist(view);entityManager.flush();entityManager.clear();
            assertThat(entityManager.find(SysLog.class,sys.getSysLogSn()).getPrcsTm()).isEqualTo(duration);
            assertThat(entityManager.find(WebLog.class,view.getWebLogSn()).getPrcsTm()).isEqualTo(duration);
            assertThat(jdbc.queryForObject("SELECT prcs_tm FROM tb_sys_log WHERE sys_log_sn=?",Long.class,sys.getSysLogSn())).isEqualTo(duration);
            assertThat(jdbc.queryForObject("SELECT prcs_tm FROM tb_web_log WHERE web_log_sn=?",Long.class,view.getWebLogSn())).isEqualTo(duration);
        }
    }
    private static SysLog systemLog(Long duration) {
        return SysLog.builder().dmndId("D02"+UUID.randomUUID().toString().replace("-","").substring(0,16))
                .srvcNm("duration fixture").mthdNm("fixture").prcsSeCd("R").rspnsCd("200")
                .errSeCd("N").ocrnYmd("20261030").prcsTm(duration).build();
    }
    private static WebLog webLog(Long duration) {
        return WebLog.builder().url("/synthetic-duration").occrYmd("20261030").prcsTm(duration).build();
    }
}
