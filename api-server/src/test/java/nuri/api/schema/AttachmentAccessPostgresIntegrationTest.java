package nuri.api.schema;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
import nuri.business.service.file.AttachmentReferenceResolver;
import nuri.business.service.file.AttachmentReferenceResolver.Grants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

/**
 * 첨부 판정 SQL 을 실제 스키마에서 돌린다.
 *
 * <p>참조원 하나의 조회가 실패하면 fail-closed 로 <b>모든 첨부가 403</b> 이 된다. 그래서 표·컬럼 이름 오류는 단위 시험의 가짜 JDBC 로는
 * 보이지 않고 운영에서 전체 장애로 나타난다. 첫 시험이 등록된 참조원 전부를 실제로 조회한다.
 *
 * <p>부서 업무는 본문 열람(DeptJobService#assertCanViewDeptJob)과 같은 범위인지, 쓰기와 같은 소유 축인지 본다.
 */
@Tag("schema-validation")
@SpringBootTest(properties = "nuri.durable-work.enabled=false")
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class AttachmentAccessPostgresIntegrationTest {
    private static final String REGISTRAR_LOGIN = "attach-registrar";
    private static final String ASSIGNEE_LOGIN = "attach-assignee";

    @Autowired private AttachmentReferenceResolver attachments;
    @Autowired private JdbcTemplate jdbc;

    private String registrar;
    private String assignee;
    private String colleague;
    private String outsider;
    private String department;
    private String otherDepartment;
    private Long box;
    private Long file;

    @BeforeEach
    void seed() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        department = "ATCHD" + suffix;
        otherDepartment = "ATCHO" + suffix;
        jdbc.update("INSERT INTO tb_ognz_info (ognz_id, ognz_nm) VALUES (?, '첨부 판정'), (?, '다른 부서')", department, otherDepartment);
        registrar = user("REG" + suffix, department);
        assignee = user("PIC" + suffix, otherDepartment);
        colleague = user("COL" + suffix, department);
        outsider = user("OUT" + suffix, otherDepartment);
        box = jdbc.queryForObject("INSERT INTO tb_dept_job_bx (dept_task_box_nm, dept_id) VALUES ('첨부 판정', ?)"
                + " RETURNING dept_task_box_sn", Long.class, department);
        file = jdbc.queryForObject("INSERT INTO tb_file_master (use_yn) VALUES ('Y') RETURNING atch_file_sn", Long.class);
    }

    @AfterEach
    void cleanup() {
        jdbc.update("DELETE FROM tb_note_rcptn WHERE note_sn IN (SELECT note_sn FROM tb_note_info WHERE atch_file_sn = ?)", file);
        jdbc.update("DELETE FROM tb_note_sndng WHERE note_sn IN (SELECT note_sn FROM tb_note_info WHERE atch_file_sn = ?)", file);
        jdbc.update("DELETE FROM tb_note_info WHERE atch_file_sn = ?", file);
        jdbc.update("DELETE FROM tb_dept_task_info WHERE atch_file_sn = ?", file);
        jdbc.update("DELETE FROM tb_dept_job_bx WHERE dept_task_box_sn = ?", box);
        jdbc.update("DELETE FROM tb_file_master WHERE atch_file_sn = ?", file);
        for (String user : List.of(registrar, assignee, colleague, outsider)) {
            jdbc.update("DELETE FROM tb_user_info WHERE esntl_id = ?", user);
        }
        jdbc.update("DELETE FROM tb_ognz_info WHERE ognz_id IN (?, ?)", department, otherDepartment);
    }

    @Test
    @DisplayName("🚨 등록된 참조원 전부가 실제 스키마에서 조회된다 — 표·컬럼 오류 하나가 모든 첨부를 막는다")
    void everyRegisteredSourceQueriesTheRealSchema() {
        assertThat(attachments.resolve(file, REGISTRAR_LOGIN, registrar).resolutionFailed())
                .as("참조원 조회가 실패했다 — 표·컬럼 이름을 확인한다").isFalse();
        assertThat(attachments.referenced(file)).as("참조 행이 없는 첨부").isFalse();
    }

    @Test
    @DisplayName("🔐 부서 업무 첨부는 등록자·담당자·같은 부서만 열고, 다른 부서는 열지 못한다")
    void deptTaskIsSharedOnlyWithTheBodyReaders() {
        task(box, assignee);

        assertThat(grants(ASSIGNEE_LOGIN, assignee).sharedGrant()).as("다른 부서의 담당자").isTrue();
        assertThat(grants(REGISTRAR_LOGIN, registrar).sharedGrant()).as("등록자").isTrue();
        assertThat(grants("attach-colleague", colleague).sharedGrant()).as("업무함과 같은 부서").isTrue();
        assertThat(grants("attach-outsider", outsider).sharedGrant()).as("무관한 다른 부서").isFalse();
        assertThat(attachments.referenced(file)).isTrue();
    }

    @Test
    @DisplayName("🔐 담당자를 둔 업무의 삭제 근거는 담당자에게 있다 — 등록자는 열람만 한다")
    void assigneeOwnsAttachmentOnceAssigned() {
        task(box, assignee);

        assertThat(grants(ASSIGNEE_LOGIN, assignee).ownerGrant()).as("담당자").isTrue();
        assertThat(grants(REGISTRAR_LOGIN, registrar).ownerGrant()).as("담당자를 둔 뒤의 등록자").isFalse();
        assertThat(grants("attach-colleague", colleague).ownerGrant()).as("같은 부서").isFalse();
    }

    @Test
    @DisplayName("담당자가 공석이면 등록자가 소유하고, 업무함이 없으면 같은 부서 근거가 없다")
    void unassignedTaskWithoutBoxBelongsToItsRegistrar() {
        task(null, null);

        assertThat(grants(REGISTRAR_LOGIN, registrar).ownerGrant()).isTrue();
        assertThat(grants("attach-colleague", colleague).sharedGrant()).as("업무함 없는 업무의 같은 부서 사용자").isFalse();
    }

    @Test
    @DisplayName("🔐 쪽지 사본을 지운 당사자는 첨부를 열지 못하고, 남은 상대의 근거는 그대로다")
    void deletedNoteCopyClosesAttachmentForThatPartyOnly() {
        Long note = jdbc.queryForObject("INSERT INTO tb_note_info (note_ttl, note_cn, atch_file_sn, frst_rgtr_id)"
                + " VALUES ('첨부 판정', '첨부 판정', ?, ?) RETURNING note_sn", Long.class, file, REGISTRAR_LOGIN);
        Long sent = jdbc.queryForObject("INSERT INTO tb_note_sndng (note_sn, sndr_id, del_yn) VALUES (?, ?, 'N')"
                + " RETURNING note_sndng_sn", Long.class, note, registrar);
        jdbc.update("INSERT INTO tb_note_rcptn (note_sn, note_sndng_sn, rcvr_id, del_yn) VALUES (?, ?, ?, 'N')",
                note, sent, assignee);
        assertThat(grants(REGISTRAR_LOGIN, registrar).ownerGrant()).as("발신자").isTrue();
        assertThat(grants(ASSIGNEE_LOGIN, assignee).ownerGrant()).as("수신자").isTrue();

        jdbc.update("UPDATE tb_note_sndng SET del_yn = 'Y' WHERE note_sndng_sn = ?", sent);
        assertThat(grants(REGISTRAR_LOGIN, registrar).ownerGrant()).as("사본을 지운 발신자").isFalse();
        assertThat(grants(ASSIGNEE_LOGIN, assignee).ownerGrant()).as("남은 수신자").isTrue();

        jdbc.update("UPDATE tb_note_rcptn SET del_yn = 'Y' WHERE note_sn = ?", note);
        assertThat(grants(ASSIGNEE_LOGIN, assignee).ownerGrant()).as("사본을 지운 수신자").isFalse();
        assertThat(attachments.referenced(file)).as("쪽지 행이 남아 미첨부 창으로 돌아가지 않는다").isTrue();
    }

    private Grants grants(String loginId, String esntlId) {
        Grants grants = attachments.resolve(file, loginId, esntlId);
        assertThat(grants.resolutionFailed()).isFalse();
        return grants;
    }

    private void task(Long taskBox, String pic) {
        jdbc.update("INSERT INTO tb_dept_task_info (dept_task_box_sn, dept_task_nm, pic_id, atch_file_sn, frst_rgtr_id)"
                + " VALUES (?, '첨부 판정', ?, ?, ?)", taskBox, pic, file, REGISTRAR_LOGIN);
    }

    private String user(String id, String ognz) {
        jdbc.update("INSERT INTO tb_user_info (esntl_id, user_id, user_nm, pswd, user_stts_cd, lck_yn, sbscrb_ymd, ognz_id)"
                + " VALUES (?, ?, '첨부 판정', '!authentication-disabled!', 'P', 'N', '20260101', ?)", id, id, ognz);
        return id;
    }
}
