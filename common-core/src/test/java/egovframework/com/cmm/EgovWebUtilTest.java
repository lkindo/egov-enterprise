package egovframework.com.cmm;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class EgovWebUtilTest {

    @Test
    @DisplayName("XSS 최소 필터링 확인")
    void clearXSSMinimum() {
        assertThat(EgovWebUtil.clearXSSMinimum(null)).isEqualTo("");
        assertThat(EgovWebUtil.clearXSSMinimum("")).isEqualTo("");
        assertThat(EgovWebUtil.clearXSSMinimum("<script>alert('XSS')</script>"))
                .isEqualTo("&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;");
        assertThat(EgovWebUtil.clearXSSMinimum("test.do%2F")).isEqualTo("test&#46;do&#47;");
    }

    @Test
    @DisplayName("XSS 최대 필터링 확인")
    void clearXSSMaximum() {
        // clearXSSMinimum replaces . with &#46; so ../ becomes &#46;&#46;/
        // Then clearXSSMaximum replaces %00 and %
        assertThat(EgovWebUtil.clearXSSMaximum("../test.do%00%"))
                .isEqualTo("&#46;&#46;/test&#46;do&#37;");
    }

    @Test
    @DisplayName("파일 경로 블랙리스트 필터링 확인")
    void filePathBlackList() {
        assertThat(EgovWebUtil.filePathBlackList(null)).isEqualTo("");
        // ../../../etc/passwd -> .. removed -> ///etc/passwd
        assertThat(EgovWebUtil.filePathBlackList("../../../etc/passwd")).isEqualTo("///etc/passwd");
        assertThat(EgovWebUtil.filePathBlackList("..\\..\\..\\windows\\system32")).isEqualTo("\\\\\\windows\\system32");
    }

    @Test
    @DisplayName("Base Path 포함 파일 경로 필터링 확인")
    void filePathBlackList_WithBasePath() {
        assertThrows(SecurityException.class, () -> EgovWebUtil.filePathBlackList("test.txt", null));
        assertThrows(SecurityException.class, () -> EgovWebUtil.filePathBlackList("test.txt", "/"));

        // /base + /subdir/../file.txt -> /base/subdir/../file.txt -> /base/subdir//file.txt
        assertThat(EgovWebUtil.filePathBlackList("/subdir/../file.txt", "/base"))
                .isEqualTo("/base/subdir//file.txt");
    }

    @Test
    @DisplayName("파일 경로 전체 치환 확인")
    void filePathReplaceAll() {
        assertThat(EgovWebUtil.filePathReplaceAll(null)).isEqualTo("");
        assertThat(EgovWebUtil.filePathReplaceAll("a/b\\c..d&e")).isEqualTo("abcde");
    }

    @Test
    @DisplayName("CRLF 제거 확인")
    void removeCRLF() {
        assertThat(EgovWebUtil.removeCRLF("line1\r\nline2")).isEqualTo("line1line2");
    }
}
