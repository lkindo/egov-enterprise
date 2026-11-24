package nuri.foundation.core.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

@DisplayName("PiiMaskUtil 주민번호·자유문구 일괄 마스킹 테스트")
class PiiMaskUtilRedactTest {

    @Nested
    @DisplayName("주민·외국인등록번호 (rrno)")
    class Rrno {

        @Test
        @DisplayName("13자리 번호는 앞 6자리(생년월일)만 남기고 뒤 7자리를 가린다")
        void masksThirteenDigits() {
            assertThat(PiiMaskUtil.rrno("900101-1234567")).isEqualTo("900101-*******");
            assertThat(PiiMaskUtil.rrno("9912312345678")).isEqualTo("991231-*******");
        }

        @Test
        @DisplayName("13자리가 아니면 형식을 추측하지 않고 통째로 가린다")
        void masksInvalidLength() {
            assertThat(PiiMaskUtil.rrno("900101-123456")).isEqualTo("***");
            assertThat(PiiMaskUtil.rrno("900101-12345678")).isEqualTo("***");
        }

        @Test
        @DisplayName("null 또는 공백은 (none)으로 표기한다")
        void returnsNoneForBlank() {
            assertThat(PiiMaskUtil.rrno(null)).isEqualTo("(none)");
            assertThat(PiiMaskUtil.rrno("")).isEqualTo("(none)");
            assertThat(PiiMaskUtil.rrno("   ")).isEqualTo("(none)");
        }
    }

    @Nested
    @DisplayName("자유 문구 일괄 마스킹 (redactText)")
    class RedactText {

        private static String syntheticJwt(String header, String payload, String signature) {
            return String.join(".", header, payload, signature);
        }

        @Test
        @DisplayName("주민번호·휴대전화·유선전화·이메일·Bearer/JWT 토큰을 한 문구에서 모두 가린다")
        void masksAllSupportedPatterns() {
            String bearerJwt = syntheticJwt("eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxMjM0NTY3OCJ9", "sig12345678");
            String standaloneJwt = syntheticJwt("eyJhbGciOiJFUzI1NiJ9", "eyJ1c2VySWQiOiJhZG1pbiJ9", "signaturePart99");
            String raw = "user hong@example.com (rrno=900101-1234567, mobile=010-1234-5678 / 0112345678, "
                    + "tel=02-123-4567 / 031-987-6543 / 070-1234-5678.) auth=Bearer " + bearerJwt + " "
                    + "alt=bearer opaqueSecretToken_1234567890 mixed=Bearer aaa.bbb.ccc+ddd/eee= "
                    + "standalone=" + standaloneJwt;

            String masked = PiiMaskUtil.redactText(raw);

            assertThat(masked)
                    .contains("ho***@example.com")
                    .contains("rrno=900101-*******")
                    .contains("mobile=010-****-5678 / 011****5678")
                    .contains("tel=02-****-4567 / 031-****-6543 / 070-****-5678.")
                    .contains("auth=Bearer ***")
                    .contains("alt=bearer ***")
                    .contains("mixed=Bearer ***")
                    .contains("standalone=***(jwt)***")
                    .doesNotContain("hong@example.com")
                    .doesNotContain("900101-1234567")
                    .doesNotContain("010-1234-5678")
                    .doesNotContain("0112345678")
                    .doesNotContain("02-123-4567")
                    .doesNotContain("031-987-6543")
                    .doesNotContain("070-1234-5678")
                    .doesNotContain("+ddd/eee=")
                    .doesNotContain("eyJhbGci")
                    .doesNotContain("opaqueSecretToken_1234567890");
        }

        @Test
        @DisplayName("이미 마스킹된 문자열을 다시 통과시켜도 결과가 변하지 않는다 (멱등성)")
        void isIdempotent() {
            String sampleJwt = syntheticJwt("eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxMjM0NTY3OCJ9", "sig12345678");
            String raw = "hong@example.com a@x.kr 900101-1234567 010-1234-5678 01012345678 "
                    + "064-1234-5678 070-1234-5678 Bearer abcdefghijklmnop Bearer aaa.bbb.ccc+ddd/eee= " + sampleJwt;
            String firstPass = PiiMaskUtil.redactText(raw);
            String secondPass = PiiMaskUtil.redactText(firstPass);

            assertThat(secondPass).isEqualTo(firstPass);
        }

        @Test
        @DisplayName("오탐 경계: 월·일·성별코드 범위 밖 숫자, 식별자 접두, 소수, 12자리 숫자, 날짜, 객체 해시는 보존한다")
        void preservesNonPiiLookalikes() {
            String safe = "traceId=0af7651916cd43dd8448eb211c80319c spanId=b7ad6b7169203331 "
                    + "ts=2026-11-24T14:30:00+09:00 uuid=550e8400-e29b-41d4-a716-446655440000 "
                    + "ref=com.example.Obj@1a2b3c4d usr=USR_01012345678 longNum=010123456789 "
                    + "decimal=0.01012345678 floatNum=01012345678.5 "
                    + "shortBearer='Bearer ok' badMonth=901301-1234567 badDay=900132-1234567 "
                    + "badGender=900101-9234567 embedded=a900101-1234567/900101-1234567b/20261124-1234567 "
                    + "already=ho***@example.com";

            assertThat(PiiMaskUtil.redactText(safe)).isEqualTo(safe);
        }

        @Test
        @DisplayName("문장 끝 마침표 앞 이메일과 $ 포함 문자열 치환도 예외 없이 정확히 가린다")
        void masksEmailBeforeSentencePunctuationSafely() {
            String input = "Sent mail to user.name+tag@sub.corp.go.kr. Also alice@x.kr!";
            assertThat(PiiMaskUtil.redactText(input))
                    .isEqualTo("Sent mail to us***@sub.corp.go.kr. Also al***@x.kr!");
        }

        @Test
        @DisplayName("null·빈 문자열·제어문자에서도 절대 예외를 던지지 않는다")
        void neverThrowsOnEdgeInputs() {
            assertThat(PiiMaskUtil.redactText(null)).isNull();
            assertThat(PiiMaskUtil.redactText("")).isEmpty();
            assertThatCode(() -> {
                for (String value : new String[] { "", " ", "@", "-", "\u0000", "Bearer ", "eyJ", "010-" }) {
                    PiiMaskUtil.redactText(value);
                    PiiMaskUtil.rrno(value);
                }
            }).doesNotThrowAnyException();
        }
    }
}
