package com.company.project.web.adapter;

import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.board.dto.BoardMasterDto;
import egovframework.com.cop.bbs.service.BoardVO;
import egovframework.com.cop.bbs.service.BoardMasterVO;
import egovframework.com.cop.bbs.service.BoardMaster;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNull;

class BoardAdapterTest {

    // Test for toVO(BoardDto dto)

    @Test
    void toVO_ValidDto_ReturnsVO() {
        // Arrange
        LocalDateTime now = LocalDateTime.now();
        BoardDto dto = BoardDto.builder()
                .id(1L)
                .bbsId("BBS_001")
                .nttNo(100L)
                .nttSj("Test Subject")
                .nttCn("Test Content")
                .ntcrId("user1")
                .ntcrNm("User One")
                .inqireCo(5)
                .frstRegisterPnttm(now)
                .frstRegisterId("admin")
                .lastUpdtPnttm(now)
                .lastUpdusrId("admin")
                .atchFileId("FILE_001")
                .parnts("0")
                .replyLc(1)
                .sortOrdr(2L)
                .ntceBgnde("20231001")
                .ntceEndde("20231031")
                .useAt("Y")
                .password("pass")
                .secretAt("N")
                .build();

        // Act
        BoardVO vo = BoardAdapter.toVO(dto);

        // Assert
        assertThat(vo).isNotNull();
        assertThat(vo.getNttId()).isEqualTo(dto.getId());
        assertThat(vo.getBbsId()).isEqualTo(dto.getBbsId());
        assertThat(vo.getNttNo()).isEqualTo(dto.getNttNo());
        assertThat(vo.getNttSj()).isEqualTo(dto.getNttSj());
        assertThat(vo.getNttCn()).isEqualTo(dto.getNttCn());
        assertThat(vo.getNtcrId()).isEqualTo(dto.getNtcrId());
        assertThat(vo.getNtcrNm()).isEqualTo(dto.getNtcrNm());
        assertThat(vo.getInqireCo()).isEqualTo(dto.getInqireCo());
        assertThat(vo.getFrstRegisterPnttm()).isEqualTo(dto.getFrstRegisterPnttm().toString());
        assertThat(vo.getFrstRegisterId()).isEqualTo(dto.getFrstRegisterId());
        assertThat(vo.getLastUpdusrPnttm()).isEqualTo(dto.getLastUpdtPnttm().toString());
        assertThat(vo.getLastUpdusrId()).isEqualTo(dto.getLastUpdusrId());
        assertThat(vo.getAtchFileId()).isEqualTo(dto.getAtchFileId());
        assertThat(vo.getParnts()).isEqualTo(dto.getParnts());
        assertThat(vo.getReplyLc()).isEqualTo(dto.getReplyLc().toString());
        assertThat(vo.getSortOrdr()).isEqualTo(dto.getSortOrdr());
        assertThat(vo.getNtceBgnde()).isEqualTo(dto.getNtceBgnde());
        assertThat(vo.getNtceEndde()).isEqualTo(dto.getNtceEndde());
        assertThat(vo.getUseAt()).isEqualTo(dto.getUseAt());
        assertThat(vo.getPassword()).isEqualTo(dto.getPassword());
        assertThat(vo.getSecretAt()).isEqualTo(dto.getSecretAt());
    }

    @Test
    void toVO_NullDto_ReturnsNull() {
        assertNull(BoardAdapter.toVO(null));
    }

    @Test
    void toVO_OptionalFields_HandlesDefaults() {
        // Arrange
        BoardDto dto = BoardDto.builder()
                .id(1L) // Required for unboxing
                .nttNo(10L) // Required for unboxing
                .inqireCo(null)
                .replyLc(null)
                .frstRegisterPnttm(null)
                .lastUpdtPnttm(null)
                .sortOrdr(0L) // Providing non-null sortOrdr to avoid potential NPE
                .build();

        // Act
        BoardVO vo = BoardAdapter.toVO(dto);

        // Assert
        assertThat(vo).isNotNull();
        assertThat(vo.getInqireCo()).isZero(); // Default 0
        assertThat(vo.getReplyLc()).isEqualTo("0"); // Default "0"
        assertThat(vo.getFrstRegisterPnttm()).isEmpty(); // Assuming BoardVO initializes to ""
        assertThat(vo.getLastUpdusrPnttm()).isEmpty(); // Assuming BoardVO initializes to ""
    }

    // Test for toVOList(List<BoardDto> dtoList)

    @Test
    void toVOList_ValidList_ReturnsVOList() {
        // Arrange
        BoardDto dto = BoardDto.builder()
                .id(1L)
                .nttNo(10L)
                .sortOrdr(0L)
                .build();
        List<BoardDto> list = List.of(dto);

        // Act
        List<BoardVO> voList = BoardAdapter.toVOList(list);

        // Assert
        assertThat(voList).hasSize(1);
        assertThat(voList.get(0).getNttId()).isEqualTo(1L);
    }

    @Test
    void toVOList_NullList_ReturnsEmptyList() {
        assertThat(BoardAdapter.toVOList(null)).isEmpty();
    }

    @Test
    void toVOList_EmptyList_ReturnsEmptyList() {
        assertThat(BoardAdapter.toVOList(List.of())).isEmpty();
    }

    // Test for toMasterVO(BoardMasterDto dto)

    @Test
    void toMasterVO_ValidDto_ReturnsVO() {
        // Arrange
        LocalDateTime now = LocalDateTime.now();
        BoardMasterDto dto = BoardMasterDto.builder()
                .bbsId("BBS_MASTER_01")
                .bbsNm("Master Board")
                .bbsIntrcn("Intro")
                .bbsTyCode("TYPE01")
                .replyPosblAt("Y")
                .fileAtchPosblAt("Y")
                .atchPosblFileNumber(3)
                .atchPosblFileSize(1024L)
                .tmplatId("TMP_01")
                .frstRegisterId("admin")
                .frstRegisterPnttm(now)
                .lastUpdusrId("admin")
                .lastUpdusrPnttm(now)
                .useAt("Y")
                .cmmntyId("CMM_01")
                .blogId("BLOG_01")
                .blogAt("Y")
                .authFlag("AUTH_YES")
                .tmplatCours("/template/path")
                .build();

        // Act
        BoardMasterVO vo = BoardAdapter.toMasterVO(dto);

        // Assert
        assertThat(vo).isNotNull();
        assertThat(vo.getBbsId()).isEqualTo(dto.getBbsId());
        assertThat(vo.getBbsNm()).isEqualTo(dto.getBbsNm());
        assertThat(vo.getBbsIntrcn()).isEqualTo(dto.getBbsIntrcn());
        assertThat(vo.getBbsTyCode()).isEqualTo(dto.getBbsTyCode());
        assertThat(vo.getReplyPosblAt()).isEqualTo(dto.getReplyPosblAt());
        assertThat(vo.getFileAtchPosblAt()).isEqualTo(dto.getFileAtchPosblAt());
        assertThat(vo.getAtchPosblFileNumber()).isEqualTo(dto.getAtchPosblFileNumber());
        assertThat(vo.getAtchPosblFileSize()).isEqualTo(String.valueOf(dto.getAtchPosblFileSize()));
        assertThat(vo.getTmplatId()).isEqualTo(dto.getTmplatId());
        assertThat(vo.getFrstRegisterId()).isEqualTo(dto.getFrstRegisterId());
        assertThat(vo.getFrstRegisterPnttm()).isEqualTo(dto.getFrstRegisterPnttm().toString());
        assertThat(vo.getLastUpdusrId()).isEqualTo(dto.getLastUpdusrId());
        assertThat(vo.getLastUpdusrPnttm()).isEqualTo(dto.getLastUpdusrPnttm().toString());
        assertThat(vo.getUseAt()).isEqualTo(dto.getUseAt());
        assertThat(vo.getCmmntyId()).isEqualTo(dto.getCmmntyId());
        assertThat(vo.getBlogId()).isEqualTo(dto.getBlogId());
        assertThat(vo.getBlogAt()).isEqualTo(dto.getBlogAt());
        assertThat(vo.getAuthFlag()).isEqualTo(dto.getAuthFlag());
        assertThat(vo.getTmplatCours()).isEqualTo(dto.getTmplatCours());
    }

    @Test
    void toMasterVO_NullDto_ReturnsNull() {
        assertNull(BoardAdapter.toMasterVO(null));
    }

    @Test
    void toMasterVO_NullOptionalFields_HandlesDefaults() {
        // Arrange
        BoardMasterDto dto = BoardMasterDto.builder()
                .atchPosblFileNumber(null)
                .atchPosblFileSize(null)
                .frstRegisterPnttm(null)
                .lastUpdusrPnttm(null)
                .build();

        // Act
        BoardMasterVO vo = BoardAdapter.toMasterVO(dto);

        // Assert
        assertThat(vo).isNotNull();
        assertThat(vo.getAtchPosblFileNumber()).isZero();
        assertThat(vo.getAtchPosblFileSize()).isEqualTo("0");
        assertThat(vo.getFrstRegisterPnttm()).isEmpty();
        assertThat(vo.getLastUpdusrPnttm()).isEmpty();
    }

    // Test for toMasterDto(BoardMaster vo)

    @Test
    void toMasterDto_ValidVO_ReturnsDto() {
        // Arrange
        BoardMaster vo = new BoardMaster();
        vo.setBbsId("BBS_MASTER_01");
        vo.setBbsNm("Master Board");
        vo.setBbsIntrcn("Intro");
        vo.setBbsTyCode("TYPE01");
        vo.setReplyPosblAt("Y");
        vo.setFileAtchPosblAt("Y");
        vo.setAtchPosblFileNumber(3);
        vo.setAtchPosblFileSize("1024");
        vo.setTmplatId("TMP_01");
        vo.setFrstRegisterId("admin");
        vo.setLastUpdusrId("admin");
        vo.setUseAt("Y");
        vo.setCmmntyId("CMM_01");
        vo.setBlogId("BLOG_01");
        vo.setBlogAt("Y");

        // Act
        BoardMasterDto dto = BoardAdapter.toMasterDto(vo);

        // Assert
        assertThat(dto).isNotNull();
        assertThat(dto.getBbsId()).isEqualTo(vo.getBbsId());
        assertThat(dto.getBbsNm()).isEqualTo(vo.getBbsNm());
        assertThat(dto.getBbsIntrcn()).isEqualTo(vo.getBbsIntrcn());
        assertThat(dto.getBbsTyCode()).isEqualTo(vo.getBbsTyCode());
        assertThat(dto.getBbsAttrbCode()).isEqualTo("BBSA01"); // Default
        assertThat(dto.getReplyPosblAt()).isEqualTo(vo.getReplyPosblAt());
        assertThat(dto.getFileAtchPosblAt()).isEqualTo(vo.getFileAtchPosblAt());
        assertThat(dto.getAtchPosblFileNumber()).isEqualTo(vo.getAtchPosblFileNumber());
        assertThat(dto.getAtchPosblFileSize()).isEqualTo(1024L);
        assertThat(dto.getTmplatId()).isEqualTo(vo.getTmplatId());
        assertThat(dto.getFrstRegisterId()).isEqualTo(vo.getFrstRegisterId());
        assertThat(dto.getLastUpdusrId()).isEqualTo(vo.getLastUpdusrId());
        assertThat(dto.getUseAt()).isEqualTo(vo.getUseAt());
        assertThat(dto.getCmmntyId()).isEqualTo(vo.getCmmntyId());
        assertThat(dto.getBlogId()).isEqualTo(vo.getBlogId());
        assertThat(dto.getBlogAt()).isEqualTo(vo.getBlogAt());
    }

    @Test
    void toMasterDto_NullVO_ReturnsNull() {
        assertNull(BoardAdapter.toMasterDto(null));
    }

    @Test
    void toMasterDto_InvalidFileSize_ReturnsDefault() {
        // Arrange
        BoardMaster vo = new BoardMaster();
        vo.setAtchPosblFileSize("invalid-size");

        // Act
        BoardMasterDto dto = BoardAdapter.toMasterDto(vo);

        // Assert
        assertThat(dto).isNotNull();
        assertThat(dto.getAtchPosblFileSize()).isZero();
    }
}
