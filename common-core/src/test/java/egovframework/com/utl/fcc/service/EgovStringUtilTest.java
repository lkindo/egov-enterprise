package egovframework.com.utl.fcc.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EgovStringUtilTest {

    @Test
    @DisplayName("문자열 자르기 테스트")
    void cutStringTest() {
        String source = "egovframe";
        assertThat(EgovStringUtil.cutString(source, "...", 4)).isEqualTo("egov...");
        assertThat(EgovStringUtil.cutString(source, 4)).isEqualTo("egov");
        assertThat(EgovStringUtil.cutString(source, 20)).isEqualTo("egovframe");
    }

    @Test
    @DisplayName("비어있는 문자열 체크 테스트")
    void isEmptyTest() {
        assertThat(EgovStringUtil.isEmpty(null)).isTrue();
        assertThat(EgovStringUtil.isEmpty("")).isTrue();
        assertThat(EgovStringUtil.isEmpty(" ")).isFalse();
        assertThat(EgovStringUtil.isEmpty("text")).isFalse();
    }

    @Test
    @DisplayName("특정 문자 제거 테스트")
    void removeCharTest() {
        assertThat(EgovStringUtil.removeCommaChar("1,234,567")).isEqualTo("1234567");
        assertThat(EgovStringUtil.removeMinusChar("2024-03-02")).isEqualTo("20240302");
    }

    @Test
    @DisplayName("문자열 치환 테스트")
    void replaceTest() {
        String source = "apple banana apple";
        assertThat(EgovStringUtil.replace(source, "apple", "orange")).isEqualTo("orange banana orange");
        assertThat(EgovStringUtil.replaceOnce(source, "apple", "orange")).isEqualTo("orange banana apple");
    }
}
