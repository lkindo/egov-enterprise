package nuri.api.interceptor;

import nuri.foundation.core.exception.InvalidSortParameterException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import nuri.api.support.SortableBy;
import nuri.api.support.UnsortedPageable;
import org.springframework.data.domain.Pageable;
import org.springframework.web.method.HandlerMethod;

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
    // ---------------------------------------------------------------- 허용 목록(2026-11-25 품질 평가)

    /** 정렬 정책별 핸들러 모양. */
    @SuppressWarnings("unused")
    static class Handlers {
        void plain(String keyword) { }
        void open(Pageable pageable) { }
        void unsorted(@UnsortedPageable Pageable pageable) { }
        void sortable(@SortableBy({"hlpSn", "crtDt"}) Pageable pageable) { }
    }

    private boolean allowsOn(String method, String... sorts) throws NoSuchMethodException {
        Class<?>[] types = method.equals("plain") ? new Class<?>[] {String.class} : new Class<?>[] {Pageable.class};
        var handler = new HandlerMethod(new Handlers(), Handlers.class.getDeclaredMethod(method, types));
        var request = new MockHttpServletRequest();
        request.addParameter("sort", sorts);
        return guard.preHandle(request, new MockHttpServletResponse(), handler);
    }

    @Test
    @DisplayName("표시 없는 Pageable 은 형식이 맞아도 클라이언트 정렬을 받지 않는다 — 방향만 오면 통과한다")
    void unannotatedPageableRejectsAnyProperty() throws Exception {
        assertThatThrownBy(() -> allowsOn("open", "crtDt,DESC")).isInstanceOf(InvalidSortParameterException.class);
        assertThatThrownBy(() -> allowsOn("open", "crtDt")).isInstanceOf(InvalidSortParameterException.class);
        assertThat(allowsOn("open", "")).isTrue();
        assertThat(allowsOn("open", "DESC")).isTrue();
    }

    @Test
    @DisplayName("@SortableBy 는 허용 속성만 받는다 — 방향·대소문자 옵션은 속성이 아니고, 목록 밖 속성이 하나라도 있으면 400 이다")
    void sortableAcceptsOnlyListedProperties() throws Exception {
        assertThat(allowsOn("sortable", "hlpSn,DESC")).isTrue();
        assertThat(allowsOn("sortable", "crtDt,asc,ignorecase", "hlpSn")).isTrue();
        assertThatThrownBy(() -> allowsOn("sortable", "hlpExpln,asc")).isInstanceOf(InvalidSortParameterException.class);
        assertThatThrownBy(() -> allowsOn("sortable", "hlpSn,DESC", "user.userNm")).isInstanceOf(InvalidSortParameterException.class);
        assertThatThrownBy(() -> allowsOn("sortable", "HLPSN")).as("대소문자까지 정확히 일치").isInstanceOf(InvalidSortParameterException.class);
    }

    @Test
    @DisplayName("@UnsortedPageable 은 종전대로 받아 핸들러가 걷어 내고, 정렬 인자가 없는 핸들러는 형식만 본다")
    void unsortedAndNonPagingHandlersKeepFormatOnlyBehaviour() throws Exception {
        assertThat(allowsOn("unsorted", "userId,DESC")).isTrue();
        assertThat(allowsOn("plain", "anything,asc")).isTrue();
        assertThatThrownBy(() -> allowsOn("unsorted", "[userId,DESC]")).isInstanceOf(InvalidSortParameterException.class);
    }
}
