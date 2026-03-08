package com.company.project.service.knowledge;

import com.company.project.core.exception.BusinessException;
import com.company.project.domain.knowledge.Knowledge;
import com.company.project.domain.knowledge.KnowledgeRepository;
import com.company.project.service.knowledge.dto.KnowledgeDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("KnowledgeService 테스트")
class KnowledgeServiceTest {

    @Mock
    private KnowledgeRepository knowledgeRepository;

    @InjectMocks
    private KnowledgeService knowledgeService;

    @Nested
    @DisplayName("지식 목록 조회 테스트")
    class GetKnowledgeListTests {

        @Test
        @DisplayName("키워드 없이 전체 지식 목록 페이징 조회 성공")
        void testGetKnowledgeList_NoKeyword() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Knowledge knowledge1 = createMockKnowledge("KNO_001", "지식 1");
            Knowledge knowledge2 = createMockKnowledge("KNO_002", "지식 2");
            Page<Knowledge> page = new PageImpl<>(Arrays.asList(knowledge1, knowledge2));

            when(knowledgeRepository.findAll(pageable)).thenReturn(page);

            // When
            Page<KnowledgeDto> result = knowledgeService.getKnowledgeList(null, pageable);

            // Then
            assertNotNull(result);
            assertEquals(2, result.getContent().size());
            assertEquals("KNO_001", result.getContent().get(0).getKnoId());
            verify(knowledgeRepository, times(1)).findAll(pageable);
        }

        @Test
        @DisplayName("키워드로 지식 목록 검색 성공")
        void testGetKnowledgeList_WithKeyword() {
            // Given
            String keyword = "검색어";
            Pageable pageable = PageRequest.of(0, 10);
            Knowledge knowledge = createMockKnowledge("KNO_001", "검색 결과");
            Page<Knowledge> page = new PageImpl<>(List.of(knowledge));

            when(knowledgeRepository.searchByKeyword(keyword, pageable)).thenReturn(page);

            // When
            Page<KnowledgeDto> result = knowledgeService.getKnowledgeList(keyword, pageable);

            // Then
            assertNotNull(result);
            assertEquals(1, result.getContent().size());
            verify(knowledgeRepository, times(1)).searchByKeyword(keyword, pageable);
        }

        @Test
        @DisplayName("빈 키워드로 조회 시 전체 목록 반환")
        void testGetKnowledgeList_EmptyKeyword() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<Knowledge> page = new PageImpl<>(List.of());

            when(knowledgeRepository.findAll(pageable)).thenReturn(page);

            // When
            Page<KnowledgeDto> result = knowledgeService.getKnowledgeList("", pageable);

            // Then
            assertNotNull(result);
            assertTrue(result.isEmpty());
        }
    }

    @Nested
    @DisplayName("개별 지식 조회 테스트")
    class GetKnowledgeTests {

        @Test
        @DisplayName("지식 ID 로 단일 지식 조회 성공")
        void testGetKnowledge_Success() {
            // Given
            String knoId = "KNO_001";
            Knowledge knowledge = createMockKnowledge(knoId, "지식 제목");

            when(knowledgeRepository.findById(knoId)).thenReturn(Optional.of(knowledge));

            // When
            KnowledgeDto result = knowledgeService.getKnowledge(knoId);

            // Then
            assertNotNull(result);
            assertEquals(knoId, result.getKnoId());
            assertEquals("지식 제목", result.getKnoNm());
        }

        @Test
        @DisplayName("존재하지 않는 지식 조회 시 예외 발생")
        void testGetKnowledge_NotFound() {
            // Given
            String knoId = "NOT_EXIST";
            when(knowledgeRepository.findById(knoId)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(BusinessException.class, () -> {
                knowledgeService.getKnowledge(knoId);
            });
        }

        @Test
        @DisplayName("null 지식 ID 로 조회 시 NullPointerException 발생")
        void testGetKnowledge_NullId() {
            // When & Then
            assertThrows(NullPointerException.class, () -> {
                knowledgeService.getKnowledge(null);
            });
        }
    }

    @Nested
    @DisplayName("지식 생성 테스트")
    class CreateKnowledgeTests {

        @Test
        @DisplayName("새로운 지식 생성 성공")
        void testCreateKnowledge_Success() {
            // Given
            String userId = "user1";
            KnowledgeDto dto = KnowledgeDto.builder()
                    .orgnztId("ORG_001")
                    .emplyrId("EMP_001")
                    .knoTypeCd("TYPE_A")
                    .knoNm("새 지식")
                    .knoCn("지식 내용")
                    .othbcAt("Y")
                    .atchFileId("FILE_001")
                    .build();

            String expectedKnoId = "KNO_" + String.format("%013d", System.currentTimeMillis());

            when(knowledgeRepository.save(any(Knowledge.class))).thenAnswer(invocation -> {
                Knowledge entity = invocation.getArgument(0);
                ReflectionTestUtils.setField(entity, "knoId", expectedKnoId);
                return entity;
            });

            // When
            String result = knowledgeService.createKnowledge(userId, dto);

            // Then
            assertNotNull(result);
            assertTrue(result.startsWith("KNO_"));
            verify(knowledgeRepository, times(1)).save(any(Knowledge.class));
        }

        @Test
        @DisplayName("지식 생성 시 현재 사용자 ID 가 등록자로 설정됨")
        void testCreateKnowledge_WithUserId() {
            // Given
            String userId = "admin";
            KnowledgeDto dto = KnowledgeDto.builder()
                    .knoNm("지식")
                    .knoCn("내용")
                    .build();

            when(knowledgeRepository.save(any(Knowledge.class))).thenAnswer(invocation -> {
                Knowledge entity = invocation.getArgument(0);
                ReflectionTestUtils.setField(entity, "knoId", "KNO_TEST");
                return entity;
            });

            // When
            knowledgeService.createKnowledge(userId, dto);

            // Then
            verify(knowledgeRepository, times(1))
                    .save(argThat(knowledge -> "admin".equals(knowledge.getFrstRegisterId())));
        }
    }

    @Nested
    @DisplayName("지식 수정 테스트")
    class UpdateKnowledgeTests {

        @Test
        @DisplayName("지식 정보 수정 성공")
        void testUpdateKnowledge_Success() {
            // Given
            String knoId = "KNO_001";
            String userId = "updater";
            KnowledgeDto dto = KnowledgeDto.builder()
                    .knoTypeCd("TYPE_B")
                    .knoNm("수정된 제목")
                    .knoCn("수정된 내용")
                    .othbcAt("N")
                    .atchFileId("FILE_002")
                    .build();

            Knowledge existing = createMockKnowledge(knoId, "원래 제목");

            when(knowledgeRepository.findById(knoId)).thenReturn(Optional.of(existing));

            // When
            knowledgeService.updateKnowledge(knoId, userId, dto);

            // Then
            verify(knowledgeRepository, times(1)).findById(knoId);
            assertEquals("수정된 제목", existing.getKnoNm());
            assertEquals("수정된 내용", existing.getKnoCn());
            assertEquals("updater", existing.getLastUpdusrId());
        }

        @Test
        @DisplayName("존재하지 않는 지식 수정 시 예외 발생")
        void testUpdateKnowledge_NotFound() {
            // Given
            String knoId = "NOT_EXIST";
            KnowledgeDto dto = KnowledgeDto.builder().build();
            when(knowledgeRepository.findById(knoId)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(BusinessException.class, () -> {
                knowledgeService.updateKnowledge(knoId, "user", dto);
            });
        }
    }

    @Nested
    @DisplayName("지식 삭제 테스트")
    class DeleteKnowledgeTests {

        @Test
        @DisplayName("지식 삭제 성공")
        void testDeleteKnowledge_Success() {
            // Given
            String knoId = "KNO_001";
            Knowledge knowledge = createMockKnowledge(knoId, "삭제될 지식");

            when(knowledgeRepository.findById(knoId)).thenReturn(Optional.of(knowledge));
            doNothing().when(knowledgeRepository).delete(knowledge);

            // When
            knowledgeService.deleteKnowledge(knoId);

            // Then
            verify(knowledgeRepository, times(1)).findById(knoId);
            verify(knowledgeRepository, times(1)).delete(knowledge);
        }

        @Test
        @DisplayName("존재하지 않는 지식 삭제 시 예외 발생")
        void testDeleteKnowledge_NotFound() {
            // Given
            String knoId = "NOT_EXIST";
            when(knowledgeRepository.findById(knoId)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(BusinessException.class, () -> {
                knowledgeService.deleteKnowledge(knoId);
            });
        }
    }

    // Helper method to create mock Knowledge entity
    private Knowledge createMockKnowledge(String knoId, String knoNm) {
        return Knowledge.builder()
                .knoId(knoId)
                .knoNm(knoNm)
                .knoCn("지식 내용")
                .orgnztId("ORG_001")
                .emplyrId("EMP_001")
                .knoTypeCd("TYPE_A")
                .othbcAt("Y")
                .atchFileId("FILE_001")
                .frstRegisterId("admin")
                .build();
    }
}
