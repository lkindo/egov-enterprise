package com.company.project.service.knowledge;

import com.company.project.domain.knowledge.Knowledge;
import com.company.project.domain.knowledge.KnowledgeRepository;
import com.company.project.service.knowledge.dto.KnowledgeDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("KnowledgeService 테스트")
class KnowledgeServiceTest {

    @Mock
    private KnowledgeRepository knowledgeRepository;

    @InjectMocks
    private KnowledgeService knowledgeService;

    @Test
    @DisplayName("지식 목록 조회 성공")
    void getKnowledgeList_Success() {
        // Given
        Page<Knowledge> page = new PageImpl<>(List.of(Knowledge.builder().knoId("KNO1").build()));
        given(knowledgeRepository.findAll(any(Pageable.class))).willReturn(page);

        // When
        Page<KnowledgeDto> result = knowledgeService.getKnowledgeList(null, Pageable.unpaged());

        // Then
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals("KNO1", result.getContent().get(0).getKnoId());
    }

    @Test
    @DisplayName("지식 목록 키워드 검색 성공")
    void getKnowledgeList_WithKeyword_Success() {
        // Given
        Page<Knowledge> page = new PageImpl<>(List.of(Knowledge.builder().knoId("KNO1").build()));
        given(knowledgeRepository.searchByKeyword(eq("test"), any(Pageable.class))).willReturn(page);

        // When
        Page<KnowledgeDto> result = knowledgeService.getKnowledgeList("test", Pageable.unpaged());

        // Then
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
    }

    @Test
    @DisplayName("지식 상세 조회 성공")
    void getKnowledge_Success() {
        // Given
        Knowledge knowledge = Knowledge.builder().knoId("KNO1").build();
        given(knowledgeRepository.findById("KNO1")).willReturn(Optional.of(knowledge));

        // When
        KnowledgeDto result = knowledgeService.getKnowledge("KNO1");

        // Then
        assertNotNull(result);
        assertEquals("KNO1", result.getKnoId());
    }

    @Test
    @DisplayName("지식 등록 성공")
    void createKnowledge_Success() {
        // Given
        KnowledgeDto dto = KnowledgeDto.builder().knoNm("Title").build();
        given(knowledgeRepository.save(any(Knowledge.class))).willAnswer(invocation -> invocation.getArgument(0));

        // When
        String knoId = knowledgeService.createKnowledge("user1", dto);

        // Then
        assertNotNull(knoId);
        assertTrue(knoId.startsWith("KNO_"));
        verify(knowledgeRepository).save(any(Knowledge.class));
    }

    @Test
    @DisplayName("지식 삭제 성공")
    void deleteKnowledge_Success() {
        // Given
        Knowledge knowledge = Knowledge.builder().knoId("KNO1").build();
        given(knowledgeRepository.findById("KNO1")).willReturn(Optional.of(knowledge));

        // When
        knowledgeService.deleteKnowledge("KNO1");

        // Then
        verify(knowledgeRepository).delete(knowledge);
    }

    @Test
    @DisplayName("지식 수정 성공")
    void updateKnowledge_Success() {
        // Given
        Knowledge knowledge = Knowledge.builder().knoId("KNO1").build();
        given(knowledgeRepository.findById("KNO1")).willReturn(Optional.of(knowledge));
        KnowledgeDto dto = KnowledgeDto.builder().knoNm("Updated").build();

        // When
        knowledgeService.updateKnowledge("KNO1", "user1", dto);

        // Then
        // Verify update logic (usually we would check entity state if it was returned or via spy, 
        // but here we just verify findById was called and it didn't throw)
        assertEquals("Updated", knowledge.getKnoNm());
    }
}
