package nuri.business.service.board;

import nuri.business.domain.board.Board;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardSaveRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("BoardMapper ?¨ìœ„ ?ŒìŠ¤??)
class BoardMapperTest {

    private final BoardMapper mapper = Mappers.getMapper(BoardMapper.class);

    @Test
    @DisplayName("Entity -> DTO ë³€???ŒìŠ¤??)
    void toDtoTest() {
        Board board = Board.builder()
                .pstId("1")
                .pstTtl("?œëª©")
                .crtDt(LocalDateTime.of(2026, 5, 3, 10, 0))
                .blogId("BLOG1")
                .build();

        BoardDto dto = mapper.toDto(board);

        assertNotNull(dto);
        assertEquals("1", dto.getPstId());
        assertEquals("1", dto.getPstId());
        assertEquals("?œëª©", dto.getPstTtl());
        assertEquals(LocalDateTime.of(2026, 5, 3, 10, 0), dto.getCrtDt());
    }
    @DisplayName("?”í´??ë©”ì„œ???ŒìŠ¤??- formatDate")
    void formatDateTest() {
        LocalDateTime date = LocalDateTime.of(2026, 5, 3, 15, 30);
        assertEquals("2026-05-03", mapper.formatDate(date));
        assertEquals("", mapper.formatDate(null));
    }

    @Test
    @DisplayName("?”í´??ë©”ì„œ???ŒìŠ¤??- formatDateTime")
    void formatDateTimeTest() {
        LocalDateTime dateTime = LocalDateTime.of(2026, 5, 3, 15, 30);
        assertEquals("2026-05-03 15:30", mapper.formatDateTime(dateTime));
        assertEquals("", mapper.formatDateTime(null));
    }

    @Test
    @DisplayName("?”í´??ë©”ì„œ???ŒìŠ¤??- blogIdToYn")
    void blogIdToYnTest() {
        assertEquals("Y", mapper.blogIdToYn("some-id"));
        assertEquals("N", mapper.blogIdToYn(null));
    }

    @Test
    @DisplayName("?”í´??ë©”ì„œ???ŒìŠ¤??- calculateExpired")
    void calculateExpiredTest() {
        assertEquals("N", mapper.calculateExpired(null));
        assertEquals("N", mapper.calculateExpired(""));
        
        // Past date
        assertEquals("Y", mapper.calculateExpired("20000101"));
        
        // Future date
        assertEquals("N", mapper.calculateExpired("20991231"));
    }

    @Test
    @DisplayName("?”í´??ë©”ì„œ???ŒìŠ¤??- parseDateTime")
    void parseDateTimeTest() {
        assertNull(mapper.parseDateTime(null));
        assertNull(mapper.parseDateTime(""));
        
        // ISO Date
        LocalDateTime date = mapper.parseDateTime("2026-05-03");
        assertNotNull(date);
        assertEquals(2026, date.getYear());
        assertEquals(5, date.getMonthValue());
        assertEquals(3, date.getDayOfMonth());
        
        // ISO DateTime
        LocalDateTime dateTime = mapper.parseDateTime("2026-05-03T15:30:00");
        assertNotNull(dateTime);
        assertEquals(15, dateTime.getHour());
        
        // Invalid Format
        assertNull(mapper.parseDateTime("invalid-date"));
    }

    @Test
    @DisplayName("Request -> Entity ë³€???ŒìŠ¤??(Default Values)")
    void toEntityDefaultTest() {
        BoardSaveRequest request = new BoardSaveRequest(
                "BBS1", "?œëª©", "?´ìš©", null, null, null, null, null, null, null, null, "USER1", "Name1", null
        );
        
        Board entity = mapper.toEntity(request, "BBS1", "USER1", "Name1", 10L);
        
        assertNotNull(entity);
        assertEquals("Y", entity.getUseYn());
        assertEquals("OPEN", entity.getQnaSttsCd());
        assertNull(entity.getEvntDt());
    }
}
