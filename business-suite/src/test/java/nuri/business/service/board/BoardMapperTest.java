package nuri.business.service.board;

import nuri.business.domain.board.Board;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardSaveRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("BoardMapper 단위 테스트")
class BoardMapperTest {

    private final BoardMapper mapper = Mappers.getMapper(BoardMapper.class);

    @Test
    @DisplayName("Entity -> DTO 변환 테스트")
    void toDtoTest() {
        Board board = Board.builder()
                .pstId("1")
                .pstTtl("?œ紐")
                .crtDt(LocalDateTime.of(2026, 5, 3, 10, 0))
                .blogId("BLOG1")
                .build();

        BoardDto dto = mapper.toDto(board);

        assertNotNull(dto);
        assertEquals("1", dto.getPstId());
        assertEquals("1", dto.getPstId());
        assertEquals("?œ紐", dto.getPstTtl());
        assertEquals(LocalDateTime.of(2026, 5, 3, 10, 0), dto.getCrtDt());
    }
    @Test
    @DisplayName("유틸리티 메서드 테스트 - formatDate")
    void formatDateTest() {
        LocalDateTime date = LocalDateTime.of(2026, 5, 3, 15, 30);
        assertEquals("2026-05-03", mapper.formatDate(date));
        assertEquals("", mapper.formatDate(null));
    }

    @Test
    @DisplayName("유틸리티 메서드 테스트 - formatDateTime")
    void formatDateTimeTest() {
        LocalDateTime dateTime = LocalDateTime.of(2026, 5, 3, 15, 30);
        assertEquals("2026-05-03 15:30", mapper.formatDateTime(dateTime));
        assertEquals("", mapper.formatDateTime(null));
    }

    @Test
    @DisplayName("유틸리티 메서드 테스트 - blogIdToYn")
    void blogIdToYnTest() {
        assertEquals("Y", mapper.blogIdToYn("some-id"));
        assertEquals("N", mapper.blogIdToYn(null));
    }

    @Test
    @DisplayName("유틸리티 메서드 테스트 - calculateExpired")
    void calculateExpiredTest() {
        assertEquals("N", mapper.calculateExpired(null));
        assertEquals("N", mapper.calculateExpired(""));
        
        // Past date
        assertEquals("Y", mapper.calculateExpired("20000101"));
        
        // Future date
        assertEquals("N", mapper.calculateExpired("20991231"));
    }

    @Test
    @DisplayName("유틸리티 메서드 테스트 - parseDateTime")
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
    @DisplayName("Request -> Entity 변환 테스트 (Default Values)")
    void toEntityDefaultTest() {
        BoardSaveRequest request = new BoardSaveRequest(
                "BBS1", "?œ紐", "?댁š", null, null, null, null, null, null, null, null, "USER1", "Name1", null
        );
        
        Board entity = mapper.toEntity(request, "BBS1", "USER1", "Name1", 10L);
        
        assertNotNull(entity);
        assertEquals("Y", entity.getUseYn());
        assertEquals("OPEN", entity.getQnaSttsCd());
        assertNull(entity.getEvntDt());
    }
}
