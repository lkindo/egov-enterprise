package nuri.api.support;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import static org.assertj.core.api.Assertions.assertThat;

class PageRequestsTest {
    @Test
    void unsortedKeepsNumberAndSizeAndDropsClientSort() {
        PageRequest unsorted = PageRequests.unsorted(PageRequest.of(2, 30, Sort.by("frstRegistPnttm").descending()));

        assertThat(unsorted.getPageNumber()).isEqualTo(2);
        assertThat(unsorted.getPageSize()).isEqualTo(30);
        assertThat(unsorted.getSort().isUnsorted()).isTrue();
    }
}
