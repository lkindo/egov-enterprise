package nuri.business.domain.board;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Board 댓글 수 저장소 경계 계약")
class BoardCommentCountIsolationContractTest {

    @Test
    @DisplayName("댓글 수 갱신 SQL은 board 행만 원자 갱신하고 comment 저장소를 읽지 않는다")
    void commentCountUpdateOwnsOnlyBoardRow() throws IOException {
        String source = Files.readString(
                Path.of("src", "main", "java", "nuri", "business", "domain", "board", "BoardRepository.java"),
                StandardCharsets.UTF_8);

        assertThat(source)
                .contains("SET cmnt_cnt = GREATEST(COALESCE(cmnt_cnt, 0) + :delta, 0)")
                .contains("int adjustCmntCntAtomic(")
                .doesNotContain("tb_bbs_comment")
                .doesNotContain("CommentRepository")
                .doesNotContain("SELECT CAST(COUNT(*) AS INTEGER)");
    }
}
