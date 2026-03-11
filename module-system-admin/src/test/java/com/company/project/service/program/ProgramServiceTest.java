package com.company.project.service.program;

import com.company.project.domain.program.Program;
import com.company.project.domain.program.ProgramRepository;
import com.company.project.service.program.dto.ProgramDto;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ProgramServiceTest {

    @Mock
    private ProgramRepository programRepository;

    @InjectMocks
    private ProgramService programService;

    private Program program;
    private ProgramDto programDto;

    @BeforeEach
    void setUp() {
        program = Program.builder()
                .progrmFileNm("testProgrm")
                .progrmStrePath("/test")
                .progrmKoreanNm("테스트프로그램")
                .url("/test/url")
                .progrmDc("테스트설명")
                .build();

        programDto = ProgramDto.builder()
                .progrmFileNm("testProgrm")
                .progrmStrePath("/test")
                .progrmKoreanNm("테스트프로그램")
                .url("/test/url")
                .progrmDc("테스트설명")
                .build();
    }

    @Test
    @DisplayName("프로그램 목록 조회 테스트 - 키워드 없음")
    void selectProgrmList_noKeyword() {
        // given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);
        
        Page<Program> page = new PageImpl<>(Arrays.asList(program));
        given(programRepository.findAll(any(Pageable.class))).willReturn(page);

        // when
        List<ProgramDto> result = programService.selectProgrmList(searchVO);

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getProgrmFileNm()).isEqualTo("testProgrm");
    }

    @Test
    @DisplayName("프로그램 목록 조회 테스트 - 키워드 있음")
    void selectProgrmList_withKeyword() {
        // given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);
        searchVO.setSearchKeyword("test");
        
        Page<Program> page = new PageImpl<>(Arrays.asList(program));
        given(programRepository.searchByKeyword(anyString(), any(Pageable.class))).willReturn(page);

        // when
        List<ProgramDto> result = programService.selectProgrmList(searchVO);

        // then
        assertThat(result).hasSize(1);
        verify(programRepository).searchByKeyword(anyString(), any(Pageable.class));
    }

    @Test
    @DisplayName("프로그램 상세 조회 테스트")
    void selectProgrm() {
        // given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setSearchKeyword("testProgrm");
        given(programRepository.findById("testProgrm")).willReturn(Optional.of(program));

        // when
        ProgramDto result = programService.selectProgrm(searchVO);

        // then
        assertThat(result.getProgrmFileNm()).isEqualTo("testProgrm");
    }

    @Test
    @DisplayName("프로그램 등록 테스트")
    void insertProgrm() {
        // when
        programService.insertProgrm(programDto);

        // then
        verify(programRepository).save(any(Program.class));
    }

    @Test
    @DisplayName("프로그램 수정 테스트")
    void updateProgrm() {
        // given
        given(programRepository.findById("testProgrm")).willReturn(Optional.of(program));

        // when
        programService.updateProgrm(programDto);

        // then
        verify(programRepository).findById("testProgrm");
    }

    @Test
    @DisplayName("프로그램 삭제 테스트")
    void deleteProgrm() {
        // when
        programService.deleteProgrm(programDto);

        // then
        verify(programRepository).deleteById("testProgrm");
    }

    @Test
    @DisplayName("프로그램 목록 멀티 삭제 테스트")
    void deleteProgrmManageList() {
        // when
        programService.deleteProgrmManageList("test1,test2");

        // then
        verify(programRepository).deleteAllByIdInBatch(any());
    }
}
