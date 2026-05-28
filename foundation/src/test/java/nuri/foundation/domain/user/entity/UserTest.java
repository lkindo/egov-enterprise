package nuri.foundation.domain.user.entity;

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
        assertEquals("hint", user.getPasswordHint());
        assertEquals("cnsr", user.getPasswordCnsr());
        assertEquals("EMP001", user.getEmplNo());
        assertEquals("M", user.getGndrCd());
        assertEquals("서울", user.getBaseAddr());
        assertEquals(Role.ADMIN, user.getRole());
        assertEquals("crtfc123", user.getCrtfcDnValue());
    }

    @Test
    @DisplayName("비밀번호 업데이트 확인")
    void testUpdatePassword() {
        User user = User.builder().userId("u").userNm("n").pswd("p").esntlId("e").build();
        user.updatePassword("newPwd");
        
        assertEquals("newPwd", user.getPassword());
        assertNotNull(user.getPasswordUpdateDate());
    }

    @Test
    @DisplayName("계정 잠금/해제 확인")
    void testLockAndUnlock() {
        User user = User.builder().userId("u").userNm("n").pswd("p").esntlId("e").build();
        
        user.incrementLockCount();
        assertEquals(1, user.getLockCount());
        
        user.incrementLockCount();
        assertEquals(2, user.getLockCount());
        
        user.unlock();
        assertEquals("N", user.getLockAt());
        assertEquals(0, user.getLockCount());
        assertNull(user.getLockLastDate());
    }

    @Test
    @DisplayName("권한 코드 설정/조회 확인")
    void testAuthorCode() {
        User user = User.builder().userId("u").userNm("n").pswd("p").esntlId("e").build();
        
        user.setAuthorCode("ROLE_ADMIN");
        assertEquals("ADMIN", user.getAuthorCode());
        assertEquals(Role.ADMIN, user.getRole());
        
        user.setAuthorCode("INVALID_ROLE");
        assertEquals("USER", user.getAuthorCode());
        assertEquals(Role.USER, user.getRole());

        user.setAuthorCode(null);
        // null인 경우 기존 권한 유지(코드상)
        assertEquals("USER", user.getAuthorCode());
    }

    @Test
    @DisplayName("상태 및 조직 업데이트 확인")
    void testStatusAndOrgnztUpdate() {
        User user = User.builder().userId("u").userNm("n").pswd("p").esntlId("e").build();
        
        user.updateStatus("ACTIVE");
        assertEquals("ACTIVE", user.getStatusCode());
        
        user.updateOrgnztId("ORG123");
        assertEquals("ORG123", user.getOrgnztId());
    }

    @Test
    @DisplayName("Legacy Aliases (getter/setter) 확인")
    void testLegacyAliases() {
        User user = User.builder().userId("u").userNm("n").pswd("p").esntlId("e").build();
        
        user.setUserType("TYPE1");
        assertEquals("TYPE1", user.getUserType());
        
        user.setPassword("pwd");
        assertEquals("pwd", user.getPassword());

        user.setPswdCrans("crans");
        assertEquals("crans", user.getPswdCrans());
        
        user.setChangePasswordCount(5);
        assertEquals(5, user.getChangePasswordCount());

        LocalDateTime now = LocalDateTime.now();
        user.setLockLastDate(now);
        assertEquals(now, user.getLockLastDate());

        user.setSubDn("subdn");
        assertEquals("subdn", user.getSubDn());

        user.setIhidnum("ihid");
        assertEquals("ihid", user.getIhidnum());

        user.setHomeadres("addr1");
        assertEquals("addr1", user.getHomeadres());

        user.setDetailAdres("addr2");
        assertEquals("addr2", user.getDetailAdres());

        user.setHomeAddr("addr1");
        assertEquals("addr1", user.getHomeAddr());

        user.setDaddr("addr2");
        assertEquals("addr2", user.getDaddr());

        user.setHomemiddleTelno("1234");
        assertEquals("1234", user.getHomemiddleTelno());

        user.setHomeendTelno("5678");
        assertEquals("5678", user.getHomeendTelno());

        user.setInsttCode("instt");
        assertEquals("instt", user.getInsttCode());

        user.setBizrno("bizrno");
        assertEquals("bizrno", user.getBizrno());

        user.setJurirno("jurirno");
        assertEquals("jurirno", user.getJurirno());

        user.setCxfc("cxfc");
        assertEquals("cxfc", user.getCxfc());

        user.setIndutyCode("induty");
        assertEquals("induty", user.getIndutyCode());

        user.setEntrprsSeCode("entrprs");
        assertEquals("entrprs", user.getEntrprsSeCode());

        user.setSexdstnCode("M");
        assertEquals("M", user.getSexdstnCode());

        user.setBrth("1999");
        assertEquals("1999", user.getBrth());

        user.setFxnum("fx");
        assertEquals("fx", user.getFxnum());
    }
}