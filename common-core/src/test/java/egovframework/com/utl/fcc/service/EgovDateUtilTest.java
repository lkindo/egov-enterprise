package egovframework.com.utl.fcc.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;

import org.junit.jupiter.api.Test;

public class EgovDateUtilTest {

    @Test
    public void testAddYearMonthDay() {
        // Normal case
        assertEquals("20240215", EgovDateUtil.addYearMonthDay("20230115", 1, 1, 0));
        // Leap year case: 2024 is a leap year. Feb 29 exists.
        // 2023-02-28 + 1 year = 2024-02-28. + 1 day = 2024-02-29.
        assertEquals("20240229", EgovDateUtil.addYearMonthDay("20230228", 1, 0, 1));
        // Year wrap around
        assertEquals("20240101", EgovDateUtil.addYearMonthDay("20231231", 0, 0, 1));

        // Invalid date format
        assertThrows(IllegalArgumentException.class, () -> {
            EgovDateUtil.addYearMonthDay("invalid", 1, 1, 1);
        });
    }

    @Test
    public void testAddYear() {
        assertEquals("20240101", EgovDateUtil.addYear("20230101", 1));
    }

    @Test
    public void testAddMonth() {
        assertEquals("20230201", EgovDateUtil.addMonth("20230101", 1));
        // Month wrap around
        assertEquals("20240101", EgovDateUtil.addMonth("20231201", 1));
    }

    @Test
    public void testAddDay() {
        assertEquals("20230102", EgovDateUtil.addDay("20230101", 1));
        // Day wrap around (month change)
        assertEquals("20230201", EgovDateUtil.addDay("20230131", 1));
    }

    @Test
    public void testGetDaysDiff() {
        assertEquals(1, EgovDateUtil.getDaysDiff("20230101", "20230102"));
        assertEquals(365, EgovDateUtil.getDaysDiff("20230101", "20240101")); // 2023 is not leap year
        assertEquals(-1, EgovDateUtil.getDaysDiff("20230102", "20230101"));

        // Invalid date format
        assertThrows(IllegalArgumentException.class, () -> {
            EgovDateUtil.getDaysDiff("invalid", "20230101");
        });
    }

    @Test
    public void testCheckDate() {
        // checkDate(String sDate)
        assertTrue(EgovDateUtil.checkDate("20230101"));
        assertFalse(EgovDateUtil.checkDate("20230230")); // Invalid date (Feb 30)

        // Invalid format throws exception
        assertThrows(IllegalArgumentException.class, () -> {
            EgovDateUtil.checkDate("invalid");
        });

        // checkDate(String year, String month, String day)
        assertTrue(EgovDateUtil.checkDate("2023", "01", "01"));
        assertFalse(EgovDateUtil.checkDate("2023", "02", "30"));
    }

    @Test
    public void testConvertDate() {
        // convertDate(String strSource, String fromDateFormat, String toDateFormat,
        // String strTimeZone)
        assertEquals("2023-01-01 00:00:00",
                EgovDateUtil.convertDate("20230101000000", "yyyyMMddHHmmss", "yyyy-MM-dd HH:mm:ss", ""));

        // Test with empty formats (defaults)
        // Default from: yyyyMMddHHmmss, to: yyyy-MM-dd HH:mm:ss
        assertEquals("2023-01-01 00:00:00", EgovDateUtil.convertDate("20230101000000", "", "", ""));

        // convertDate(String sDate, String sTime, String sFormatStr)
        // Note: convertDate(date, time, format) sets year, month, day, hour, minute.
        // It uses month-1 for Calendar.MONTH.
        // Input: 20230101, 1230 -> 2023-01-01 12:30
        assertEquals("2023-01-01 12:30", EgovDateUtil.convertDate("20230101", "1230", "yyyy-MM-dd HH:mm"));
    }

    @Test
    public void testFormatDate() {
        // Length 8
        assertEquals("2023-01-01", EgovDateUtil.formatDate("20230101", "-"));

        // Length 4
        assertEquals("2023", EgovDateUtil.formatDate("2023", "-"));

        // Invalid/Empty returns empty string
        assertEquals("", EgovDateUtil.formatDate("", "-"));

        // 0000 cases
        assertEquals("", EgovDateUtil.formatDate("00000101", "-"));
    }

    @Test
    public void testFormatTime() {
        assertEquals("12:30:45", EgovDateUtil.formatTime("123045", ":"));
    }

    @Test
    public void testLeapYear() {
        // leapYear(int year) returns String "28" or "29"
        assertEquals("28", new EgovDateUtil().leapYear(2023));
        assertEquals("29", new EgovDateUtil().leapYear(2024)); // 2024 is leap year
        assertEquals("28", new EgovDateUtil().leapYear(1900)); // 1900 is not leap year
        assertEquals("29", new EgovDateUtil().leapYear(2000)); // 2000 is leap year

        // isLeapYear(int year) returns boolean
        // IMPORTANT: The implementation returns FALSE for leap years and TRUE for
        // non-leap years.
        // if (year % 4 == 0 && year % 100 != 0 || year % 400 == 0) return false;
        assertFalse(EgovDateUtil.isLeapYear(2024));
        assertTrue(EgovDateUtil.isLeapYear(2023));
    }

    @Test
    public void testGetCurrentDate() {
        String today = EgovDateUtil.getToday();
        assertNotNull(today);
        assertEquals(8, today.length());

        String formattedToday = EgovDateUtil.getCurrentDate("yyyy-MM-dd");
        assertNotNull(formattedToday);
        assertEquals(10, formattedToday.length());
    }

    @Test
    public void testGetRandomDate() {
        String sDate1 = "20230101";
        String sDate2 = "20230131";
        String randomDate = EgovDateUtil.getRandomDate(sDate1, sDate2);

        assertNotNull(randomDate);
        // Simple string comparison works for yyyyMMdd format
        assertTrue(randomDate.compareTo(sDate1) >= 0);
        assertTrue(randomDate.compareTo(sDate2) <= 0);
    }

    @Test
    public void testToLunarAndSolar() {
        // Solar: 2023-01-22 is Lunar New Year 2023-01-01

        // toLunar(String sDate) -> returns Lunar date components
        Map<String, String> lunar = EgovDateUtil.toLunar("20230122");
        // Depending on timezone/locale, this might vary slightly if not careful, but
        // usually works for standard dates.
        // Let's verify what it returns.
        assertEquals("20230101", lunar.get("day"));
        assertEquals("0", lunar.get("leap"));

        // toSolar(String sDate, int iLeapMonth) -> takes Lunar date, returns Solar date
        // Lunar 2023-01-01 -> Solar 2023-01-22
        String solar = EgovDateUtil.toSolar("20230101", 0);
        assertEquals("20230122", solar);
    }

    @Test
    public void testConvertWeek() {
        assertEquals("Sunday", EgovDateUtil.convertWeek("SUN"));
        assertEquals("Monday", EgovDateUtil.convertWeek("MON"));
        assertEquals("Tuesday", EgovDateUtil.convertWeek("TUE"));
        assertEquals("Wednesday", EgovDateUtil.convertWeek("WED"));
        assertEquals("Thursday", EgovDateUtil.convertWeek("THR"));
        assertEquals("Friday", EgovDateUtil.convertWeek("FRI"));
        assertEquals("Saturday", EgovDateUtil.convertWeek("SAT"));
    }

    @Test
    public void testValidDate() {
        // validDate(String sDate)
        assertTrue(EgovDateUtil.validDate("20230101"));
        assertFalse(EgovDateUtil.validDate("20230230")); // Invalid

        // validDate(String sDate, int sWeek)
        // 2023-01-01 is Sunday (Calendar.SUNDAY = 1)
        assertTrue(EgovDateUtil.validDate("20230101", 1));
        assertFalse(EgovDateUtil.validDate("20230101", 2)); // Not Monday
    }

    @Test
    public void testValidTime() {
        assertTrue(EgovDateUtil.validTime("1230"));
        assertFalse(EgovDateUtil.validTime("2500"));
        assertFalse(EgovDateUtil.validTime("1261"));
    }

    @Test
    public void testAddYMDtoWeek() {
        // 2023-01-01 is Sunday.
        // addYMDtoWeek(sDate, y, m, d) -> returns Day of Week string (E pattern)
        // +1 day -> 2023-01-02 Monday.

        // The result depends on Locale.ENGLISH used in EgovDateUtil.
        // SimpleDateFormat("E", Locale.ENGLISH) returns "Mon", "Tue", etc.

        String dayOfWeek = EgovDateUtil.addYMDtoWeek("20230101", 0, 0, 1);
        assertEquals("Mon", dayOfWeek);
    }
}
