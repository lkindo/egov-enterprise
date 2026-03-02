package egovframework.com.cmm;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class EgovWebUtilTest {

    @Test
    @DisplayName("XSS 최소 필터링 테스트")
    void clearXSSMinimumTest() {
        String input = "<script>alert('xss')</script>";
        String output = EgovWebUtil.clearXSSMinimum(input);
        
        assertThat(output).contains("&lt;script&gt;");
        assertThat(output).contains("&#39;xss&#39;");
    }

    @Test
    @DisplayName("파일 경로 블랙리스트 필터링 테스트")
    void filePathBlackListTest() {
        String unsafePath = "../etc/passwd";
        String safePath = EgovWebUtil.filePathBlackList(unsafePath);
        
        // ".." 가 제거되었는지 확인
        assertThat(safePath).doesNotContain("..");
    }

    @Test
    @DisplayName("파일 경로 베이스 패스 결합 테스트")
    void filePathWithBasePathTest() {
        String input = "profile.png";
        String basePath = "/upload/";
        String result = EgovWebUtil.filePathBlackList(input, basePath);
        
        assertThat(result).contains("profile.png");
        assertThat(result).contains(basePath);
    }

    @Test
    @DisplayName("루트 경로 설정 시 예외 발생 테스트")
    void rootPathExceptionTest() {
        assertThrows(SecurityException.class, () -> {
            EgovWebUtil.filePathBlackList("test", "/");
        });
    }

    @Test
    @DisplayName("CRLF 제거 테스트")
    void removeCRLFTest() {
        String input = "line1\r\nline2\n";
        assertThat(EgovWebUtil.removeCRLF(input)).isEqualTo("line1line2");
    }
}
