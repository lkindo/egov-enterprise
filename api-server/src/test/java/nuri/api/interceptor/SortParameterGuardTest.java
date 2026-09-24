package nuri.api.interceptor;

import nuri.foundation.core.exception.InvalidSortParameterException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("SortParameterGuard — sort 값 형식 경계")
class SortParameterGuardTest {

    private final SortParameterGuard guard = new SortParameterGuard();

    private boolean allows(String... sorts) {
        var request = new MockHttpServletRequest();
        request.addParameter("sort", sorts);
        return guard.preHandle(request, new MockHttpServletResponse(), new Object());
    }

    @Test
    @DisplayName("속성 경로와 방향·대소문자 옵션은 통과한다")
    void allowsPropertyPathsAndDirections() {
        assertThat(allows("crtDt,DESC")).isTrue();
        assertThat(allows("user.userNm,asc,ignorecase", "ifmlAtrzSn")).isTrue();
        assertThat(allows("")).isTrue();
        assertThat(guard.preHandle(new MockHttpServletRequest(), new MockHttpServletResponse(), new Object())).isTrue();
    }

    @Test
    @DisplayName("괄호·따옴표·공백·과도한 길이와 깊이는 저장소에 닿기 전에 거부한다")
    void rejectsMalformedSortValues() {
        for (String sort : new String[] {"[crtDt,DESC]", "[\"crtDt,DESC\"]", "crtDt;drop", "www google",
                "A".repeat(2100), "a.b.c.d.e.f", "1abc"}) {
            assertThatThrownBy(() -> allows(sort)).as(sort.length() > 40 ? sort.substring(0, 40) : sort)
                    .isInstanceOf(InvalidSortParameterException.class);
        }
    }
}
