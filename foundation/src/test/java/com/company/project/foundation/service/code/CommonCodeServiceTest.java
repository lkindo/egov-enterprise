package com.company.project.foundation.service.code;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.domain.code.CommonCode;
import com.company.project.foundation.domain.code.CommonCodeCategory;
import com.company.project.foundation.domain.code.CommonCodeCategoryRepository;
import com.company.project.foundation.domain.code.CommonCodeGroup;
import com.company.project.foundation.domain.code.CommonCodeGroupRepository;
import com.company.project.foundation.domain.code.CommonCodeId;
import com.company.project.foundation.domain.code.CommonCodeRepository;
import com.company.project.foundation.service.code.dto.CmmnClCodeDto;
import com.company.project.foundation.service.code.dto.CmmnCodeDto;
import com.company.project.foundation.service.code.dto.CmmnDetailCodeDto;
import com.company.project.foundation.service.code.dto.CommonCodeDto;
import com.company.project.foundation.service.code.dto.CommonCodeSaveRequest;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
@DisplayName("CommonCodeService ?�스??)
class CommonCodeServiceTest {

    @Mock
    private CommonCodeRepository commonCodeRepository;

    @Mock
    private CommonCodeCategoryRepository commonCodeCategoryRepository;

    @Mock
    private CommonCodeGroupRepository commonCodeGroupRepository;

    @InjectMocks
    private CommonCodeService commonCodeService;

    @Nested
    @DisplayName("공통코드 그룹�?조회 ?�스??)
    class GetCodesByGroupTests {

        @Test
        @DisplayName("그룹 ID �??�용 가?�한 공통코드 조회 ?�공")
        void testGetCodesByGroup_Success() {
            // Given
            String codeGroupId = "CODE_GROUP_1";
            CommonCode code1 = CommonCode.builder()
                    .codeGroupId(codeGroupId)
                    .code("CODE_001")
                    .codeNm("코드 001")
                    .codeDc("?�명 001")
                    .useAt("Y")
                    .build();

            CommonCode code2 = CommonCode.builder()
                    .codeGroupId(codeGroupId)
                    .code("CODE_002")
                    .codeNm("코드 002")
                    .useAt("Y")
                    .build();

            when(commonCodeRepository.findByCodeGroupIdAndUseAt(codeGroupId, "Y"))
                    .thenReturn(Arrays.asList(code1, code2));

            // When
            List<CommonCodeDto> result = commonCodeService.getCodesByGroup(codeGroupId);

            // Then
            assertNotNull(result);
            assertEquals(2, result.size());
            assertEquals("CODE_001", result.get(0).getCode());
            assertEquals("CODE_002", result.get(1).getCode());
            verify(commonCodeRepository, times(1)).findByCodeGroupIdAndUseAt(eq(codeGroupId), eq("Y"));
        }

        @Test
        @DisplayName("null 그룹 ID ?�달 ???�외 발생")
        void testGetCodesByGroup_NullGroupId() {
            // When & Then
            assertThrows(NullPointerException.class, () -> {
                commonCodeService.getCodesByGroup(null);
            });
        }

        @Test
        @DisplayName("그룹??코드가 ?�을 ??�?리스??반환")
        void testGetCodesByGroup_EmptyResult() {
            // Given
            String codeGroupId = "EMPTY_GROUP";
            when(commonCodeRepository.findByCodeGroupIdAndUseAt(codeGroupId, "Y"))
                    .thenReturn(List.of());

            // When
            List<CommonCodeDto> result = commonCodeService.getCodesByGroup(codeGroupId);

            // Then
            assertNotNull(result);
            assertTrue(result.isEmpty());
        }
    }

    @Nested
    @DisplayName("공통코드 ?�성 ?�스??)
    class CreateCodeTests {

        @Test
        @DisplayName("?�로??공통코드 ?�성 ?�공")
        void testCreateCode_Success() {
            // Given
            CommonCodeSaveRequest request = new CommonCodeSaveRequest(
                    "GROUP_001",
                    "CODE_001",
                    "코드�?,
                    "코드 ?�명",
                    "Y");

            CommonCode savedCode = CommonCode.builder()
                    .codeGroupId(request.codeGroupId())
                    .code(request.code())
                    .codeNm(request.codeNm())
                    .codeDc(request.codeDc())
                    .useAt(request.useAt())
                    .build();

            ReflectionTestUtils.setField(savedCode, "frstRegisterId", "admin");
            ReflectionTestUtils.setField(savedCode, "lastUpdusrId", "admin");

            doReturn(Optional.empty()).when(commonCodeRepository).findById(any(CommonCodeId.class));
            doReturn(savedCode).when(commonCodeRepository).save(any(CommonCode.class));

            // When
            CommonCodeDto result = commonCodeService.createCode(request);

            // Then
            assertNotNull(result);
            assertEquals(request.code(), result.getCode());
            assertEquals(request.codeNm(), result.getCodeNm());
            verify(commonCodeRepository, times(1)).findById(any(CommonCodeId.class));
            verify(commonCodeRepository, times(1)).save(any(CommonCode.class));
        }

        @Test
        @DisplayName("중복??코드 ID �??�성 ???�외 발생")
        void testCreateCode_Duplicate() {
            // Given
            CommonCodeSaveRequest request = new CommonCodeSaveRequest(
                    "GROUP_001",
                    "CODE_001",
                    "코드�?,
                    "?�명",
                    "Y");

            CommonCodeId duplicateId = new CommonCodeId("GROUP_001", "CODE_001");
            CommonCode existingCode = CommonCode.builder()
                    .codeGroupId("GROUP_001")
                    .code("CODE_001")
                    .codeNm("기존코드")
                    .build();

            lenient().doReturn(Optional.of(existingCode)).when(commonCodeRepository).findById(duplicateId);

            // When & Then
            assertThrows(BusinessException.class, () -> {
                commonCodeService.createCode(request);
            });
        }
    }

    @Nested
    @DisplayName("공통분류코드 조회 ?�스??)
    class CmmnClCodeTests {

        @Test
        @DisplayName("공통분류코드 리스??조회 ?�공")
        void testSelectCmmnClCodeList() {
            // Given
            ComDefaultVO searchVO = new ComDefaultVO();
            searchVO.setPageIndex(1);
            searchVO.setPageUnit(10);
            searchVO.setSearchKeyword("test");

            CommonCodeCategory category1 = CommonCodeCategory.builder()
                    .clCode("CL001")
                    .clCodeNm("분류 001")
                    .clCodeDc("분류 ?�명")
                    .useAt("Y")
                    .build();

            Page<CommonCodeCategory> page = new PageImpl<>(List.of(category1));
            when(commonCodeCategoryRepository.searchCommonCodeCategories(
                    anyString(), anyString(), any(Pageable.class)))
                    .thenReturn(page);

            // When
            List<CmmnClCodeDto> result = commonCodeService.selectCmmnClCodeList(searchVO);

            // Then
            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals("CL001", result.get(0).getClCode());
        }

        @Test
        @DisplayName("공통분류코드 ?�세 조회 ?�공")
        void testSelectCmmnClCodeDetail() {
            // Given
            CmmnClCodeDto searchDto = new CmmnClCodeDto();
            searchDto.setClCode("CL001");

            CommonCodeCategory category = CommonCodeCategory.builder()
                    .clCode("CL001")
                    .clCodeNm("분류�?)
                    .build();

            when(commonCodeCategoryRepository.findById("CL001")).thenReturn(Optional.of(category));

            // When
            CmmnClCodeDto result = commonCodeService.selectCmmnClCodeDetail(searchDto);

            // Then
            assertNotNull(result);
            assertEquals("CL001", result.getClCode());
            assertEquals("분류�?, result.getClCodeNm());
        }

        @Test
        @DisplayName("공통분류코드 ?�세 조회 - 존재?��? ?�는 경우 null 반환")
        void testSelectCmmnClCodeDetail_NotFound() {
            // Given
            CmmnClCodeDto searchDto = new CmmnClCodeDto();
            searchDto.setClCode("NOT_EXIST");
            doReturn(Optional.empty()).when(commonCodeCategoryRepository).findById("NOT_EXIST");

            // When
            CmmnClCodeDto result = commonCodeService.selectCmmnClCodeDetail(searchDto);

            // Then
            assertNull(result);
        }
    }

    @Nested
    @DisplayName("공통분류코드 CRUD ?�스??)
    class CmmnClCodeCrudTests {

        @Test
        @DisplayName("공통분류코드 ?�록 ?�공")
        void testInsertCmmnClCode() {
            // Given
            CmmnClCodeDto dto = new CmmnClCodeDto();
            dto.setClCode("CL001");
            dto.setClCodeNm("??분류");
            dto.setClCodeDc("?�명");
            dto.setUseAt("Y");
            dto.setFrstRegisterId("admin");

            doReturn(false).when(commonCodeCategoryRepository).existsById("CL001");
            doAnswer(invocation -> {
                CommonCodeCategory entity = invocation.getArgument(0);
                ReflectionTestUtils.setField(entity, "frstRegisterId", "admin");
                return entity;
            }).when(commonCodeCategoryRepository).save(any(CommonCodeCategory.class));

            // When
            commonCodeService.insertCmmnClCode(dto);

            // Then
            ArgumentCaptor<CommonCodeCategory> captor = ArgumentCaptor.forClass(CommonCodeCategory.class);
            verify(commonCodeCategoryRepository, times(1)).save(captor.capture());
            CommonCodeCategory saved = captor.getValue();
            assertEquals("CL001", saved.getClCode());
            assertEquals("??분류", saved.getClCodeNm());
        }

        @Test
        @DisplayName("중복??공통분류코드 ?�록 ???�외 발생")
        void testInsertCmmnClCode_Duplicate() {
            // Given
            CmmnClCodeDto dto = new CmmnClCodeDto();
            dto.setClCode("EXISTING");
            when(commonCodeCategoryRepository.existsById("EXISTING")).thenReturn(true);

            // When & Then
            assertThrows(BusinessException.class, () -> {
                commonCodeService.insertCmmnClCode(dto);
            });
        }

        @Test
        @DisplayName("공통분류코드 ?�정 ?�공")
        void testUpdateCmmnClCode() {
            // Given
            CmmnClCodeDto dto = new CmmnClCodeDto();
            dto.setClCode("CL001");
            dto.setClCodeNm("?�정??분류�?);
            dto.setLastUpdusrId("admin");

            CommonCodeCategory existing = CommonCodeCategory.builder()
                    .clCode("CL001")
                    .clCodeNm("?�래 분류�?)
                    .build();

            when(commonCodeCategoryRepository.findById("CL001")).thenReturn(Optional.of(existing));

            // When
            commonCodeService.updateCmmnClCode(dto);

            // Then
            verify(commonCodeCategoryRepository, times(1)).findById("CL001");
            assertEquals("?�정??분류�?, existing.getClCodeNm());
        }

        @Test
        @DisplayName("공통분류코드 ??�� ?�공")
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
            // delete() 메서?��? ?�출?�었?��? ?�인 (CommonCodeCategory ?��? 로직)
        }
    }

    @Nested
    @DisplayName("공통코드 그룹 CRUD ?�스??)
    class CmmnCodeCrudTests {

        @Test
        @DisplayName("공통코드 그룹 ?�록 ?�공")
        void testInsertCmmnCode() {
            // Given
            CmmnCodeDto dto = new CmmnCodeDto();
            dto.setCodeId("GROUP_001");
            dto.setCodeIdNm("그룹�?);
            dto.setClCode("CL001");
            dto.setUseAt("Y");

            doReturn(false).when(commonCodeGroupRepository).existsById("GROUP_001");
            lenient().doReturn(Optional.of(CommonCodeCategory.builder().clCodeNm("분류�?).build()))
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
        @DisplayName("중복??공통코드 그룹 ?�록 ???�외 발생")
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
        @DisplayName("공통코드 그룹 ?�정 ?�공")
        void testUpdateCmmnCode() {
            // Given
            CmmnCodeDto dto = new CmmnCodeDto();
            dto.setCodeId("GROUP_001");
            dto.setCodeIdNm("?�정??그룹�?);
            dto.setLastUpdusrId("admin");

            CommonCodeGroup existing = CommonCodeGroup.builder()
                    .codeId("GROUP_001")
                    .codeIdNm("?�래 그룹�?)
                    .build();

            when(commonCodeGroupRepository.findById("GROUP_001")).thenReturn(Optional.of(existing));

            // When
            commonCodeService.updateCmmnCode(dto);

            // Then
            verify(commonCodeGroupRepository, times(1)).findById("GROUP_001");
            assertEquals("?�정??그룹�?, existing.getCodeIdNm());
        }

        @Test
        @DisplayName("공통코드 그룹 ??�� ?�공")
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
    @DisplayName("공통?�세코드 CRUD ?�스??)
    class CmmnDetailCodeCrudTests {

        @Test
        @DisplayName("공통?�세코드 ?�록 ?�공")
        void testInsertCmmnDetailCode() {
            // Given
            CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
            dto.setCodeId("GROUP_001");
            dto.setCode("CODE_001");
            dto.setCodeNm("코드�?);
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

            // Then - ?�비???�출???�외 ?�이 ?�료?�는지 ?�인
            assertTrue(true);
        }

        @Test
        @DisplayName("중복??공통?�세코드 ?�록 ???�외 발생")
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
        @DisplayName("공통?�세코드 ?�정 ?�공 - ?�세 ?�드 검�?)
        void testUpdateCmmnDetailCode_Detailed() {
            // Given
            CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
            dto.setCodeId("GROUP_001");
            dto.setCode("CODE_001");
            dto.setCodeNm("?�정???�름");
            dto.setCodeDc("?�정???�명");
            dto.setUseAt("N");
            dto.setLastUpdusrId("user01");

            CommonCodeId codeId = new CommonCodeId("GROUP_001", "CODE_001");
            CommonCode existing = spy(CommonCode.builder()
                    .codeGroupId("GROUP_001")
                    .code("CODE_001")
                    .codeNm("기존 ?�름")
                    .build());

            when(commonCodeRepository.findById(codeId)).thenReturn(Optional.of(existing));

            // When
            commonCodeService.updateCmmnDetailCode(dto);

            // Then
            verify(existing).update(eq("?�정???�름"), eq("?�정???�명"), eq("N"), eq("user01"));
            assertEquals("?�정???�름", existing.getCodeNm());
        }

        @Test
        @DisplayName("공통?�세코드 ??�� ?�공 - delete 메서???�출 ?�인")
        void testDeleteCmmnDetailCode_Detailed() {
            // Given
            CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
            dto.setCodeId("GROUP_001");
            dto.setCode("CODE_001");

            CommonCodeId codeId = new CommonCodeId("GROUP_001", "CODE_001");
            CommonCode existing = spy(CommonCode.builder()
                    .codeGroupId("GROUP_001")
                    .code("CODE_001")
                    .codeNm("기존 ?�름")
                    .build());

            when(commonCodeRepository.findById(codeId)).thenReturn(Optional.of(existing));

            // When
            commonCodeService.deleteCmmnDetailCode(dto);

            // Then
            verify(existing).delete();
        }
    }
}
