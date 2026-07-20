package nuri.business.domain.user.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
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
    @DisplayName("lock() 은 잠금 시각(lckLastPnttm)을 함께 기록한다 — 자동 해제의 기준")
    void testLockRecordsTimestamp() {
        User user = User.builder().userId("u").userNm("n").pswd("p").esntlId("e").build();
        assertFalse(user.isLocked());

        LocalDateTime before = LocalDateTime.now();
        user.lock();

        assertTrue(user.isLocked());
        assertEquals("Y", user.getLckYn());
        // (뮤턴트: lock() 에서 lckLastPnttm 대입을 지우면 null 이 되어 이 어서션이 킬)
        assertNotNull(user.getLckLastPnttm());
        assertFalse(user.getLckLastPnttm().isBefore(before));
    }

    @Test
    @DisplayName("잠금 만료 판정 — 기간 내 미만료, 경과 시 만료")
    void testHasLockExpired() {
        User user = User.builder().userId("u").userNm("n").pswd("p").esntlId("e")
                .lckYn("Y").lckCnt(5).lckLastPnttm(LocalDateTime.now().minusMinutes(5))
                .build();

        // 5분 전 잠금 → 15분 정책에서는 아직 잠금 유지
        assertFalse(user.hasLockExpired(Duration.ofMinutes(15)));
        // 5분 정책이라면 경계값(정확히 경과)은 만료로 본다
        assertTrue(user.hasLockExpired(Duration.ofMinutes(5)));
        // 1분 정책이라면 진작 만료
        assertTrue(user.hasLockExpired(Duration.ofMinutes(1)));
    }

    @Test
    @DisplayName("[결정] lckLastPnttm 이 null 인 레거시 잠금은 '만료'로 간주 — 영구잠금 방치 금지")
    void testLegacyLockWithoutTimestampIsExpired() {
        User user = User.builder().userId("u").userNm("n").pswd("p").esntlId("e")
                .lckYn("Y").lckCnt(9).lckLastPnttm(null)
                .build();

        assertTrue(user.isLocked());
        // 시각이 없으면 해제 기준이 없다 → 만료로 처리해 사용자가 스스로 복구할 수 있게 한다.
        // (인증 우회가 아니다: 해제되어도 비밀번호 검증은 그대로 수행된다)
        assertTrue(user.hasLockExpired(Duration.ofMinutes(15)));
    }

    @Test
    @DisplayName("권한 코드 설정/조회 확인")
    void testAuthorCode() {
        User user = User.builder().userId("u").userNm("n").pswd("p").esntlId("e").build();
        
        user.changeRole(Role.fromAuthorCode("ROLE_ADMIN"));
        assertEquals(Role.ADMIN, user.getRole());
        
        user.changeRole(Role.fromAuthorCode("INVALID_ROLE"));
        assertEquals(Role.USER, user.getRole());

        user.changeRole(Role.fromAuthorCode(null));
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

}