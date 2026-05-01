package nuri.business.service.board.mapper;

import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardSearchResult;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardSaveRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BoardMapper 단위 테스트")
class BoardMapperTest {

    private final BoardMapper boardMapper = Mappers.getMapper(BoardMapper.class);

    @Test
    @DisplayName("Board 엔티티에서 BoardDto로 변환 테스트")
    void toDtoFromEntityTest() {
        Board entity = Board.builder()
                .nttId(1L)
                .bbsId("BBS_001")
                .nttSj("Test Subject")
                .nttCn("Test Content")
                .ntcrNm("Tester")
                .inqireCo(10)
                .atchFileId("FILE_001")
                .nttNo(1L)
                .sortOrdr(1L)
                .parnts(0L)
                .replyAt("N")
                .replyLc(0)
                .ntceBgnde("20240101")
                .ntceEndde("20241231")
                .useAt("Y")
                .ntcrId("user01")
                .password("password")
                .build();
        
        BoardDto dto = boardMapper.toDto(entity);

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getBbsId()).isEqualTo("BBS_001");
        assertThat(dto.getNttSj()).isEqualTo("Test Subject");
        assertThat(dto.getNtcrNm()).isEqualTo("Tester");
    }

    @Test
    @DisplayName("BoardSearchResult에서 BoardDto로 변환 테스트")
    void toDtoFromSearchResultTest() {
        LocalDateTime now = LocalDateTime.of(2024, 3, 14, 12, 0);
        BoardSearchResult result = BoardSearchResult.builder()
                .nttId(1L)
                .bbsId("BBS_001")
                .nttSj("Search Result")
                .frstRegisterNm("Writer")
                .inqireCo(5)
                .createdDate(now)
                .atchFileId("FILE_002")
                .parnts(0L)
                .replyAt("N")
                .replyLc(0)
                .ntceBgnde("20240101")
                .ntceEndde("20241231")
                .useAt("Y")
                .secretAt("N")
                .commentCo(3)
                .build();

        BoardDto dto = boardMapper.toDto(result);

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getBbsId()).isEqualTo("BBS_001");
        assertThat(dto.getNttSj()).isEqualTo("Search Result");
        assertThat(dto.getCommentCo()).isEqualTo(3);
    }

    @Test
    @DisplayName("BoardSaveRequest에서 Board 엔티티로 변환 테스트")
    void toEntityTest() {
        BoardSaveRequest request = new BoardSaveRequest(
                "BBS_001", "New Subject", "New Content",
                "20240101", "20241231", "FILE_001",
                "N", "2024-03-14T12:00:00", "OPEN", "TECH",
                "N", "Y", "user01", "Tester", "pass123"
        );

        Board entity = boardMapper.toEntity(request, "BBS_001", "user01", "Tester", 100L);

        assertThat(entity.getBbsId()).isEqualTo("BBS_001");
        assertThat(entity.getNttSj()).isEqualTo("New Subject");
        assertThat(entity.getNtcrId()).isEqualTo("user01");
        assertThat(entity.getNtcrNm()).isEqualTo("Tester");
        assertThat(entity.getSortOrdr()).isEqualTo(100L);
        assertThat(entity.getReplyAt()).isEqualTo("N");
        assertThat(entity.getEventDate()).isNotNull();
    }
}
