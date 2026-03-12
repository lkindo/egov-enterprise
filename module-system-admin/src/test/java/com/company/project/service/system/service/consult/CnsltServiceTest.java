package com.company.project.service.system.service.consult;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.system.service.consult.CnsltManage;
import com.company.project.domain.system.service.consult.CnsltManageRepository;
import com.company.project.service.system.service.consult.dto.CnsltManageDto;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("CnsltService 테스트")
class CnsltServiceTest {

    @Mock
    private CnsltManageRepository cnsltManageRepository;

    @InjectMocks
    private CnsltService cnsltService;

    @Test
    @DisplayName("상담 목록 조회 성공 - 모든 목록")
    void getCnsltList_All_Success() {
        CnsltManage entity = CnsltManage.builder().cnsltId("C1").cnsltSj("Subject").build();
        Page<CnsltManage> page = new PageImpl<>(List.of(entity));
        given(cnsltManageRepository.findAll(any(Pageable.class))).willReturn(page);

        Page<CnsltManageDto> result = cnsltService.getCnsltList(null, Pageable.unpaged());
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("상담 목록 조회 성공 - 검색어 포함")
    void getCnsltList_Keyword_Success() {
        CnsltManage entity = CnsltManage.builder().cnsltId("C1").cnsltSj("Keyword Subject").build();
        Page<CnsltManage> page = new PageImpl<>(List.of(entity));
        given(cnsltManageRepository.findByCnsltSjContaining(eq("Keyword"), any(Pageable.class))).willReturn(page);

        Page<CnsltManageDto> result = cnsltService.getCnsltList("Keyword", Pageable.unpaged());
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCnsltSj()).contains("Keyword");
    }

    @Test
    @DisplayName("상담 상세 조회 성공")
    void getCnslt_Success() {
        CnsltManage entity = CnsltManage.builder().cnsltId("C1").build();
        given(cnsltManageRepository.findById("C1")).willReturn(Optional.of(entity));

        CnsltManageDto result = cnsltService.getCnslt("C1");
        assertThat(result.getCnsltId()).isEqualTo("C1");
        assertThat(entity.getInqireCo()).isEqualTo(1); // incrementInqireCo check
    }

    @Test
    @DisplayName("상담 상세 조회 실패 - 존재하지 않음")
    void getCnslt_NotFound() {
        given(cnsltManageRepository.findById("C1")).willReturn(Optional.empty());
        assertThatThrownBy(() -> cnsltService.getCnslt("C1"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("상담 등록 성공")
    void insertCnslt_Success() {
        CnsltManageDto dto = CnsltManageDto.builder()
                .cnsltSj("Subject")
                .cnsltCn("Content")
                .wrterNm("Writer")
                .build();

        cnsltService.insertCnslt(dto);
        verify(cnsltManageRepository).save(any(CnsltManage.class));
    }

    @Test
    @DisplayName("상담 수정 성공")
    void updateCnslt_Success() {
        CnsltManage entity = CnsltManage.builder().cnsltId("C1").cnsltSj("Old").build();
        given(cnsltManageRepository.findById("C1")).willReturn(Optional.of(entity));

        CnsltManageDto dto = CnsltManageDto.builder()
                .cnsltId("C1")
                .cnsltSj("New")
                .wrterNm("New Writer")
                .build();

        cnsltService.updateCnslt(dto);
        assertThat(entity.getCnsltSj()).isEqualTo("New");
    }

    @Test
    @DisplayName("상담 삭제 성공")
    void deleteCnslt_Success() {
        cnsltService.deleteCnslt("C1");
        verify(cnsltManageRepository).deleteById("C1");
    }

    @Test
    @DisplayName("상담 답변 등록 성공")
    void answerCnslt_Success() {
        CnsltManage entity = CnsltManage.builder().cnsltId("C1").build();
        given(cnsltManageRepository.findById("C1")).willReturn(Optional.of(entity));

        cnsltService.answerCnslt("C1", "Answer content");
        
        assertThat(entity.getManagtCn()).isEqualTo("Answer content");
        assertThat(entity.getQnaProcessSttusCode()).isEqualTo("2"); // Processed status
    }
}
