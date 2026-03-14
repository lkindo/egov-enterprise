package com.company.project.service.board.dto;

import com.company.project.domain.board.Board;
import com.company.project.domain.board.BoardDetailResult;
import com.company.project.domain.board.BoardSearchResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BoardDto 테스트")
class BoardDtoTest {

    @Test
    @DisplayName("Board 엔티티에서 BoardDto로 변환 테스트")
    void fromEntityTest() {
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
                .password("password")
                .build();
        // Since Board has no direct way to set createdDate (it's @CreatedDate), and from() uses getCreatedDate()
        // We might need to check if we can set it via builder or reflections if not available.
        // Actually, Board.java might have it. Let's check Board.java again.
        
        BoardDto dto = BoardDto.from(entity);

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getBbsId()).isEqualTo("BBS_001");
        assertThat(dto.getNttSj()).isEqualTo("Test Subject");
        assertThat(dto.getNttCn()).isEqualTo("Test Content");
        assertThat(dto.getNtcrNm()).isEqualTo("Tester");
        assertThat(dto.getInqireCo()).isEqualTo(10);
        assertThat(dto.getAtchFileId()).isEqualTo("FILE_001");
        assertThat(dto.getUseAt()).isEqualTo("Y");
    }

    @Test
    @DisplayName("BoardSearchResult에서 BoardDto로 변환 테스트")
    void fromSearchResultTest() {
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

        BoardDto dto = BoardDto.from(result);

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getBbsId()).isEqualTo("BBS_001");
        assertThat(dto.getNttSj()).isEqualTo("Search Result");
        assertThat(dto.getInqireCo()).isEqualTo(5);
        assertThat(dto.getCommentCo()).isEqualTo(3);
        assertThat(dto.getFrstRegisterPnttm()).isEqualTo(now);
    }

    @Test
    @DisplayName("BoardDetailResult에서 BoardDto로 변환 테스트")
    void fromDetailResultTest() {
        LocalDateTime now = LocalDateTime.of(2024, 3, 14, 12, 0);
        BoardDetailResult detail = BoardDetailResult.builder()
                .nttId(1L)
                .bbsId("BBS_001")
                .nttSj("Detail View")
                .nttCn("Full Content")
                .frstRegisterNm("Author")
                .inqireCo(20)
                .createdDate(now)
                .atchFileId("FILE_003")
                .nttNo(10L)
                .sortOrdr(10L)
                .parnts(0L)
                .replyAt("N")
                .replyLc(0)
                .ntceBgnde("20240101")
                .ntceEndde("20241231")
                .useAt("Y")
                .ntcrId("user01")
                .password("pwd")
                .secretAt("N")
                .bbsNm("Notice Board")
                .build();

        BoardDto dto = BoardDto.from(detail);

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getBbsId()).isEqualTo("BBS_001");
        assertThat(dto.getNttSj()).isEqualTo("Detail View");
        assertThat(dto.getNttCn()).isEqualTo("Full Content");
        assertThat(dto.getBbsNm()).isEqualTo("Notice Board");
    }

    @Test
    @DisplayName("만료 여부 플래그 테스트")
    void expiredFlagTest() {
        // This tests the private getExpiredFlag method via from methods
        LocalDateTime yesterday = LocalDateTime.now().minusDays(1);
        String yesterdayStr = yesterday.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        
        BoardSearchResult result = BoardSearchResult.builder()
                .ntceEndde(yesterdayStr)
                .build();
        
        BoardDto dto = BoardDto.from(result);
        assertThat(dto.getIsExpired()).isEqualTo("Y");

        BoardSearchResult result2 = BoardSearchResult.builder()
                .ntceEndde("99991231")
                .build();
        
        BoardDto dto2 = BoardDto.from(result2);
        assertThat(dto2.getIsExpired()).isEqualTo("N");
    }
}
