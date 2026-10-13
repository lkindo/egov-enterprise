package nuri.api.schema;

import nuri.business.domain.informalsanction.ApprovalStageKind;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.code.CommonCodeService;
import nuri.business.service.code.dto.CommonCodeDto;
import nuri.business.service.informalsanction.InformalSanctionService;
import nuri.business.service.informalsanction.dto.ApprovalStageRequest;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import nuri.business.service.informalsanction.event.SanctionEventListener;
import nuri.business.service.notification.NotificationService;
import nuri.business.service.notification.listener.NotificationRequestListener;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * 결재와 알림을 함께 보는 실 PostgreSQL 시험 — 결재 통합 시험(ApprovalWorkflowIntegrationTest)에서 알림 행을 보는 시험 하나를 떼어
 * 왔다(GAP-BASE-003). 알림 서비스·리스너 타입을 참조하므로 결재나 알림 어느 쪽이 빠진 구성에서는 이 클래스가 함께 빠지고,
 * 게이트 소유는 결재 기능 파일에 알림을 함께 요구하는 행으로 적는다(config/modules/informalsanction.json).
 */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class ApprovalReferenceNotificationIntegrationTest {
    private static final String OWNER = "WF_OWNER";
    @Autowired private InformalSanctionService service;
    /** 알림 리스너는 이 클래스에서 목이다 — 시험이 실제 알림 서비스로 넘겨 알림 행(사용자 FK)을 쓴다. */
    @Autowired private NotificationService notificationService;
    @Autowired private JdbcTemplate jdbc;
    @MockitoBean private UserRepository users;
    @MockitoBean private CommonCodeService codes;
    @MockitoBean private SanctionEventListener finalNotifications;
    @MockitoBean private NotificationRequestListener inAppNotifications;
    private final List<Long> ownDocuments = new ArrayList<>();

    @BeforeEach
    void taskCode() {
        when(codes.getCodesByGroup("COM075")).thenReturn(List.of(new CommonCodeDto("COM075", "WF", "검토", null, "Y")));
    }

    @AfterEach
    void removeOnlyOwnDocuments() {
        SecurityContextHolder.clearContext();
        for (long id : ownDocuments) {
            jdbc.update("DELETE FROM tb_ifml_atrz_rfpr WHERE ifml_atrz_sn=?", id);
            jdbc.update("DELETE FROM tb_ifml_atrz_prcs_hstry WHERE ifml_atrz_sn=?", id);
            jdbc.update("DELETE FROM tb_ifml_atrz_dtl WHERE ifml_atrz_sn=?", id);
            jdbc.update("DELETE FROM tb_ifml_atrz_hstry WHERE ifml_atrz_sn=?", id);
            jdbc.update("DELETE FROM tb_ifml_atrz_info WHERE ifml_atrz_sn=?", id);
        }
        ownDocuments.clear();
    }

    /**
     * [2026-10-04 D4 개정 1] 지워진 참조자 때문에 결재가 되돌아가지 않는다. 참조 행은 사용자 삭제 뒤에도 남는데(사용자 FK 없음)
     * 알림 행(tb_user_noti)은 사용자 FK 가 있고 업무 트랜잭션 안에서 저장된다 — 지워진 참조자에게 결과 알림을 보내면 FK 위반으로
     * 승인 전체가 되돌아간다. 이 시험만 실제 알림 서비스로 알림 행을 쓴다(나머지 시험의 결재자·참조자는 사용자 행이 없다).
     */
    @Test
    void approvalSucceedsWhenACurrentCycleReferenceAccountWasDeletedOnPostgres() {
        String fixture = "WFN" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        String approver = fixture + "A";
        String kept = fixture + "K";
        String deleted = fixture + "D";
        List<String> people = List.of(approver, kept, deleted);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM pg_constraint WHERE conname='fk_tb_user_noti_tb_user_info'",
                Integer.class)).as("알림 행은 사용자 FK 로 묶여 있다 — 없으면 이 시험은 아무것도 증명하지 않는다").isEqualTo(1);
        try {
            for (String person : people) {
                jdbc.update("INSERT INTO tb_user_info(esntl_id,user_id,user_nm,pswd,user_stts_cd,lck_yn,sbscrb_ymd) "
                        + "VALUES(?,?,'reference fixture','!authentication-disabled!','P','N',to_char(CURRENT_DATE,'YYYYMMDD'))",
                        person, person.toLowerCase(java.util.Locale.ROOT));
            }
            // 사용자 저장소는 이 클래스에서 목이다 — 이 시험에서는 실제 사용자 행이 있는 사람만 돌려준다(지운 사람은 없다).
            //   응답은 부를 때마다 사용자 행을 다시 본다 — 아래에서 지운 참조자는 승인 시점에 빠진다.
            org.mockito.Mockito.doAnswer(call -> {
                List<User> result = new ArrayList<>();
                Iterable<String> ids = call.getArgument(0);
                for (String id : ids) {
                    Integer rows = jdbc.queryForObject("SELECT count(*) FROM tb_user_info WHERE esntl_id=?", Integer.class, id);
                    if (rows != null && rows > 0) {
                        result.add(User.builder().esntlId(id).userId(id).userNm(id).userSttsCd("P").build());
                    }
                }
                return result;
            }).when(users).findAllById(any());
            when(users.findActiveEsntlIdsHoldingPermission("APPROVAL_APPROVE")).thenReturn(List.of(approver));
            when(users.findActiveEsntlIdsHoldingPermission("APPROVAL_READ")).thenReturn(people);
            org.mockito.Mockito.doAnswer(call -> notificationService.createForEvent(call.getArgument(0)))
                    .when(inAppNotifications).onNotificationRequested(any());

            authenticate(OWNER);
            long id = service.registerInformalSanction(document("검토 요청", "지워질 참조자가 있는 기안"),
                    List.of(stage(ApprovalStageKind.APPROVAL, approver)), List.of(kept, deleted));
            ownDocuments.add(id);
            assertThat(notificationCount(deleted)).as("지정 알림이 실제 알림 행으로 저장된다(리스너가 실제로 불린다)").isEqualTo(1);

            jdbc.update("DELETE FROM tb_sys_job WHERE job_se_nm='NOTIFICATION_DELIVERY' AND job_cn::jsonb->>'receiver'=?", deleted);
            jdbc.update("DELETE FROM tb_user_noti WHERE rcvr_id=?", deleted);
            assertThat(jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", deleted)).isEqualTo(1);

            authenticate(approver);
            service.confirmInformalSanction(id, "C", null, service.getInformalSanction(id, approver).getVersion());

            assertThat(jdbc.queryForObject("SELECT aprv_yn FROM tb_ifml_atrz_info WHERE ifml_atrz_sn=?", String.class, id))
                    .as("지워진 참조자가 있어도 승인이 커밋된다").isEqualTo("C");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_user_noti WHERE rcvr_id=? AND noti_ttl_nm=?",
                    Integer.class, kept, "결재가 완료되었습니다")).as("남은 참조자는 결과 알림을 받는다").isEqualTo(1);
            assertThat(notificationCount(deleted)).isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_rfpr WHERE ifml_atrz_sn=? AND user_id=?",
                    Integer.class, id, deleted)).as("참조 행은 문서 기록으로 남는다").isEqualTo(1);
        } finally {
            for (String person : people) {
                jdbc.update("DELETE FROM tb_sys_job WHERE job_se_nm='NOTIFICATION_DELIVERY' AND job_cn::jsonb->>'receiver'=?", person);
                jdbc.update("DELETE FROM tb_user_noti WHERE rcvr_id=?", person);
                jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", person);
            }
        }
    }

    private int notificationCount(String receiver) {
        return jdbc.queryForObject("SELECT count(*) FROM tb_user_noti WHERE rcvr_id=?", Integer.class, receiver);
    }

    private InformalSanctionDto document(String title, String content) {
        return InformalSanctionDto.builder().aplcntId(OWNER).taskSeCd("WF").reqYmd("20260916")
                .docTtl(title).docCn(content).build();
    }

    private static ApprovalStageRequest stage(ApprovalStageKind kind, String... approvers) {
        return new ApprovalStageRequest(kind, List.of(approvers));
    }

    private static void authenticate(String id) {
        var principal = CustomUserDetails.builder().userId(id).esntlId(id).enabled(true).build();
        var authorities = java.util.stream.Stream.of("APPROVAL_READ", "APPROVAL_CREATE", "APPROVAL_APPROVE", "APPROVAL_CANCEL")
                .map(org.springframework.security.core.authority.SimpleGrantedAuthority::new).toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, authorities));
    }
}
