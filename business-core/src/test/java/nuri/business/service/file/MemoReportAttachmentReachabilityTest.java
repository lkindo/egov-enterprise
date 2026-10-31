package nuri.business.service.file;

import nuri.business.domain.file.FileMaster;
import nuri.business.support.AuthorizationTestPrincipal;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * 메모보고 첨부의 도달성 — 실제 참조 SQL 과 판정 정책을 함께 돌린다(H2).
 *
 * <p>[고친 결함] 메모보고 첨부의 참조원은 작성자({@code frst_rgtr_id})만 소유자로 알았다. 그래서 보고를 받은 수신자
 * ({@code rptr_id}, esntlId)는 본문은 읽으면서 첨부는 403 이었다. 수신자는 열람만 하고 지우지 못해야 하며(메모를 고치거나
 * 지울 수 없다), 수신자도 작성자도 아닌 사람과 관리자는 여전히 열 수 없어야 한다(개인 귀속, H3).
 */
@DisplayName("메모보고 첨부 도달성 — 작성자·수신자·제3자")
class MemoReportAttachmentReachabilityTest {

    private static final long ATCH_FILE_SN = 101L;

    private SingleConnectionDataSource source;
    private FileAccessPolicy policy;

    @BeforeEach
    void createDatabase() {
        source = new SingleConnectionDataSource("jdbc:h2:mem:memo-file-" + java.util.UUID.randomUUID(), "sa", "", true);
        JdbcTemplate jdbc = new JdbcTemplate(source);
        jdbc.execute("CREATE TABLE tb_memo_rpt_info(memo_rpt_sn BIGINT, atch_file_sn BIGINT, frst_rgtr_id VARCHAR(20),"
                + " user_id VARCHAR(20), rptr_id VARCHAR(20))");
        jdbc.update("INSERT INTO tb_memo_rpt_info VALUES (1, ?, 'author-login', 'author-esntl', 'recipient-esntl')",
                ATCH_FILE_SN);
        JdbcAttachmentReferenceResolver resolver =
                new JdbcAttachmentReferenceResolver(jdbc, List.of(() -> List.of(AttachmentSource.MEMO_REPORT)));
        policy = new FileAccessPolicy(resolver);
    }

    @AfterEach
    void closeDatabase() {
        source.destroy();
        SecurityContextHolder.clearContext();
    }

    private static void authenticateAs(String loginId, String esntlId, String group) {
        SecurityContextHolder.getContext().setAuthentication(
                AuthorizationTestPrincipal.authentication(loginId, esntlId, group));
    }

    /** 첨부는 작성자가 아닌 다른 사람이 올렸다고 둔다 — 업로더 조기 허용이 판정을 가리지 않게. */
    private static FileMaster attachment() {
        FileMaster master = new FileMaster(ATCH_FILE_SN);
        master.setFrstRgtrId("uploader-login");
        return master;
    }

    @Test
    @DisplayName("🔒 수신자는 받은 메모의 첨부를 열지만 지우지 못한다")
    void recipientReadsButCannotDelete() {
        authenticateAs("recipient-login", "recipient-esntl", "USER");

        assertThatCode(() -> policy.assertReadable(attachment()))
                .as("메모보고 수신자가 받은 보고의 첨부를 열지 못한다")
                .doesNotThrowAnyException();
        assertThatExceptionOfType(BusinessException.class)
                .as("수신자가 작성자의 메모 첨부를 지웠다")
                .isThrownBy(() -> policy.assertDeletable(attachment()))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("🔒 작성자는 자기 메모의 첨부를 열지만 개별 삭제로 지우지 못한다 — 지시가 달린 뒤 첨부를 뺄 수 없다(ADR-0048)")
    void authorReadsButCannotDeleteThroughFileApi() {
        authenticateAs("author-login", "author-esntl", "USER");

        assertThatCode(() -> policy.assertReadable(attachment())).doesNotThrowAnyException();
        assertThatExceptionOfType(BusinessException.class)
                .isThrownBy(() -> policy.assertDeletable(attachment()));
    }

    @Test
    @DisplayName("🔒 수신자도 작성자도 아닌 사람은 열지 못하고, 관리자도 개인 귀속 첨부를 우회하지 못한다")
    void strangerAndAdminAreDenied() {
        authenticateAs("stranger-login", "stranger-esntl", "USER");
        assertThatExceptionOfType(BusinessException.class)
                .as("수신자도 작성자도 아닌 사람이 메모 첨부를 열었다")
                .isThrownBy(() -> policy.assertReadable(attachment()))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);

        authenticateAs("admin-login", "admin-esntl", "ADMIN");
        assertThatExceptionOfType(BusinessException.class)
                .as("관리자가 개인 귀속 메모 첨부를 우회해 열었다")
                .isThrownBy(() -> policy.assertReadable(attachment()))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("수신자 판정은 esntlId 축이다 — 로그인 ID 가 수신자 esntlId 와 같아도 근거가 되지 못한다")
    void recipientAxisIsEsntlId() {
        authenticateAs("recipient-esntl", "another-esntl", "USER");

        assertThatExceptionOfType(BusinessException.class)
                .as("로그인 ID 가 수신자 esntlId 와 같다는 이유로 메모 첨부가 열렸다")
                .isThrownBy(() -> policy.assertReadable(attachment()))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }
}
