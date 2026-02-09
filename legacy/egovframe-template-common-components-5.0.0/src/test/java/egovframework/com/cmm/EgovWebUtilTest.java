package egovframework.com.cmm;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

/**
 * Unit tests for EgovWebUtil, specifically focusing on LDAP Injection prevention.
 */
public class EgovWebUtilTest {

    @Test
    public void testRemoveLDAPInjectionRisk() {
        // Test case 1: Wildcard '*' removal
        String input1 = "user*name";
        String expected1 = "username";
        assertEquals("* should be removed", expected1, EgovWebUtil.removeLDAPInjectionRisk(input1));

        // Test case 2: Ampersand '&' removal
        String input2 = "user&name";
        String expected2 = "username";
        assertEquals("& should be removed", expected2, EgovWebUtil.removeLDAPInjectionRisk(input2));

        // Test case 3: Pipe '|' removal
        String input3 = "user|name";
        String expectedResult3 = "username";
        assertEquals("| should be removed", expectedResult3, EgovWebUtil.removeLDAPInjectionRisk(input3));

        // Test case 4: Double Slash '//' removal
        String input4 = "user//name";
        String expected4 = "username";
        assertEquals("// should be removed", expected4, EgovWebUtil.removeLDAPInjectionRisk(input4));

        // Test case 5: Percent '%' removal (New requirement)
        String input5 = "user%name";
        String expected5 = "username";
        assertEquals("% should be removed", expected5, EgovWebUtil.removeLDAPInjectionRisk(input5));

        // Test case 6: Backslash '\' removal (New requirement)
        String input6 = "user\\name";
        String expected6 = "username";
        assertEquals("\\ should be removed", expected6, EgovWebUtil.removeLDAPInjectionRisk(input6));

        // Test case 7: Open Parenthesis '(' removal (New requirement)
        String input7 = "user(name";
        String expected7 = "username";
        assertEquals("( should be removed", expected7, EgovWebUtil.removeLDAPInjectionRisk(input7));

        // Test case 8: Close Parenthesis ')' removal (New requirement)
        String input8 = "user)name";
        String expected8 = "username";
        assertEquals(") should be removed", expected8, EgovWebUtil.removeLDAPInjectionRisk(input8));

        // Test case 9: Null or empty
        assertEquals("", EgovWebUtil.removeLDAPInjectionRisk(null));
        assertEquals("", EgovWebUtil.removeLDAPInjectionRisk(""));
    }
}
