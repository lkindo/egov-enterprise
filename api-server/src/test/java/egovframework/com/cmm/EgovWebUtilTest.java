package egovframework.com.cmm;

import org.junit.jupiter.api.Test;
import java.io.File;
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
    public void testFilePathBlackList_Valid() {
        String basePath = "/tmp/upload/";
        String value = "file.txt";
        String expected = "/tmp/upload/file.txt";
        assertEquals(expected, EgovWebUtil.filePathBlackList(value, basePath));
    }

    @Test
    public void testFilePathBlackList_EmptyBasePath() {
        assertThrows(SecurityException.class, () -> {
            EgovWebUtil.filePathBlackList("file.txt", null);
        });
        assertThrows(SecurityException.class, () -> {
            EgovWebUtil.filePathBlackList("file.txt", "");
        });
    }

    @Test
    public void testFilePathBlackList_RootBasePath() {
        assertThrows(SecurityException.class, () -> {
            EgovWebUtil.filePathBlackList("file.txt", "/");
        });
        // Check File.separator if it's different from "/"
        if (!"/".equals(File.separator)) {
            assertThrows(SecurityException.class, () -> {
                EgovWebUtil.filePathBlackList("file.txt", File.separator);
            });
        }
    }

    @Test
    public void testFilePathBlackList_PathTraversal() {
        String basePath = "/tmp/upload/";

        // ".." should be removed
        String value = "../etc/passwd";
        // /tmp/upload/../etc/passwd -> /tmp/upload//etc/passwd
        String expected = "/tmp/upload//etc/passwd";
        assertEquals(expected, EgovWebUtil.filePathBlackList(value, basePath));

        // Test with multiple traversals
        value = "../../etc/passwd";
        // /tmp/upload/../../etc/passwd -> /tmp/upload///etc/passwd
        expected = "/tmp/upload///etc/passwd";
        assertEquals(expected, EgovWebUtil.filePathBlackList(value, basePath));
    }
}
