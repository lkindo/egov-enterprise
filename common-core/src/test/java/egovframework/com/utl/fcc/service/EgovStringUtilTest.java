package egovframework.com.utl.fcc.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("EgovStringUtil 단위 테스트")
class EgovStringUtilTest {

    @Test
    @DisplayName("isEmpty 테스트")
    void isEmptyTest() {
        assertThat(EgovStringUtil.isEmpty(null)).isTrue();
        assertThat(EgovStringUtil.isEmpty("")).isTrue();
        assertThat(EgovStringUtil.isEmpty("  ")).isFalse();
        assertThat(EgovStringUtil.isEmpty("text")).isFalse();
    }

    @Test
    @DisplayName("cutString 테스트")
    void cutStringTest() {
        assertThat(EgovStringUtil.cutString("1234567890", "...", 5)).isEqualTo("12345...");
        assertThat(EgovStringUtil.cutString("123", "...", 5)).isEqualTo("123");
        assertThat(EgovStringUtil.cutString(null, "...", 5)).isNull();

        assertThat(EgovStringUtil.cutString("1234567890", 5)).isEqualTo("12345");
        assertThat(EgovStringUtil.cutString("123", 5)).isEqualTo("123");
        assertThat(EgovStringUtil.cutString(null, 5)).isNull();
    }

    @Test
    @DisplayName("remove 테스트")
    void removeTest() {
        assertThat(EgovStringUtil.remove("abc,def,ghi", ',')).isEqualTo("abcdefghi");
        assertThat(EgovStringUtil.remove("abcdef", 'z')).isEqualTo("abcdef");
        assertThat(EgovStringUtil.remove(null, ',')).isNull();
        assertThat(EgovStringUtil.remove("", ',')).isEqualTo("");
    }

    @Test
    @DisplayName("removeCommaChar/removeMinusChar 테스트")
    void removeSpecialCharTest() {
        assertThat(EgovStringUtil.removeCommaChar("1,000,000")).isEqualTo("1000000");
        assertThat(EgovStringUtil.removeMinusChar("2024-03-13")).isEqualTo("20240313");
    }

    @Test
    @DisplayName("replace 테스트")
    void replaceTest() {
        assertThat(EgovStringUtil.replace("apple apple", "p", "b")).isEqualTo("abble abble");
        assertThat(EgovStringUtil.replace("apple", "z", "b")).isEqualTo("apple");
    }

    @Test
    @DisplayName("replaceOnce 테스트")
    void replaceOnceTest() {
        assertThat(EgovStringUtil.replaceOnce("apple apple", "p", "b")).isEqualTo("abple apple");
        assertThat(EgovStringUtil.replaceOnce("apple", "z", "b")).isEqualTo("apple");
    }

    @Test
    @DisplayName("replaceChar 테스트")
    void replaceCharTest() {
        assertThat(EgovStringUtil.replaceChar("abcde", "ac", "z")).isEqualTo("zbzde");
        assertThat(EgovStringUtil.replaceChar("abcabc", "a", "z")).isEqualTo("zbczbc");
        assertThat(EgovStringUtil.replaceChar("abcde", "xyz", "z")).isEqualTo("abcde");
        assertThat(EgovStringUtil.replaceChar(null, "a", "z")).isNull();
    }

    @Test
    @DisplayName("indexOf 테스트")
    void indexOfTest() {
        assertThat(EgovStringUtil.indexOf("apple", "p")).isEqualTo(1);
        assertThat(EgovStringUtil.indexOf(null, "p")).isEqualTo(-1);
        assertThat(EgovStringUtil.indexOf("apple", null)).isEqualTo(-1);
    }

    @Test
    @DisplayName("decode 테스트")
    void decodeTest() {
        assertThat(EgovStringUtil.decode("A", "A", "True", "False")).isEqualTo("True");
        assertThat(EgovStringUtil.decode("A", "B", "True", "False")).isEqualTo("False");
        assertThat(EgovStringUtil.decode(null, null, "True", "False")).isEqualTo("True");
        assertThat(EgovStringUtil.decode(null, "A", "True", "False")).isEqualTo("False");

        assertThat(EgovStringUtil.decode("A", "A", "True")).isEqualTo("True");
        assertThat(EgovStringUtil.decode("A", "B", "True")).isEqualTo("A");
    }

    @Test
    @DisplayName("isNullToString 테스트")
    void isNullToStringTest() {
        assertThat(EgovStringUtil.isNullToString("  text  ")).isEqualTo("text");
        assertThat(EgovStringUtil.isNullToString(null)).isEqualTo("");
    }

    @Test
    @DisplayName("nullConvert 테스트")
    void nullConvertTest() {
        assertThat(EgovStringUtil.nullConvert((Object)null)).isEqualTo("");
        assertThat(EgovStringUtil.nullConvert((Object)"null")).isEqualTo("");
        assertThat(EgovStringUtil.nullConvert((Object)new BigDecimal("100"))).isEqualTo("100");
        assertThat(EgovStringUtil.nullConvert((Object)"  abc  ")).isEqualTo("abc");

        assertThat(EgovStringUtil.nullConvert((String)null)).isEqualTo("");
        assertThat(EgovStringUtil.nullConvert("null")).isEqualTo("");
        assertThat(EgovStringUtil.nullConvert("")).isEqualTo("");
        assertThat(EgovStringUtil.nullConvert(" ")).isEqualTo("");
        assertThat(EgovStringUtil.nullConvert(" abc ")).isEqualTo("abc");
    }

    @Test
    @DisplayName("zeroConvert 테스트")
    void zeroConvertTest() {
        assertThat(EgovStringUtil.zeroConvert((Object)null)).isEqualTo(0);
        assertThat(EgovStringUtil.zeroConvert((Object)"null")).isEqualTo(0);
        assertThat(EgovStringUtil.zeroConvert((Object)" 123 ")).isEqualTo(123);

        assertThat(EgovStringUtil.zeroConvert((String)null)).isEqualTo(0);
        assertThat(EgovStringUtil.zeroConvert("null")).isEqualTo(0);
        assertThat(EgovStringUtil.zeroConvert("")).isEqualTo(0);
        assertThat(EgovStringUtil.zeroConvert(" ")).isEqualTo(0);
        assertThat(EgovStringUtil.zeroConvert(" 456 ")).isEqualTo(456);
    }

    @Test
    @DisplayName("removeWhitespace 테스트")
    void removeWhitespaceTest() {
        assertThat(EgovStringUtil.removeWhitespace(" a b\tc\n")).isEqualTo("abc");
        assertThat(EgovStringUtil.removeWhitespace("abc")).isEqualTo("abc");
        assertThat(EgovStringUtil.removeWhitespace(null)).isNull();
        assertThat(EgovStringUtil.removeWhitespace("")).isEqualTo("");
    }

    @Test
    @DisplayName("checkHtmlView 테스트")
    void checkHtmlViewTest() {
        String input = "<script>alert(\"xss\");</script>\nNext Line";
        String expected = "&lt;script&gt;alert(&quot;xss&quot;);&lt;/script&gt;<br>Next&nbsp;Line";
        assertThat(EgovStringUtil.checkHtmlView(input)).isEqualTo(expected);
    }

    @Test
    @DisplayName("split 테스트")
    void splitTest() {
        String[] result = EgovStringUtil.split("apple,banana,cherry", ",");
        assertThat(result).containsExactly("apple", "banana", "cherry");

        String[] result2 = EgovStringUtil.split("apple,banana,cherry", ",", 2);
        assertThat(result2).containsExactly("apple", "banana,cherry");

        String[] result3 = EgovStringUtil.split("apple,banana", ",", 5);
        assertThat(result3).containsExactly("apple", "banana", "", "", "");
    }

    @Test
    @DisplayName("upperCase/lowerCase 테스트")
    void caseTest() {
        assertThat(EgovStringUtil.upperCase("abc")).isEqualTo("ABC");
        assertThat(EgovStringUtil.lowerCase("ABC")).isEqualTo("abc");
        assertThat(EgovStringUtil.upperCase(null)).isNull();
        assertThat(EgovStringUtil.lowerCase(null)).isNull();
    }

    @Test
    @DisplayName("stripStart/stripEnd/strip 테스트")
    void stripTest() {
        assertThat(EgovStringUtil.stripStart("  abc  ", null)).isEqualTo("abc  ");
        assertThat(EgovStringUtil.stripStart("xyabcx", "xy")).isEqualTo("abcx");
        assertThat(EgovStringUtil.stripStart(null, "x")).isNull();
        assertThat(EgovStringUtil.stripStart("", "x")).isEqualTo("");
        assertThat(EgovStringUtil.stripStart("abc", "")).isEqualTo("abc");

        assertThat(EgovStringUtil.stripEnd("  abc  ", null)).isEqualTo("  abc");
        assertThat(EgovStringUtil.stripEnd("abcxyx", "xy")).isEqualTo("abc");
        assertThat(EgovStringUtil.stripEnd(null, "x")).isNull();
        assertThat(EgovStringUtil.stripEnd("", "x")).isEqualTo("");
        assertThat(EgovStringUtil.stripEnd("abc", "")).isEqualTo("abc");

        assertThat(EgovStringUtil.strip("  abc  ", null)).isEqualTo("abc");
        assertThat(EgovStringUtil.strip("xyabcxyx", "xy")).isEqualTo("abc");
        assertThat(EgovStringUtil.strip(null, "x")).isNull();
    }

    @Test
    @DisplayName("getRandomStr 테스트")
    void getRandomStrTest() {
        String random = EgovStringUtil.getRandomStr('a', 'z');
        assertThat(random).hasSize(1);
        assertThat(random.charAt(0)).isBetween('a', 'z');

        assertThatThrownBy(() -> EgovStringUtil.getRandomStr('z', 'a'))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("getEncdDcd 테스트")
    void getEncdDcdTest() {
        assertThat(EgovStringUtil.getEncdDcd(null, "UTF-8", "EUC-KR")).isNull();
        String result = EgovStringUtil.getEncdDcd("한글", "UTF-8", "UTF-8");
        assertThat(result).isEqualTo("한글");
        
        // Invalid charset
        assertThat(EgovStringUtil.getEncdDcd("한글", "INVALID", "UTF-8")).isNull();
    }

    @Test
    @DisplayName("getTimeStamp 테스트")
    void getTimeStampTest() {
        String timestamp = EgovStringUtil.getTimeStamp();
        assertThat(timestamp).hasSize(17); // yyyyMMddHHmmssSSS
        assertThat(timestamp).matches("\\d{17}");
    }
}
