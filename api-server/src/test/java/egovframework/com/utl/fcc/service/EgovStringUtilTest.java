package egovframework.com.utl.fcc.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

public class EgovStringUtilTest {

    @Test
    public void testReplace_Normal() {
        assertEquals("cbc", EgovStringUtil.replace("aba", "a", "c"));
        assertEquals("bb", EgovStringUtil.replace("aaaa", "aa", "b"));
        assertEquals("abb", EgovStringUtil.replace("ab", "a", "ab"));
        assertEquals("source", EgovStringUtil.replace("source", "missing", "object"));
    }

    @Test
    public void testReplace_NullObject() {
        // Verify behavior when object (replacement) is null
        // Current implementation appends "null" because StringBuffer.append(null) appends "null".
        assertEquals("anullbnull", EgovStringUtil.replace("a_b_", "_", null));
    }

    @Test
    public void testReplace_NullSource() {
        assertThrows(NullPointerException.class, () -> {
            EgovStringUtil.replace(null, "a", "b");
        });
    }

    @Test
    public void testReplace_NullSubject() {
        assertThrows(NullPointerException.class, () -> {
            EgovStringUtil.replace("abc", null, "b");
        });
    }

    @Test
    public void benchmarkReplace() {
        String source = "The quick brown fox jumps over the lazy dog. ".repeat(100); // 4500 chars
        String subject = "the";
        String object = "THE";

        // Warmup
        for (int i = 0; i < 1000; i++) {
            EgovStringUtil.replace(source, subject, object);
        }

        long startTime = System.nanoTime();
        for (int i = 0; i < 10000; i++) {
            EgovStringUtil.replace(source, subject, object);
        }
        long endTime = System.nanoTime();

        System.out.println("Benchmark Replace time: " + (endTime - startTime) / 1_000_000.0 + " ms");
    }

    @Test
    public void testGetHtmlStrCnvr() {
        String input = "<script>alert('XSS');</script> & \" ' ";
        String expected = "&lt;script&gt;alert('XSS');&lt;/script&gt; &amp; &quot; ' ";
        // Note: The original implementation does NOT escape single quotes in getHtmlStrCnvr,
        // it only handles <, >, &, space(nbsp), apos, quot.
        // Wait, looking at getHtmlStrCnvr implementation:
        // replaces &lt; to <, &gt; to >, &amp; to &, &nbsp; to space, &apos; to ', &quot; to "
        // It converts HTML Entities TO Characters?
        // Let's re-read the code.

        /*
        public static String getHtmlStrCnvr(String srcString) {
            String tmpString = srcString;
            tmpString = tmpString.replaceAll("&lt;", "<");
            tmpString = tmpString.replaceAll("&gt;", ">");
            tmpString = tmpString.replaceAll("&amp;", "&");
            tmpString = tmpString.replaceAll("&nbsp;", " ");
            tmpString = tmpString.replaceAll("&apos;", "\'");
            tmpString = tmpString.replaceAll("&quot;", "\"");
            return tmpString;
        }
        */
        // YES! It converts Entities -> Characters (Unescaping).

        String inputEnt = "&lt;div&gt;Hello &amp; World&lt;/div&gt;";
        String expectedChar = "<div>Hello & World</div>";

        assertEquals(expectedChar, EgovStringUtil.getHtmlStrCnvr(inputEnt));
    }

    @Test
    public void benchmarkGetHtmlStrCnvr() {
        String input = "&lt;div&gt;Hello &amp; World&lt;/div&gt; ".repeat(100);

        // Warmup
        for (int i = 0; i < 1000; i++) {
            EgovStringUtil.getHtmlStrCnvr(input);
        }

        long startTime = System.nanoTime();
        for (int i = 0; i < 10000; i++) {
            EgovStringUtil.getHtmlStrCnvr(input);
        }
        long endTime = System.nanoTime();

        System.out.println("Benchmark GetHtmlStrCnvr time: " + (endTime - startTime) / 1_000_000.0 + " ms");
    }
}
