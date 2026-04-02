package com.company.project.foundation.core.response;

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

        assertEquals(content, response.getContent());
        assertEquals(100, response.getTotalElements());
        assertEquals(10, response.getTotalPages());
        assertEquals(1, response.getPageNumber());
        assertEquals(10, response.getPageSize());
    }
}