package egovframework.com.cmm;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class EgovWebUtilTest {

    @Test
    public void testFilePathBlackList_RecursiveRemoval() {
        // Standard .. removal
        assertEquals("", EgovWebUtil.filePathBlackList(".."));
        assertEquals("abc", EgovWebUtil.filePathBlackList("abc"));

        // Single traversal
        assertEquals("/", EgovWebUtil.filePathBlackList("../"));

        // Multiple traversal
        assertEquals("//", EgovWebUtil.filePathBlackList("../../"));

        // Nested/Hidden traversal
        // "....//" -> ".." (if recursive) -> "" + "//" -> "//"
        assertEquals("//", EgovWebUtil.filePathBlackList("....//"));

        // Case where recursive ensures no .. remains
        // "..././" -> "././" (no change)
        assertEquals("././", EgovWebUtil.filePathBlackList("..././"));

        // Case: "x...y" -> "x.y"
        assertEquals("x.y", EgovWebUtil.filePathBlackList("x...y"));

        // Case: "x....y" -> "xy"
        assertEquals("xy", EgovWebUtil.filePathBlackList("x....y"));
    }

    @Test
    public void testFilePathBlackList_NullAndEmpty() {
        assertEquals("", EgovWebUtil.filePathBlackList(null));
        assertEquals("", EgovWebUtil.filePathBlackList(""));
        assertEquals("", EgovWebUtil.filePathBlackList("   "));
    }
}
