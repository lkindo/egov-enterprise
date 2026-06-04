package nuri.business.domain.user.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("User (사용자 엔티티) 테스트")
class UserTest {

    @Test
    @DisplayName("사용자 엔티티 빌더 확인")
    void testBuilder() {
        User user = User.builder()
                .userId("user01")
                .userNm("홍길동")
                .pswd("pwd123")
                .esntlId("ESNTL_01")
                .build();

        assertEquals("user01", user.getUserId());
        assertEquals("홍길동", user.getUserNm());
        assertEquals("EMP", user.getUserTypeCd());
        assertEquals("N", user.getLckYn());
        assertEquals(Role.USER, user.getRole());
        assertEquals("P", user.getUserSttsCd());
    }

    @Test
    @DisplayName("사용자 정보 업데이트 확인")
    void testUpdate() {
        User user = User.builder()
                .userId("user01")
                .userNm("홍길동")
                .pswd("pwd123")
                .esntlId("ESNTL_01")
                .build();

        user.update("김철수", "hint", "cnsr", "EMP001", "900101-1234567",
                "M", "19900101", "02", "1234", "5678", "02-123-4567",
                "서울", "강남", "12345", "02-111-2222", "010-1234-5678",
                "test@test.com", "대리", "GRP01", "ORG01", "PST01", Role.ADMIN, "crtfc123");

        assertEquals("김철수", user.getUserNm());
        assertEquals("hint", user.getPswdHint());
        assertEquals("cnsr", user.getPswdCrans());
        assertEquals("EMP001", user.getEmplNo());
        assertEquals("M", user.getGndrCd());
        assertEquals("서울", user.getHomeAddr());
        assertEquals(Role.ADMIN, user.getRole());
        assertEquals("crtfc123", user.getCertDnVl());
    }

    @Test
    @DisplayName("비밀번호 업데이트 확인")
    void testUpdatePassword() {
        User user = User.builder().userId("u").userNm("n").pswd("p").esntlId("e").build();
        user.updatePassword("newPwd");
        
        assertEquals("newPwd", user.getPswd());
        assertNotNull(user.getChgPswdLastDt());
    }

    @Test
    @DisplayName("계정 잠금/해제 확인")
    void testLockAndUnlock() {
        User user = User.builder().userId("u").userNm("n").pswd("p").esntlId("e").build();
        
        user.incrementLockCount();
        assertEquals(1, user.getLckCnt());
        
        user.incrementLockCount();
        assertEquals(2, user.getLckCnt());
        
        user.unlock();
        assertEquals("N", user.getLckYn());
        assertEquals(0, user.getLckCnt());
        assertNull(user.getLckLastPnttm());
    }

    @Test
    @DisplayName("권한 코드 설정/조회 확인")
    void testAuthorCode() {
        User user = User.builder().userId("u").userNm("n").pswd("p").esntlId("e").build();
        
        user.setRole(Role.fromAuthorCode("ROLE_ADMIN"));
        assertEquals(Role.ADMIN, user.getRole());
        
        user.setRole(Role.fromAuthorCode("INVALID_ROLE"));
        assertEquals(Role.USER, user.getRole());

        user.setRole(Role.fromAuthorCode(null));
        assertEquals(Role.USER, user.getRole());
    }

    @Test
    @DisplayName("상태 및 조직 업데이트 확인")
    void testStatusAndOgnzUpdate() {
        User user = User.builder().userId("u").userNm("n").pswd("p").esntlId("e").build();
        
        user.updateStatus("ACTIVE");
        assertEquals("ACTIVE", user.getUserSttsCd());
        
        user.updateOrgnztId("ORG123");
        assertEquals("ORG123", user.getOgnzId());
    }

    @Test
    @DisplayName("Legacy Aliases (getter/setter) 확인")
    void testLegacyAliases() {
        User user = User.builder().userId("u").userNm("n").pswd("p").esntlId("e").build();
        
        user.setUserTypeCd("TYPE1");
        assertEquals("TYPE1", user.getUserTypeCd());
        
        user.setPswd("pwd");
        assertEquals("pwd", user.getPswd());

        user.setPswdCrans("crans");
        assertEquals("crans", user.getPswdCrans());
        
        user.setChgPwdCnt(5);
        assertEquals(5, user.getChgPwdCnt());

        LocalDateTime now = LocalDateTime.now();
        user.setLckLastPnttm(now);
        assertEquals(now, user.getLckLastPnttm());

        user.setCertDnVl("subdn");
        assertEquals("subdn", user.getCertDnVl());

        user.setRrno("ihid");
        assertEquals("ihid", user.getRrno());

        user.setHomeAddr("addr1");
        assertEquals("addr1", user.getHomeAddr());

        user.setDaddr("addr2");
        assertEquals("addr2", user.getDaddr());

        user.setMiddleTelno("1234");
        assertEquals("1234", user.getMiddleTelno());

        user.setEndTelno("5678");
        assertEquals("5678", user.getEndTelno());

        user.setPstinstCd("instt");
        assertEquals("instt", user.getPstinstCd());

        user.setBizrNo("bizrno");
        assertEquals("bizrno", user.getBizrNo());

        user.setJurirNo("jurirno");
        assertEquals("jurirno", user.getJurirNo());

        user.setCmpnyNm("cxfc");
        assertEquals("cxfc", user.getCmpnyNm());

        user.setIndutyCd("induty");
        assertEquals("induty", user.getIndutyCd());

        user.setEntSeCd("entrprs");
        assertEquals("entrprs", user.getEntSeCd());

        user.setGndrCd("M");
        assertEquals("M", user.getGndrCd());

        user.setBrthYmd("1999");
        assertEquals("1999", user.getBrthYmd());

        user.setFaxNo("fx");
        assertEquals("fx", user.getFaxNo());
    }
}