package nuri.foundation.core.template;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AssignableTemplate 단위 테스트")
class AssignableTemplateTest {

    @Test
    @DisplayName("템플릿 지정 후보가 원장 항목의 식별자와 이름을 그대로 나른다")
    void carriesLedgerIdentifierAndName() {
        AssignableTemplate template = new AssignableTemplate("TMPL01", "기본 템플릿");

        assertThat(template.tmpltId()).isEqualTo("TMPL01");
        assertThat(template.tmpltNm()).isEqualTo("기본 템플릿");
    }

    /**
     * 커뮤니티 관리 창의 후보 목록은 포트 구현(템플릿 기능)이 만들고 소비자(커뮤니티)가 그대로 넘긴다.
     * 양쪽 시험이 후보 목록을 값으로 대조하므로, 같은 식별자·이름이면 같은 후보여야 한다.
     */
    @Test
    @DisplayName("같은 식별자·이름의 후보는 같은 값이고 다른 식별자는 다른 값이다")
    void comparesByValue() {
        List<AssignableTemplate> fromPolicy = List.of(
                new AssignableTemplate("A", "가 템플릿"), new AssignableTemplate("B", "나 템플릿"));
        List<AssignableTemplate> expected = List.of(
                new AssignableTemplate("A", "가 템플릿"), new AssignableTemplate("B", "나 템플릿"));

        assertThat(fromPolicy).isEqualTo(expected);
        assertThat(new AssignableTemplate("A", "가 템플릿").hashCode())
                .isEqualTo(new AssignableTemplate("A", "가 템플릿").hashCode());
        assertThat(new AssignableTemplate("A", "가 템플릿")).isNotEqualTo(new AssignableTemplate("B", "가 템플릿"));
    }
}
