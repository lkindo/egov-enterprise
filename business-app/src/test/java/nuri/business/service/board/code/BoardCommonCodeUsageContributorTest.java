package nuri.business.service.board.code;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("게시판 기능의 공통코드 사용처")
class BoardCommonCodeUsageContributorTest {

    @Test
    @DisplayName("게시판 속성(COM009) 하나를 말하고, 그 이름을 보이는 화면이 없다는 사실을 숨기지 않는다")
    void statesBoardAttributeUsage() {
        assertThat(new BoardCommonCodeUsageContributor().commonCodeUsages())
                .singleElement()
                .satisfies(usage -> {
                    assertThat(usage.groupId()).isEqualTo("COM009");
                    assertThat(usage.description()).contains("게시판 관리 목록").contains("화면은 없습니다");
                });
    }
}
