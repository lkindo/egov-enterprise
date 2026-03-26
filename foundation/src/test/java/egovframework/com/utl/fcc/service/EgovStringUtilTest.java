package egovframework.com.utl.fcc.service;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

public class EgovStringUtilTest {

    @Test
    public void testCutString() {
        assertEquals("abc...", EgovStringUtil.cutString("abcdefg", "...", 3));
        assertEquals("abcdefg", EgovStringUtil.cutString("abcdefg", "...", 10));
        assertNull(EgovStringUtil.cutString(null, "...", 3));

        assertEquals("abc", EgovStringUtil.cutString("abcdefg", 3));
        assertEquals("abcdefg", EgovStringUtil.cutString("abcdefg", 10));
    }

    @Test
    public void testIsEmpty() {
        assertTrue(EgovStringUtil.isEmpty(null));
        assertTrue(EgovStringUtil.isEmpty(""));
        assertFalse(EgovStringUtil.isEmpty(" "));
        assertFalse(EgovStringUtil.isEmpty("a"));
    }

    @Test
    public void testRemove() {
        assertEquals("abc", EgovStringUtil.remove("a,b,c", ','));
        assertEquals("123", EgovStringUtil.removeCommaChar("1,2,3"));
        assertEquals("20240101", EgovStringUtil.removeMinusChar("2024-01-01"));
        assertNull(EgovStringUtil.remove(null, ','));
    }

    @Test
    public void testReplace() {
        assertEquals("a_b_c", EgovStringUtil.replace("a-b-c", "-", "_"));
        assertEquals("a_b-c", EgovStringUtil.replaceOnce("a-b-c", "-", "_"));
        assertEquals("a_b_c", EgovStringUtil.replaceChar("a-b.c", "-.", "_"));
        assertNull(EgovStringUtil.replaceChar(null, "-", "_"));
    }

    @Test
    public void testDecode() {
        assertEquals("target", EgovStringUtil.decode("src", "src", "target", "default"));
        assertEquals("default", EgovStringUtil.decode("src", "other", "target", "default"));
        assertEquals("target", EgovStringUtil.decode("src", "src", "target"));
    }

    @Test
    public void testNullConvert() {
        assertEquals("", EgovStringUtil.isNullToString(null));
        assertEquals("abc", EgovStringUtil.isNullToString(" abc "));
        
        assertEquals("", EgovStringUtil.nullConvert((String)null));
        assertEquals("", EgovStringUtil.nullConvert("null"));
        assertEquals("abc", EgovStringUtil.nullConvert(" abc "));
        
        assertEquals("123.45", EgovStringUtil.nullConvert(new java.math.BigDecimal("123.45")));
    }

    @Test
    public void testZeroConvert() {
        assertEquals(0, EgovStringUtil.zeroConvert((String)null));
        assertEquals(0, EgovStringUtil.zeroConvert("null"));
        assertEquals(123, EgovStringUtil.zeroConvert(" 123 "));
    }

    @Test
    public void testRemoveWhitespace() {
        assertEquals("abc", EgovStringUtil.removeWhitespace(" a b c "));
        assertNull(EgovStringUtil.removeWhitespace(null));
    }

    @Test
    public void testCheckHtmlView() {
        String input = "<script>alert(\"hi\");</script>\n ";
        String expected = "&lt;script&gt;alert(&quot;hi&quot;);&lt;/script&gt;<br>&nbsp;";
        assertEquals(expected, EgovStringUtil.checkHtmlView(input));
    }

    @Test
    public void testSplit() {
        String[] result = EgovStringUtil.split("a,b,c", ",");
        assertArrayEquals(new String[]{"a", "b", "c"}, result);
        
        String[] resultWithLength = EgovStringUtil.split("a,b", ",", 3);
        assertArrayEquals(new String[]{"a", "b", ""}, resultWithLength);
    }

    @Test
    public void testCaseConvert() {
        assertEquals("abc", EgovStringUtil.lowerCase("ABC"));
        assertEquals("ABC", EgovStringUtil.upperCase("abc"));
        assertNull(EgovStringUtil.lowerCase(null));
        assertNull(EgovStringUtil.upperCase(null));
    }

    @Test
    public void testStrip() {
        assertEquals("abc", EgovStringUtil.stripStart("  abc", null));
        assertEquals("abc", EgovStringUtil.stripEnd("abc  ", null));
        assertEquals("abc", EgovStringUtil.strip("  abc  ", null));
        
        assertEquals("bc", EgovStringUtil.stripStart("abc", "a"));
        assertEquals("ab", EgovStringUtil.stripEnd("abc", "c"));
        assertEquals("b", EgovStringUtil.strip("abc", "ac"));
    }
}
