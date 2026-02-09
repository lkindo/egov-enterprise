package egovframework.com.cmm;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class EgovWebUtilTest {

    @Test
    public void testIsIPAddress_Correctness() {
        assertTrue(EgovWebUtil.isIPAddress("127.0.0.1"), "127.0.0.1 should be valid");
        assertTrue(EgovWebUtil.isIPAddress("192.168.0.1"), "192.168.0.1 should be valid");
        assertTrue(EgovWebUtil.isIPAddress("0.0.0.0"), "0.0.0.0 should be valid");
        assertTrue(EgovWebUtil.isIPAddress("255.255.255.255"), "255.255.255.255 should be valid");

        // The current regex is simplistic (\d{1,3}), so it allows 999. But for the purpose of this task
        // (performance optimization), I should ensure I don't break existing behavior, even if the regex is imperfect.
        // The current regex is: \\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}
        // This accepts 999.999.999.999 which is technically not a valid IP, but I must preserve behavior.
        assertTrue(EgovWebUtil.isIPAddress("999.999.999.999"), "Current implementation accepts numbers > 255");

        assertFalse(EgovWebUtil.isIPAddress("invalid"), "Text should be invalid");
        assertFalse(EgovWebUtil.isIPAddress("123.123.123"), "Incomplete IP should be invalid");
        assertFalse(EgovWebUtil.isIPAddress("1.2.3.4.5"), "Too long IP should be invalid");
        assertFalse(EgovWebUtil.isIPAddress(""), "Empty string should be invalid");
    }

    @Test
    public void testIsIPAddress_Benchmark() {
        int iterations = 100000;
        String ip = "192.168.0.1";

        // Warmup
        for (int i = 0; i < 1000; i++) {
            EgovWebUtil.isIPAddress(ip);
        }

        long startTime = System.nanoTime();
        for (int i = 0; i < iterations; i++) {
            EgovWebUtil.isIPAddress(ip);
        }
        long endTime = System.nanoTime();

        long duration = endTime - startTime;
        System.out.println("Benchmark result for " + iterations + " iterations: " + duration + " ns");
        System.out.println("Average time per call: " + (duration / iterations) + " ns");
    }

    @Test
    public void testClearXSSMinimum() {
        // Test null
        assertEquals("", EgovWebUtil.clearXSSMinimum(null), "Null should return empty string");

        // Test empty
        assertEquals("", EgovWebUtil.clearXSSMinimum(""), "Empty string should return empty string");

        // Test whitespace
        assertEquals("", EgovWebUtil.clearXSSMinimum("   "), "Whitespace string should return empty string");

        // Test normal string
        assertEquals("normalString", EgovWebUtil.clearXSSMinimum("normalString"), "Normal string should be unchanged");

        // Test individual replacements
        assertEquals("&amp;", EgovWebUtil.clearXSSMinimum("&"), "& should be replaced with &amp;");
        assertEquals("&lt;", EgovWebUtil.clearXSSMinimum("<"), "< should be replaced with &lt;");
        assertEquals("&gt;", EgovWebUtil.clearXSSMinimum(">"), "> should be replaced with &gt;");
        assertEquals("&#34;", EgovWebUtil.clearXSSMinimum("\""), "\" should be replaced with &#34;");
        assertEquals("&#39;", EgovWebUtil.clearXSSMinimum("'"), "' should be replaced with &#39;");
        assertEquals("&#46;", EgovWebUtil.clearXSSMinimum("."), ". should be replaced with &#46;");
        assertEquals("&#46;", EgovWebUtil.clearXSSMinimum("%2E"), "%2E should be replaced with &#46;");
        assertEquals("&#47;", EgovWebUtil.clearXSSMinimum("%2F"), "%2F should be replaced with &#47;");

        // Test mixed string
        String input = "& < > \" ' . %2E %2F";
        String expected = "&amp; &lt; &gt; &#34; &#39; &#46; &#46; &#47;";
        assertEquals(expected, EgovWebUtil.clearXSSMinimum(input), "Mixed string should be correctly replaced");

        // Test multiple occurrences
        assertEquals("&amp;&amp;", EgovWebUtil.clearXSSMinimum("&&"), "Multiple & should be replaced");
    }
}
