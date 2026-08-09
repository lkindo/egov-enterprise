package nuri.foundation.core.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * 개인정보 마스킹 유틸 테스트.
 *
 * <p>[2026-08-09 신설] 같은 패키지의 다른 유틸에는 테스트가 있는데 <b>이 클래스만 없었다</b>
 * (스코프 실측에서 생존 뮤턴트 20건 — 이 패키지 39건 중 절반이 여기였다).
 *
 * <p>이 유틸이 존재하는 이유를 소스가 적어 두었다 — 이메일·휴대폰이 여러 서비스에서
 * <b>평문으로 로그에 적재</b>되고 있었고(W1-13), <b>로그는 애플리케이션보다 오래 살고 더 넓게
 * 복제된다</b>(수집기·백업·티켓 첨부). 그래서 로그는 저장소와 같은 등급으로 다뤄야 한다.
 *
 * <p>그런데 그 마스킹 자체는 검증된 적이 없었다. 여기서 조건 하나가 뒤집히면
 * <b>가려야 할 것이 그대로 나가고, 그 사실은 로그가 유출된 뒤에야 드러난다.</b>
 *
 * <p>마스킹은 "전부 가리기" 가 아니라 <b>추적 가능성을 남기는 선</b>에서 한다 —
 * 같은 사용자의 로그를 이어 볼 수 있어야 장애 분석이 된다.
 * 그래서 <b>얼마나 남기는가가 곧 정책</b>이고, 경계값이 정책 그 자체다.
 */
@DisplayName("개인정보 마스킹 유틸 테스트")
class PiiMaskUtilTest {

    @Nested
    @DisplayName("이메일")
    class Email {

        @Test
        @DisplayName("로컬파트 앞 2자만 남기고 도메인은 보존한다")
        void masksLocalPartKeepsDomain() {
            assertThat(PiiMaskUtil.email("hong@example.com")).isEqualTo("ho***@example.com");
            assertThat(PiiMaskUtil.email("verylongname@corp.go.kr")).isEqualTo("ve***@corp.go.kr");
        }

        @Test
        @DisplayName("로컬파트가 2자 이하면 1자만 남긴다 — 2자를 남기면 통째로 드러난다")
        void shortLocalPartKeepsOnlyOneChar() {
            // "ab" 에서 2자를 남기면 마스킹이 아니라 원문 노출이다.
            assertThat(PiiMaskUtil.email("ab@x.com")).isEqualTo("a***@x.com");
            assertThat(PiiMaskUtil.email("a@x.com")).isEqualTo("a***@x.com");
        }

        @Test
        @DisplayName("경계: 로컬파트 3자부터 2자를 남긴다")
        void threeCharLocalPartKeepsTwo() {
            // `local.length() <= 2` 의 경계를 옮긴 뮤턴트가 여기서 죽는다.
            assertThat(PiiMaskUtil.email("abc@x.com")).isEqualTo("ab***@x.com");
        }

        @Test
        @DisplayName("@ 로 시작하면 형태를 추측하지 않고 통째로 가린다")
        void leadingAtIsFullyMasked() {
            // at == 0 이면 로컬파트가 없다 — substring(0,1) 은 예외이거나 무의미하다.
            assertThat(PiiMaskUtil.email("@example.com")).isEqualTo("***");
        }

        @Test
        @DisplayName("@ 가 없으면 통째로 가린다")
        void noAtIsFullyMasked() {
            // `at <= 0` 을 `at < 0` 으로 바꾼 뮤턴트는 위 @ 시작 케이스에서,
            // 이 검사를 지운 뮤턴트는 여기서 죽는다.
            assertThat(PiiMaskUtil.email("not-an-email")).isEqualTo("***");
            assertThat(PiiMaskUtil.email("010-1234-5678")).isEqualTo("***");
        }

        @Test
        @DisplayName("null·공백은 (none) 으로 표기한다")
        void nullOrBlankIsNone() {
            assertThat(PiiMaskUtil.email(null)).isEqualTo("(none)");
            assertThat(PiiMaskUtil.email("")).isEqualTo("(none)");
            assertThat(PiiMaskUtil.email("   ")).isEqualTo("(none)");
        }

        @Test
        @DisplayName("결과에 원본 로컬파트가 남지 않는다")
        void maskedResultDoesNotLeakLocalPart() {
            String masked = PiiMaskUtil.email("hong.gildong@example.com");

            // 마스킹의 목적 자체를 단언한다 — 형식이 바뀌어도 이 성질은 지켜져야 한다.
            assertThat(masked).doesNotContain("hong.gildong");
            assertThat(masked).contains("@example.com");
        }
    }

    @Nested
    @DisplayName("전화번호")
    class Phone {

        @Test
        @DisplayName("숫자만 추려 앞 3자리와 뒤 4자리만 남긴다")
        void keepsPrefixAndSuffixOnly() {
            assertThat(PiiMaskUtil.phone("010-1234-5678")).isEqualTo("010****5678");
            // 구분자가 무엇이든 결과가 같아야 한다 — 형식에 의존하면 일부 경로가 새어 나간다.
            assertThat(PiiMaskUtil.phone("010 1234 5678")).isEqualTo("010****5678");
            assertThat(PiiMaskUtil.phone("01012345678")).isEqualTo("010****5678");
            assertThat(PiiMaskUtil.phone("+82-10-1234-5678")).isEqualTo("821****5678");
        }

        @Test
        @DisplayName("자릿수가 모자라면 통째로 가린다")
        void tooFewDigitsAreFullyMasked() {
            assertThat(PiiMaskUtil.phone("123456")).isEqualTo("***");
            assertThat(PiiMaskUtil.phone("12")).isEqualTo("***");
            // 숫자가 하나도 없어도 예외가 아니라 마스킹이다.
            assertThat(PiiMaskUtil.phone("no-digits-here")).isEqualTo("***");
        }

        @Test
        @DisplayName("경계: 7자리부터 마스킹 형태를 쓴다")
        void sevenDigitsIsTheBoundary() {
            // `digits.length() < 7` 의 경계를 옮긴 뮤턴트가 여기서 죽는다.
            //   7자리면 앞3+뒤4 가 정확히 전체다(겹침 없음).
            assertThat(PiiMaskUtil.phone("1234567")).isEqualTo("123****4567");
            assertThat(PiiMaskUtil.phone("123456")).isEqualTo("***");
        }

        @Test
        @DisplayName("null·공백은 (none) 으로 표기한다")
        void nullOrBlankIsNone() {
            assertThat(PiiMaskUtil.phone(null)).isEqualTo("(none)");
            assertThat(PiiMaskUtil.phone("")).isEqualTo("(none)");
            assertThat(PiiMaskUtil.phone("  ")).isEqualTo("(none)");
        }

        @Test
        @DisplayName("결과에 가운데 자리가 남지 않는다")
        void maskedResultHidesMiddleDigits() {
            String masked = PiiMaskUtil.phone("010-9876-5432");

            // 가운데 4자리(9876)가 식별의 핵심이다 — 그것이 남으면 마스킹한 의미가 없다.
            assertThat(masked).doesNotContain("9876");
            assertThat(masked).isEqualTo("010****5432");
        }
    }

    @Nested
    @DisplayName("자유 텍스트")
    class ContentSummary {

        @Test
        @DisplayName("내용을 남기지 않고 길이만 남긴다")
        void keepsLengthOnly() {
            String body = "비밀번호 재설정 링크: https://x/abc";
            assertThat(PiiMaskUtil.contentSummary(body))
                    .isEqualTo("(" + body.length() + " chars)");
            assertThat(PiiMaskUtil.contentSummary("")).isEqualTo("(0 chars)");
            assertThat(PiiMaskUtil.contentSummary("abcde")).isEqualTo("(5 chars)");
        }

        @Test
        @DisplayName("본문 조각이 결과에 섞이지 않는다")
        void doesNotLeakAnyContent() {
            String secret = "인증코드 483920";

            String summary = PiiMaskUtil.contentSummary(secret);

            // 본문에는 재발급 링크·인증 코드가 실릴 수 있어 **부분 노출도 위험**하다.
            assertThat(summary).doesNotContain("483920");
            assertThat(summary).doesNotContain("인증코드");
        }

        @Test
        @DisplayName("null 은 (null) 이고 길이 0 과 구분된다")
        void nullIsDistinctFromEmpty() {
            // "본문이 없었다" 와 "빈 본문이 나갔다" 는 다른 사건이다.
            assertThat(PiiMaskUtil.contentSummary(null)).isEqualTo("(null)");
            assertThat(PiiMaskUtil.contentSummary("")).isEqualTo("(0 chars)");
        }
    }

    @Test
    @DisplayName("어떤 입력에도 예외를 던지지 않는다 — 로깅 경로의 2차 장애 방지")
    void neverThrows() {
        // 로깅 경로에서 던지는 유틸은 **진짜 오류를 가리는 2차 장애**를 만든다.
        assertThatCode(() -> {
            for (String v : new String[] { null, "", " ", "@", "@@", "a@", " ", "－－－" }) {
                PiiMaskUtil.email(v);
                PiiMaskUtil.phone(v);
                PiiMaskUtil.contentSummary(v);
            }
        }).doesNotThrowAnyException();
    }
}
