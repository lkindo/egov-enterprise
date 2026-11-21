package nuri.foundation.core.board;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BoardPostAccessPort 단위 테스트")
class BoardPostAccessPortTest {

    private static final BoardPostAccessPort SINGLE_POST_PORT = (bbsId, pstSn) -> {
        if (!"BBS_001".equals(bbsId) || !Long.valueOf(10L).equals(pstSn)) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED, "열람 권한이 없습니다.");
        }
    };

    @Test
    @DisplayName("일괄 조회 기본 구현은 null·빈 입력에서 빈 불변 집합을 반환한다")
    void defaultFindScrapablePostsHandlesNullAndEmptyTargets() {
        assertThat(SINGLE_POST_PORT.findScrapablePosts(null)).isEmpty();
        assertThat(SINGLE_POST_PORT.findScrapablePosts(List.of())).isEmpty();
    }

    @Test
    @DisplayName("일괄 조회 기본 구현은 null 요소·null 게시판을 건너뛰고 열람 거부 예외를 접어 허용된 대상만 반환한다")
    void defaultFindScrapablePostsDelegatesAndFailsClosed() {
        BoardPostAccessPort.PostRef allowed = new BoardPostAccessPort.PostRef("BBS_001", 10L);
        BoardPostAccessPort.PostRef denied = new BoardPostAccessPort.PostRef("BBS_001", 20L);
        BoardPostAccessPort.PostRef missingBoard = new BoardPostAccessPort.PostRef(null, 30L);

        Set<BoardPostAccessPort.PostRef> result = SINGLE_POST_PORT.findScrapablePosts(
                Arrays.asList(null, missingBoard, allowed, denied));

        assertThat(result).containsExactly(allowed);
        assertThatThrownBy(() -> result.add(denied)).isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    @DisplayName("PostRef 레코드는 게시판 ID·게시글 번호 좌표를 값으로 보존·비교한다")
    void postRefCarriesCoordinates() {
        BoardPostAccessPort.PostRef first = new BoardPostAccessPort.PostRef("BBS_001", 10L);
        BoardPostAccessPort.PostRef same = new BoardPostAccessPort.PostRef("BBS_001", 10L);
        BoardPostAccessPort.PostRef other = new BoardPostAccessPort.PostRef("BBS_002", 10L);

        assertThat(first.bbsId()).isEqualTo("BBS_001");
        assertThat(first.pstSn()).isEqualTo(10L);
        assertThat(first).isEqualTo(same).isNotEqualTo(other);
    }
}
