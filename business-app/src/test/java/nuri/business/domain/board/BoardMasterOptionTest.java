package nuri.business.domain.board;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link BoardMasterOption} 의 {@code @PrePersist} 기본값 보정 검증.
 *
 * <p>[검증 의도] {@code onCreateOption()} 은 INSERT 직전에 NOT NULL 컬럼(ans_yn/stsfdg_yn)과
 * 감사 컬럼의 공백을 메우는 마지막 방어선이다. 이 보정이 빠지면 NOT NULL 제약 위반으로 저장이
 * 실패하거나 감사 주체가 유실된다. 종전에는 이 메서드 전체가 테스트 미도달(NO_COVERAGE)이었다.
 *
 * <p>정적 팩토리({@link BoardMasterOption#create})는 생성자에서 이미 "N" 을 채우므로 null 분기에
 * 도달하지 않는다. 실제 위험 경로는 JPA 가 기본 생성자로 인스턴스를 만든 뒤 필드가 비어 있는
 * 상태이므로, 리플렉션으로 그 상태를 재현해 보정 로직 자체를 검증한다.
 */
@DisplayName("BoardMasterOption @PrePersist 기본값 보정")
class BoardMasterOptionTest {

    private BoardMasterOption newOption() {
        return BoardMasterOption.builder().bbsId("BBSMSTR_000000000001").build();
    }

    @Test
    @DisplayName("ansYn/stsfdgYn 이 비어 있으면 'N' 으로 채운다 (NOT NULL 방어)")
    void onCreateOption_fillsFlagDefaultsWhenNull() {
        BoardMasterOption option = newOption();
        ReflectionTestUtils.setField(option, "ansYn", null);
        ReflectionTestUtils.setField(option, "stsfdgYn", null);

        ReflectionTestUtils.invokeMethod(option, "onCreateOption");

        assertThat(option.getAnsYn()).isEqualTo("N");
        assertThat(option.getStsfdgYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("이미 설정된 ansYn/stsfdgYn 은 덮어쓰지 않는다")
    void onCreateOption_keepsExplicitFlags() {
        BoardMasterOption option = BoardMasterOption.builder()
                .bbsId("BBSMSTR_000000000001")
                .ansYn("Y")
                .stsfdgYn("Y")
                .build();

        ReflectionTestUtils.invokeMethod(option, "onCreateOption");

        assertThat(option.getAnsYn()).isEqualTo("Y");
        assertThat(option.getStsfdgYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("감사 주체가 비어 있으면 'webmaster' 로 채운다")
    void onCreateOption_fillsAuditorDefaultsWhenNull() {
        BoardMasterOption option = newOption();

        ReflectionTestUtils.invokeMethod(option, "onCreateOption");

        assertThat(option.getFrstRgtrId()).isEqualTo("webmaster");
        assertThat(option.getLastMdfrId()).isEqualTo("webmaster");
    }

    @Test
    @DisplayName("이미 설정된 감사 주체는 덮어쓰지 않는다")
    void onCreateOption_keepsExplicitAuditor() {
        BoardMasterOption option = newOption();
        option.setFrstRgtrId("admin");
        option.setLastMdfrId("editor");

        ReflectionTestUtils.invokeMethod(option, "onCreateOption");

        assertThat(option.getFrstRgtrId()).isEqualTo("admin");
        assertThat(option.getLastMdfrId()).isEqualTo("editor");
    }
}
