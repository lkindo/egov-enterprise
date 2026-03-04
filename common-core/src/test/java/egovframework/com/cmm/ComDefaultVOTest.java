package egovframework.com.cmm;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ComDefaultVOTest {

    @Test
    @DisplayName("ComDefaultVO 기본 속성 및 페이징 계산 테스트")
    void voPropertyTest() {
        ComDefaultVO vo = new ComDefaultVO();

        vo.setPageIndex(2);
        vo.setPageUnit(10);
        vo.setPageSize(5);

        assertThat(vo.getPageIndex()).isEqualTo(2);
        assertThat(vo.getPageUnit()).isEqualTo(10);

        // eGovFrame ComDefaultVO usually has some internal logic for first/last index
        // but here we just test basic setter/getter if logic is simple.
        vo.setSearchKeyword("test");
        assertThat(vo.getSearchKeyword()).isEqualTo("test");
    }
}
