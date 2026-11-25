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
        void sortableIgnoringCase(@SortableBy(value = {"hlpNm"}, ignoreCase = true) Pageable pageable) { }
    }

    private boolean allowsOn(String method, String... sorts) throws NoSuchMethodException {
        return allowsOn(guard, "sort", method, sorts);
    }

    private static boolean allowsOn(SortParameterGuard target, String parameter, String method, String... sorts)
            throws NoSuchMethodException {
        Class<?>[] types = method.equals("plain") ? new Class<?>[] {String.class} : new Class<?>[] {Pageable.class};
        var handler = new HandlerMethod(new Handlers(), Handlers.class.getDeclaredMethod(method, types));
        var request = new MockHttpServletRequest();
        request.addParameter(parameter, sorts);
        return target.preHandle(request, new MockHttpServletResponse(), handler);
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
        assertThat(allowsOn("sortable", "crtDt,asc", "hlpSn", "hlpSn,crtDt,Desc")).isTrue();
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
    @Test
    @DisplayName("[Codex 검토] 속성은 Spring Data 리졸버가 실제로 읽는 대로 본다 — 공백 붙은 방향·중간의 방향 낱말은 속성이다")
    void propertiesFollowTheSpringDataResolver() throws Exception {
        // 리졸버는 방향·ignorecase 를 끝에서만 소비하고 " DESC" 는 대문자로 바꿔도 방향이 아니라 속성으로 읽는다.
        assertThatThrownBy(() -> allowsOn("sortable", "hlpSn, DESC")).isInstanceOf(InvalidSortParameterException.class);
        assertThatThrownBy(() -> allowsOn("sortable", "hlpSn,desc,hlpSn")).isInstanceOf(InvalidSortParameterException.class);
    }

    @Test
    @DisplayName("[Codex 검토] 대소문자 무시 정렬은 허용 목록이 열어 둘 때만 받는다 — 숫자 열에 붙으면 저장소가 실패한다")
    void ignoreCaseRequiresExplicitOptIn() throws Exception {
        assertThatThrownBy(() -> allowsOn("sortable", "hlpSn,DESC,ignorecase")).isInstanceOf(InvalidSortParameterException.class);
        assertThat(allowsOn("sortableIgnoringCase", "hlpNm,asc,ignorecase")).isTrue();
    }

    @Test
    @DisplayName("[Codex 검토] 정렬 파라미터 이름을 바꾼 배포에서도 리졸버가 읽는 이름으로 허용 목록을 본다")
    void followsTheConfiguredSortParameterName() throws Exception {
        var resolver = new org.springframework.data.web.SortHandlerMethodArgumentResolver();
        resolver.setSortParameter("order");
        var renamed = new SortParameterGuard(resolver, "order");
        assertThatThrownBy(() -> allowsOn(renamed, "order", "open", "crtDt,DESC")).isInstanceOf(InvalidSortParameterException.class);
        assertThat(allowsOn(renamed, "order", "sortable", "hlpSn,DESC")).isTrue();
        assertThat(allowsOn(renamed, "sort", "open", "crtDt,DESC")).as("리졸버가 읽지 않는 이름은 정렬이 아니다").isTrue();
    }
}
