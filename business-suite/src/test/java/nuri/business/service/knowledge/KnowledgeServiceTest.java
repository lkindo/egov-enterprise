package nuri.business.service.knowledge;

import nuri.business.domain.knowledge.Knowledge;
import nuri.business.domain.knowledge.KnowledgeRepository;
import nuri.business.service.knowledge.dto.KnowledgeDto;
import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import java.util.Collections;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class KnowledgeServiceTest {

    @Mock
    private KnowledgeRepository knowledgeRepository;

    @InjectMocks
    private KnowledgeService knowledgeService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    private Knowledge createMockKnowledge(String id) {
        return Knowledge.builder().knoId(id).knoNm("Test Title").build();
    }

    @Test
    @DisplayName("지식 목록 조회 - 키워드 유무 분기 테스트")
    void getKnowledgeList_branch_test() {
        when(knowledgeRepository.findAll(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(Collections.singletonList(createMockKnowledge("K1"))));
        when(knowledgeRepository.searchByKeyword(anyString(), any()))
                .thenReturn(new PageImpl<>(Collections.singletonList(createMockKnowledge("K2"))));

        // No keyword
        Page<KnowledgeDto> result1 = knowledgeService.getKnowledgeList(null, PageRequest.of(0, 10));
        assertEquals("K1", result1.getContent().get(0).getKnoId());

        // With keyword
        Page<KnowledgeDto> result2 = knowledgeService.getKnowledgeList("test", PageRequest.of(0, 10));
        assertEquals("K2", result2.getContent().get(0).getKnoId());
    }

    @Test
    @DisplayName("지식 상세/수정/삭제 - 예외 분기(404) 테스트")
    void knowledge_exception_test() {
        when(knowledgeRepository.findById("NOT_FOUND")).thenReturn(Optional.empty());
        when(knowledgeRepository.findById("EXIST")).thenReturn(Optional.of(createMockKnowledge("EXIST")));

        // Detail 404
        assertThrows(BusinessException.class, () -> knowledgeService.getKnowledge("NOT_FOUND"));
        
        // Update 404
        KnowledgeDto dto = KnowledgeDto.builder().build();
        assertThrows(BusinessException.class, () -> knowledgeService.updateKnowledge("NOT_FOUND", "user", dto));
        
        // Delete 404
        assertThrows(BusinessException.class, () -> knowledgeService.deleteKnowledge("NOT_FOUND"));
    }

    @Test
    @DisplayName("지식 등록 - 성공")
    void createKnowledge_success() {
        KnowledgeDto dto = KnowledgeDto.builder().knoNm("Title").build();
        when(knowledgeRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        String id = knowledgeService.createKnowledge("user1", dto);
        
        assertNotNull(id);
        assertTrue(id.startsWith("KNO_"));
        verify(knowledgeRepository).save(any(Knowledge.class));
    }
}
