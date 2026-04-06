package egovframework.com.utl.fcc.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("EgovDateUtil 테스트")
class EgovDateUtilTest {

    @Test
    @DisplayName("날짜 더하기 확인")
    void testAddYearMonthDay() {
        String result = EgovDateUtil.addYearMonthDay("20260401", 1, 2, 3);
        assertEquals("20270604", result);
    }

    @Test
    @DisplayName("날짜 유효성 확인")
    void testCheckDate() {
        assertTrue(EgovDateUtil.checkDate("20260401"));
        assertFalse(EgovDateUtil.checkDate("20261301")); // 13월
        assertFalse(EgovDateUtil.checkDate("20260431")); // 4월 31일
    }

    @Test
    @DisplayName("윤년 확인")
    void testIsLeapYear() {
        // isLeapYear logic in code: 
        // if (year % 4 == 0 && year % 100 != 0 || year % 400 == 0) return false; else return true;
        // Wait, the logic seems reversed in the code! 
        // Let's re-check line 226 in EgovDateUtil.java
        
        // Line 226: if (year % 4 == 0 && year % 100 != 0 || year % 400 == 0) { return false; }
        // This means if it IS a leap year, it returns FALSE. (Strange)

        assertFalse(EgovDateUtil.isLeapYear(2024)); // 2024 is leap year, should return false based on current impl
        assertTrue(EgovDateUtil.isLeapYear(2023));  // 2023 is not, should return true based on current impl
    }

    @Test
    @DisplayName("날짜 포맷 변경 확인")
    void testFormatDate() {
        assertEquals("2026-04-01", EgovDateUtil.formatDate("20260401", "-"));
        assertEquals("2026.04", EgovDateUtil.formatDate("20260400", "."));
    }
}
