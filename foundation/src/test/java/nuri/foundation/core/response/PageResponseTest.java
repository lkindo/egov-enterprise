package nuri.foundation.core.response;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("PageResponse 테스트")
class PageResponseTest {

    @Test
    @DisplayName("목록과 페이지 정보로 응답을 생성한다")
    void testFromList() {
        List<String> content = List.of("first", "second");

        PageResponse<String> response = PageResponse.of(content, 2, 10, 21);

        assertEquals(content, response.getList());
        assertEquals(21, response.getTotal());
        assertEquals(3, response.getTotalPage());
        assertEquals(2, response.getPage());
        assertEquals(10, response.getSize());
    }

    @Test
    @DisplayName("페이지 크기가 0이면 전체 페이지 수도 0이다")
    void testFromListWithZeroSize() {
        PageResponse<String> response = PageResponse.of(List.of(), 1, 0, 5);

        assertEquals(0, response.getTotalPage());
        assertEquals(0, response.getSize());
    }

    @Test
    @DisplayName("Spring Data Page 전환 확인")
    void testFromPage() {
        List<String> content = Collections.singletonList("data");
        Page<String> page = new PageImpl<>(content, PageRequest.of(1, 10), 100);

        PageResponse<String> response = PageResponse.of(page);

        assertEquals(content, response.getList());
        assertEquals(100, response.getTotal());
        assertEquals(10, response.getTotalPage());
        assertEquals(2, response.getPage());
        assertEquals(10, response.getSize());
    }
}
