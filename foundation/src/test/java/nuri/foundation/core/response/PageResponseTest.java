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