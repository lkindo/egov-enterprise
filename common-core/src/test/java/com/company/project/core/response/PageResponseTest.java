package com.company.project.core.response;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

class PageResponseTest {

    @Test
    @DisplayName("페이지 응답 객체 생성 및 페이징 계산 테스트")
    void pageResponseCreationTest() {
        List<String> list = List.of("item1", "item2");
        long total = 25;
        int currentPage = 1;
        int size = 10;

        PageResponse<String> response = PageResponse.of(list, currentPage, size, total);

        assertThat(response.getList()).hasSize(2);
        assertThat(response.getTotal()).isEqualTo(total);
        assertThat(response.getPage()).isEqualTo(currentPage);
        assertThat(response.getSize()).isEqualTo(size);
        assertThat(response.getTotalPage()).isEqualTo(3); // 25 / 10 = 2.5 -> 3
    }
}
