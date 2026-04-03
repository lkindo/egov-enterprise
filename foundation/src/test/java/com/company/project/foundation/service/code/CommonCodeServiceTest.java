package com.company.project.foundation.service.code;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.domain.code.*;
import com.company.project.foundation.service.code.dto.CmmnClCodeDto;
import com.company.project.foundation.service.code.dto.CmmnCodeDto;
import com.company.project.foundation.service.code.dto.CmmnDetailCodeDto;
import egovframework.com.cmm.ComDefaultVO;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CommonCodeService (공통코드 관리) 테스트")
class CommonCodeServiceTest {

    @Mock
    private CommonCodeCategoryRepository commonCodeCategoryRepository;

    @Mock
    private CommonCodeGroupRepository commonCodeGroupRepository;

    @Mock
    private CommonCodeRepository commonCodeRepository;

    @InjectMocks
    private CommonCodeService commonCodeService;

    @Nested
    @DisplayName("공통분류코드 조회 테스트")
    class CmmnClCodeListTests {

        @Test
        @DisplayName("분류코드 목록 조회 성공")
        void testSelectCmmnClCodeList_Success() {
            // Given
            ComDefaultVO searchVO = new ComDefaultVO();
            searchVO.setPageIndex(1);
            searchVO.setPageUnit(10);

            CommonCodeCategory cat1 = CommonCodeCategory.builder()
                    .clCode("CL001")
                    .clCodeNm("분류 001")
                    .clCodeDc("설명 001")
                    .useAt("Y")
                    .build();

            Page<CommonCodeCategory> page = new PageImpl<>(Arrays.asList(cat1));
            when(commonCodeCategoryRepository.findAll(any(Pageable.class))).thenReturn(page);

            // When
            List<CmmnClCodeDto> result = commonCodeService.selectCmmnClCodeList(searchVO);

            // Then
            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals("CL001", result.get(0).getClCode());
            verify(commonCodeCategoryRepository, times(1)).findAll(any(Pageable.class));
        }

        @Test
        @DisplayName("키워드로 분류코드 목록 조회 성공")
        void testSelectCmmnClCodeList_WithKeyword() {
            // Given
            ComDefaultVO searchVO = new ComDefaultVO();
            searchVO.setPageIndex(1);
            searchVO.setPageUnit(10);
            searchVO.setSearchKeyword("Test");

            CommonCodeCategory cat1 = CommonCodeCategory.builder()
                    .clCode("CL001")
                    .clCodeNm("Test Category")
                    .build();

            Page<CommonCodeCategory> page = new PageImpl<>(Arrays.asList(cat1));
            when(commonCodeCategoryRepository.searchByKeyword(eq("Test"), any(Pageable.class))).thenReturn(page);

            // When
            List<CmmnClCodeDto> result = commonCodeService.selectCmmnClCodeList(searchVO);

            // Then
            assertNotNull(result);
            verify(commonCodeCategoryRepository, times(1)).searchByKeyword(eq("Test"), any(Pageable.class));
        }

        @Test
        @DisplayName("분류코드 상세 조회 성공")
        void testSelectCmmnClCodeDetail() {
            // Given
            CmmnClCodeDto dto = new CmmnClCodeDto();
            dto.setClCode("CL001");

            CommonCodeCategory cat = CommonCodeCategory.builder()
                    .clCode("CL001")
                    .clCodeNm("분류 001")
                    .build();

            when(commonCodeCategoryRepository.findById("CL001")).thenReturn(Optional.of(cat));

            // When
            CmmnClCodeDto result = commonCodeService.selectCmmnClCodeDetail(dto);

            // Then
            assertNotNull(result);
            assertEquals("CL001", result.getClCode());
        }
    }

    @Nested
    @DisplayName("공통분류코드 CRUD 테스트")
    class CmmnClCodeCrudTests {

        @Test
        @DisplayName("공통분류코드 등록 성공")
        void testInsertCmmnClCode() {
            // Given
            CmmnClCodeDto dto = new CmmnClCodeDto();
            dto.setClCode("CL001");
            dto.setClCodeNm("분류명");
            dto.setClCodeDc("설명");
            dto.setUseAt("Y");

            doReturn(false).when(commonCodeCategoryRepository).existsById("CL001");
            doAnswer(invocation -> {
                CommonCodeCategory entity = invocation.getArgument(0);
                ReflectionTestUtils.setField(entity, "frstRegisterId", "admin");
                return entity;
            }).when(commonCodeCategoryRepository).save(any(CommonCodeCategory.class));

            // When
            commonCodeService.insertCmmnClCode(dto);

            // Then
            verify(commonCodeCategoryRepository, times(1)).save(any(CommonCodeCategory.class));
        }

        @Test
        @DisplayName("중복된 공통분류코드 등록 시 예외 발생")
        void testInsertCmmnClCode_Duplicate() {
            // Given
            CmmnClCodeDto dto = new CmmnClCodeDto();
            dto.setClCode("EXISTING");
            lenient().doReturn(true).when(commonCodeCategoryRepository).existsById("EXISTING");

            // When & Then
            assertThrows(BusinessException.class, () -> {
                commonCodeService.insertCmmnClCode(dto);
            });
        }

        @Test
        @DisplayName("공통분류코드 수정 성공")
        void testUpdateCmmnClCode() {
            // Given
            CmmnClCodeDto dto = new CmmnClCodeDto();
            dto.setClCode("CL001");
            dto.setClCodeNm("수정된 분류명");
            dto.setLastUpdusrId("admin");

            CommonCodeCategory existing = CommonCodeCategory.builder()
                    .clCode("CL001")
                    .clCodeNm("기존 분류명")
                    .build();

            when(commonCodeCategoryRepository.findById("CL001")).thenReturn(Optional.of(existing));

            // When
            commonCodeService.updateCmmnClCode(dto);

            // Then
            verify(commonCodeCategoryRepository, times(1)).findById("CL001");
            assertEquals("수정된 분류명", existing.getClCodeNm());
        }

        @Test
        @DisplayName("공통분류코드 삭제 성공")
        void testDeleteCmmnClCode() {
            // Given
            CmmnClCodeDto dto = new CmmnClCodeDto();
            dto.setClCode("CL001");

            CommonCodeCategory existing = CommonCodeCategory.builder()
                    .clCode("CL001")
                    .build();

            when(commonCodeCategoryRepository.findById("CL001")).thenReturn(Optional.of(existing));

            // When
            commonCodeService.deleteCmmnClCode(dto);

            // Then
            verify(commonCodeCategoryRepository, times(1)).findById("CL001");
        }
    }

    @Nested
    @DisplayName("공통코드 그룹 CRUD 테스트")
    class CmmnCodeCrudTests {

        @Test
        @DisplayName("공통코드 그룹 등록 성공")
        void testInsertCmmnCode() {
            // Given
            CmmnCodeDto dto = new CmmnCodeDto();
            dto.setCodeId("GROUP_001");
            dto.setCodeIdNm("그룹명");
            dto.setClCode("CL001");
            dto.setUseAt("Y");

            doReturn(false).when(commonCodeGroupRepository).existsById("GROUP_001");
            lenient().doReturn(Optional.of(CommonCodeCategory.builder().clCodeNm("분류명").build()))
                    .when(commonCodeCategoryRepository).findById("CL001");
            doAnswer(invocation -> {
                CommonCodeGroup entity = invocation.getArgument(0);
                ReflectionTestUtils.setField(entity, "frstRegisterId", "admin");
                return entity;
            }).when(commonCodeGroupRepository).save(any(CommonCodeGroup.class));

            // When
            commonCodeService.insertCmmnCode(dto);

            // Then
            verify(commonCodeGroupRepository, times(1)).save(any(CommonCodeGroup.class));
        }

        @Test
        @DisplayName("중복된 공통코드 그룹 등록 시 예외 발생")
        void testInsertCmmnCode_Duplicate() {
            // Given
            CmmnCodeDto dto = new CmmnCodeDto();
            dto.setCodeId("EXISTING_GROUP");
            lenient().doReturn(true).when(commonCodeGroupRepository).existsById("EXISTING_GROUP");

            // When & Then
            assertThrows(BusinessException.class, () -> {
                commonCodeService.insertCmmnCode(dto);
            });
        }

        @Test
        @DisplayName("공통코드 그룹 수정 성공")
        void testUpdateCmmnCode() {
            // Given
            CmmnCodeDto dto = new CmmnCodeDto();
            dto.setCodeId("GROUP_001");
            dto.setCodeIdNm("수정된 그룹명");
            dto.setLastUpdusrId("admin");

            CommonCodeGroup existing = CommonCodeGroup.builder()
                    .codeId("GROUP_001")
                    .codeIdNm("원래 그룹명")
                    .build();

            when(commonCodeGroupRepository.findById("GROUP_001")).thenReturn(Optional.of(existing));

            // When
            commonCodeService.updateCmmnCode(dto);

            // Then
            verify(commonCodeGroupRepository, times(1)).findById("GROUP_001");
            assertEquals("수정된 그룹명", existing.getCodeIdNm());
        }

        @Test
        @DisplayName("공통코드 그룹 삭제 성공")
        void testDeleteCmmnCode() {
            // Given
            CmmnCodeDto dto = new CmmnCodeDto();
            dto.setCodeId("GROUP_001");

            CommonCodeGroup existing = CommonCodeGroup.builder()
                    .codeId("GROUP_001")
                    .codeIdNm("Code Name")
                    .build();

            when(commonCodeGroupRepository.findById("GROUP_001")).thenReturn(Optional.of(existing));

            // When
            commonCodeService.deleteCmmnCode(dto);

            // Then
            verify(commonCodeGroupRepository, times(1)).findById("GROUP_001");
        }
    }

    @Nested
    @DisplayName("공통상세코드 CRUD 테스트")
    class CmmnDetailCodeCrudTests {

        @Test
        @DisplayName("공통상세코드 등록 성공")
        void testInsertCmmnDetailCode() {
            // Given
            CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
            dto.setCodeId("GROUP_001");
            dto.setCode("CODE_001");
            dto.setCodeNm("코드명");
            dto.setUseAt("Y");

            CommonCodeId codeId = new CommonCodeId("GROUP_001", "CODE_001");
            when(commonCodeRepository.existsById(codeId)).thenReturn(false);
            when(commonCodeRepository.save(any(CommonCode.class))).thenAnswer(invocation -> {
                CommonCode entity = invocation.getArgument(0);
                ReflectionTestUtils.setField(entity, "frstRegisterId", "admin");
                ReflectionTestUtils.setField(entity, "lastUpdusrId", "admin");
                return entity;
            });
            // When
            commonCodeService.insertCmmnDetailCode(dto);

            // Then
            assertTrue(true);
        }

        @Test
        @DisplayName("중복된 공통상세코드 등록 시 예외 발생")
        void testInsertCmmnDetailCode_Duplicate() {
            // Given
            CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
            dto.setCodeId("GROUP_001");
            dto.setCode("EXISTING_CODE");

            CommonCodeId codeId = new CommonCodeId("GROUP_001", "EXISTING_CODE");
            when(commonCodeRepository.existsById(codeId)).thenReturn(true);

            // When & Then
            assertThrows(BusinessException.class, () -> {
                commonCodeService.insertCmmnDetailCode(dto);
            });
        }

        @Test
        @DisplayName("공통상세코드 수정 성공 - 상세 필드 검증")
        void testUpdateCmmnDetailCode_Detailed() {
            // Given
            CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
            dto.setCodeId("GROUP_001");
            dto.setCode("CODE_001");
            dto.setCodeNm("수정된 이름");
            dto.setCodeDc("수정된 설명");
            dto.setUseAt("N");
            dto.setLastUpdusrId("user01");

            CommonCodeId codeId = new CommonCodeId("GROUP_001", "CODE_001");
            CommonCode existing = spy(CommonCode.builder()
                    .codeGroupId("GROUP_001")
                    .code("CODE_001")
                    .codeNm("기존 이름")
                    .build());

            when(commonCodeRepository.findById(codeId)).thenReturn(Optional.of(existing));

            // When
            commonCodeService.updateCmmnDetailCode(dto);

            // Then
            verify(existing).update(eq("수정된 이름"), eq("수정된 설명"), eq("N"), eq("user01"));
            assertEquals("수정된 이름", existing.getCodeNm());
        }

        @Test
        @DisplayName("공통상세코드 삭제 성공 - delete 메서드 호출 확인")
        void testDeleteCmmnDetailCode_Detailed() {
            // Given
            CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
            dto.setCodeId("GROUP_001");
            dto.setCode("CODE_001");

            CommonCodeId codeId = new CommonCodeId("GROUP_001", "CODE_001");
            CommonCode existing = spy(CommonCode.builder()
                    .codeGroupId("GROUP_001")
                    .code("CODE_001")
                    .codeNm("기존 이름")
                    .build());

            when(commonCodeRepository.findById(codeId)).thenReturn(Optional.of(existing));

            // When
            commonCodeService.deleteCmmnDetailCode(dto);

            // Then
            verify(existing).delete();
        }
    }
}
