package nuri.api.schema;

import nuri.business.domain.user.exception.UserErrorCode;
import nuri.business.service.user.LoginIdReuseGuard;
import nuri.business.service.user.UserService;
import nuri.business.service.user.dto.UserSignupRequest;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.user.LoginIdReferenceContributor.Reference;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 지워진 계정의 기록이 들고 있는 로그인 ID 로는 새 계정을 만들지 못하는지 실제 PostgreSQL·실제 빈으로 본다.
 *
 * <p>[왜 필요한가] 사용자는 물리 삭제되지만 업무 보고·일정·부서 업무·첨부 등은 주인을 로그인 ID 로 판정한다. 같은
 * 로그인 ID 로 새 계정을 만들면 그 계정이 옛 기록을 제 것으로 물려받았다. 기능마다 등록한 컬럼이 실제 스키마에 있고,
 * 사용자 등록이 그 컬럼에 남은 로그인 ID 를 일반 중복과 같은 오류로 거부하는지 확인한다.
 *
 * <p>[생성물에서도 성립] 기능별 표는 직접 건드리지 않는다 — 재사용 생성물에서 빠진 기능의 표는 없기 때문이다. 기능이
 * 등록한 컬럼은 '있는 것' 만 대조하고, 등록 거부의 끝-끝 경로는 늘 남는 core 표(부서 업무)로 본다.
 */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
@DisplayName("로그인 ID 재사용 차단 — 옛 기록을 물려받는 새 계정을 만들지 않는다")
class LoginIdReuseIntegrationTest {

    @Autowired private UserService users;
    @Autowired private LoginIdReuseGuard guard;
    @Autowired private JdbcTemplate jdbc;

    private String loginId;
    private String admin;
    private String adminGroup;
    private final List<Long> deptTasks = new ArrayList<>();
    private final List<String> codeCategories = new ArrayList<>();

    @BeforeEach
    void pickUnusedLoginId() {
        SecurityContextHolder.clearContext();
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        loginId = "reuse" + suffix;
        admin = "RAU" + suffix;
        adminGroup = "RAG" + suffix;
        authorizeSignup();
    }

    /** 가입은 잠금 뒤 DB 의 현재 권한을 다시 본다 — 권한을 든 사용자를 실제 행으로 둔다. */
    private void authorizeSignup() {
        jdbc.update("INSERT INTO tb_user_info(esntl_id,user_id,user_nm,pswd,user_stts_cd,lck_yn,sbscrb_ymd) "
                + "VALUES(?,?,'재사용 시험 관리자','!authentication-disabled!','P','N',to_char(CURRENT_DATE,'YYYYMMDD'))", admin, admin);
        jdbc.update("INSERT INTO tb_authrt_info(authrt_cd,authrt_nm,authrt_crt_ymd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES(?,'재사용 시험',to_char(CURRENT_DATE,'YYYYMMDD'),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", adminGroup);
        jdbc.update("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES(?,'OPERATION','USER_CREATE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", adminGroup);
        jdbc.update("INSERT INTO tb_authrt_user_map(scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES(?,?,'USR03',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", admin, adminGroup);
        var principal = CustomUserDetails.builder().userId(admin).esntlId(admin).enabled(true)
                .permissions(List.of("USER_CREATE")).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @AfterEach
    void removeOnlyOwnFixtures() {
        SecurityContextHolder.clearContext();
        for (Long sn : deptTasks) jdbc.update("DELETE FROM tb_dept_task_info WHERE dept_task_sn = ?", sn);
        for (String code : codeCategories) jdbc.update("DELETE FROM tb_com_clsf_cd WHERE clsf_cd = ?", code);
        jdbc.update("DELETE FROM tb_authrt_user_map WHERE scrty_dcsn_trgt_id = ?", admin);
        jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd = ?", adminGroup);
        jdbc.update("DELETE FROM tb_authrt_info WHERE authrt_cd = ?", adminGroup);
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id = ?", admin);
        List<String> created = jdbc.queryForList("SELECT esntl_id FROM tb_user_info WHERE user_id = ?", String.class, loginId);
        for (String esntlId : created) {
            // 권한 변경 이력은 V2_132 트리거가 선언 없는 삭제를 막는다 — 시험 준비물 정리는 보존 정리 선언과 함께 지운다.
            AuditLedgerFixtures.delete(jdbc, "DELETE FROM tb_authrt_chg_hstry WHERE scrty_dcsn_trgt_id = ? OR chg_user_idntfr = ?", esntlId, esntlId);
            jdbc.update("DELETE FROM tb_authrt_user_map WHERE scrty_dcsn_trgt_id = ?", esntlId);
            jdbc.update("DELETE FROM tb_user_info WHERE esntl_id = ?", esntlId);
        }
    }

    @Test
    @DisplayName("기능이 등록한 컬럼은 모두 실제 스키마의 문자 컬럼이고, 판정 질의가 컬럼마다 실행된다")
    void everyContributedColumnExistsAndIsQueryable() {
        List<Reference> references = guard.references();
        assertThat(references).extracting(Reference::qualifiedName)
                .as("core 는 늘 남으므로 그 두 컬럼은 어느 구성에서나 등록돼 있다")
                .contains("tb_file_master.frst_rgtr_id", "tb_dept_task_info.frst_rgtr_id");
        for (Reference reference : references) {
            List<String> types = jdbc.queryForList("SELECT data_type FROM information_schema.columns"
                    + " WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?",
                    String.class, reference.table(), reference.column());
            assertThat(types).as("%s 가 스키마에 있다", reference.qualifiedName()).containsExactly("character varying");
        }
        // 등록한 컬럼마다 EXISTS 질의를 실제로 실행한다 — 이름 오타나 권한 문제는 여기서 예외가 된다.
        assertThat(guard.isStillReferenced(loginId)).isFalse();
    }

    @Test
    @DisplayName("지워진 계정의 부서 업무가 로그인 ID 를 들고 있으면 가입은 일반 중복으로 거부되고, 기록이 없어지면 통과한다")
    void signupRejectsLoginIdStillCarriedByRecordsUntilTheyAreGone() {
        long task = jdbc.queryForObject("INSERT INTO tb_dept_task_info(dept_task_nm, frst_rgtr_id, last_mdfr_id, crt_dt, mdfcn_dt)"
                + " VALUES ('지워진 계정이 등록한 업무', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING dept_task_sn",
                Long.class, loginId, loginId);
        deptTasks.add(task);

        assertThatThrownBy(() -> users.signup(signup()))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> {
                    assertThat(((BusinessException) error).getErrorCode()).isEqualTo(UserErrorCode.DUPLICATE_USER_ID);
                    assertThat(error.getMessage()).as("어느 기록이 남았는지 드러내지 않는다")
                            .isEqualTo(UserErrorCode.DUPLICATE_USER_ID.getMessage());
                });
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_user_info WHERE user_id = ?", Integer.class, loginId))
                .as("계정을 만들지 않았다").isZero();

        jdbc.update("DELETE FROM tb_dept_task_info WHERE dept_task_sn = ?", task);
        deptTasks.remove(Long.valueOf(task));

        users.signup(signup());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_user_info WHERE user_id = ?", Integer.class, loginId))
                .as("남은 기록이 없으면 같은 로그인 ID 를 다시 쓸 수 있다").isOne();
    }

    @Test
    @DisplayName("판정에 쓰지 않는 감사 컬럼(공통코드 분류의 등록자)에만 남은 로그인 ID 는 막지 않는다")
    void auditOnlyColumnsDoNotBlockReuse() {
        String code = "R" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        jdbc.update("INSERT INTO tb_com_clsf_cd(clsf_cd, clsf_cd_nm, use_yn, frst_rgtr_id, last_mdfr_id, crt_dt, mdfcn_dt)"
                + " VALUES (?, '감사 컬럼만', 'Y', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", code, loginId, loginId);
        codeCategories.add(code);

        users.signup(signup());

        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_user_info WHERE user_id = ?", Integer.class, loginId))
                .isOne();
    }

    private UserSignupRequest signup() {
        return UserSignupRequest.builder().userId(loginId).pswd("Reuse-test-4821!").userNm("재사용 시험").build();
    }
}
