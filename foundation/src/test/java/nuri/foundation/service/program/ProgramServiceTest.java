package nuri.foundation.service.program;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.program.Program;
import nuri.foundation.domain.program.ProgramRepository;
import nuri.foundation.service.program.dto.ProgramDto;
import nuri.foundation.domain.common.BaseSearchDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProgramService (프로그램 관리) 테스트")
class ProgramServiceTest {

    @Mock
    private ProgramRepository programRepository;

    @InjectMocks
    private ProgramService programService;

    @Nested
    @DisplayName("프로그램 목록 조회 테스트")
    class SelectProgramListTests {

        @Test
        @DisplayName("프로그램 목록 조회 성공")
        void testSelectProgrmList_Success() {
            // Given
            BaseSearchDto searchVO = new BaseSearchDto();
            searchVO.setPageIndex(1);
            searchVO.setPageUnit(10);

            Program prog1 = Program.builder()
                    .prgrmFileNm("Prog001")
                    .prgrmKornNm("프로그램 001")
                    .build();

            Page<Program> page = new PageImpl<>(Arrays.asList(prog1));
            when(programRepository.findAll(any(Pageable.class))).thenReturn(page);

            // When
            List<ProgramDto> result = programService.selectProgrmList(searchVO);

            // Then
            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals("Prog001", result.get(0).getPrgrmFileNm());
            verify(programRepository, times(1)).findAll(any(Pageable.class));
        }

        @Test
        @DisplayName("키워드로 프로그램 목록 조회 성공")
        void testSelectProgrmList_WithKeyword() {
            // Given
            BaseSearchDto searchVO = new BaseSearchDto();
            searchVO.setPageIndex(1);
            searchVO.setPageUnit(10);
            searchVO.setSearchKeyword("Test");

            Program prog1 = Program.builder()
                    .prgrmFileNm("Prog001")
                    .prgrmKornNm("Test Program")
                    .build();

            Page<Program> page = new PageImpl<>(Arrays.asList(prog1));
            when(programRepository.searchByKeyword(eq("Test"), any(Pageable.class))).thenReturn(page);

            // When
            List<ProgramDto> result = programService.selectProgrmList(searchVO);

            // Then
            assertNotNull(result);
            assertEquals(1, result.size());
            verify(programRepository, times(1)).searchByKeyword(eq("Test"), any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("프로그램 상세 조회 테스트")
    class SelectProgramDetailTests {

        @Test
        @DisplayName("프로그램 상세 조회 성공")
        void testSelectProgrmById_Success() {
            // Given
            String progName = "Prog001";
            Program prog = Program.builder()
                    .prgrmFileNm(progName)
                    .prgrmKornNm("프로그램 001")
                    .build();

            when(programRepository.findById(progName)).thenReturn(Optional.of(prog));

            // When
            ProgramDto result = programService.selectProgrmById(progName);

            // Then
            assertNotNull(result);
            assertEquals(progName, result.getPrgrmFileNm());
        }

        @Test
        @DisplayName("존재하지 않는 프로그램 조회 시 예외 발생")
        void testSelectProgrmById_NotFound() {
            // Given
            String progName = "NON_EXIST";
            when(programRepository.findById(progName)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(BusinessException.class, () -> {
                programService.selectProgrmById(progName);
            });
        }
    }

    @Nested
    @DisplayName("프로그램 CRUD 테스트")
    class ProgramCrudTests {

        @Test
        @DisplayName("프로그램 등록 성공")
        void testInsertProgrm() {
            // Given
            ProgramDto dto = ProgramDto.builder()
                    .prgrmFileNm("NewProg")
                    .prgrmKornNm("신규 프로그램")
                    .build();

            // When
            programService.insertProgrm(dto);

            // Then
            verify(programRepository, times(1)).save(any(Program.class));
        }

        @Test
        @DisplayName("프로그램 수정 성공")
        void testUpdateProgrm() {
            // Given
            ProgramDto dto = ProgramDto.builder()
                    .prgrmFileNm("Prog001")
                    .prgrmKornNm("수정된 이름")
                    .build();

            Program existing = Program.builder()
                    .prgrmFileNm("Prog001")
                    .prgrmKornNm("기존 이름")
                    .build();

            when(programRepository.findById("Prog001")).thenReturn(Optional.of(existing));

            // When
            programService.updateProgrm(dto);

            // Then
            assertEquals("수정된 이름", existing.getPrgrmKornNm());
        }

        @Test
        @DisplayName("프로그램 삭제 성공")
        void testDeleteProgrm() {
            // Given
            ProgramDto dto = ProgramDto.builder()
                    .prgrmFileNm("Prog001")
                    .build();

            // When
            programService.deleteProgrm(dto);

            // Then
            verify(programRepository, times(1)).deleteById("Prog001");
        }

        @Test
        @DisplayName("프로그램 목록 멀티 삭제 성공")
        void testDeleteProgrmManageList() {
            // Given
            String ids = "Prog001,Prog002";

            // When
            programService.deleteProgrmManageList(ids);

            // Then
            verify(programRepository, times(1)).deleteAllByIdInBatch(anyList());
        }
    }
}
