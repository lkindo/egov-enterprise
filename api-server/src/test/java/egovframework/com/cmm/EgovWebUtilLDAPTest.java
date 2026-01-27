package egovframework.com.cmm;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class EgovWebUtilLDAPTest {

    @Test
    public void testRemoveLDAPInjectionRisk() {
        // Existing behavior (should pass already)
        assertEquals("ab", EgovWebUtil.removeLDAPInjectionRisk("a*b"), "* should be removed");
        assertEquals("ab", EgovWebUtil.removeLDAPInjectionRisk("a&b"), "& should be removed");
        assertEquals("ab", EgovWebUtil.removeLDAPInjectionRisk("a//b"), "// should be removed");

        // Buggy behavior (currently fails)
        assertEquals("ab", EgovWebUtil.removeLDAPInjectionRisk("a|b"), "| should be removed");

        // New requirements (currently fails)
        assertEquals("ab", EgovWebUtil.removeLDAPInjectionRisk("a(b"), "( should be removed");
        assertEquals("ab", EgovWebUtil.removeLDAPInjectionRisk("a)b"), ") should be removed");
        assertEquals("ab", EgovWebUtil.removeLDAPInjectionRisk("a\\b"), "\\ should be removed");
        assertEquals("ab", EgovWebUtil.removeLDAPInjectionRisk("a%b"), "% should be removed");

        // Complex case
        String input = "admin)(|(uid=*";
        String expected = "adminuid=";
        assertEquals(expected, EgovWebUtil.removeLDAPInjectionRisk(input), "Complex injection string should be sanitized");
    }
}
