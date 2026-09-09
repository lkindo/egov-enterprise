package nuri.api.support;

import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PageRequestsTest {
    @ParameterizedTest
    @CsvSource({"-2147483648,10", "0,10", "1,0", "1,-1", "1,101", "1,2147483647"})
    void rejectsInvalidInputsBeforeArithmetic(int page, int size) {
        assertThatThrownBy(() -> PageRequests.of(page, size)).isInstanceOf(BusinessException.class);
    }

    @Test
    void preservesValidPageBoundaries() {
        assertThat(PageRequests.of(1, 100).getPageNumber()).isZero();
        assertThat(PageRequests.of(Integer.MAX_VALUE, 10).getPageNumber()).isEqualTo(Integer.MAX_VALUE - 1);
    }
}
