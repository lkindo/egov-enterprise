package com.company.project.foundation.service.system.service.consult;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.foundation.domain.system.service.consult.CnsltManage;
import com.company.project.foundation.domain.system.service.consult.CnsltManageRepository;
import com.company.project.foundation.service.system.service.consult.dto.CnsltManageDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("CnsltService 단위 테스트")
class CnsltServiceTest {

    @InjectMocks
    private CnsltService cnsltService;

    @Mock
    private CnsltManageRepository cnsltManageRepository;

    @Test
    @DisplayName("상담 목록 조회 - 키워드 없음")
    void getCnsltList_NoKeyword() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        CnsltManage entity = CnsltManage.builder().cnsltId("CNSLT_01").cnsltSj("Test Consult").build();
        given(cnsltManageRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<CnsltManageDto> result = cnsltService.getCnsltList(null, pageable);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCnsltId()).isEqualTo("CNSLT_01");
    }

    @Test
    @DisplayName("상담 목록 조회 - 키워드 있음")
    void getCnsltList_WithKeyword() {
        // given
        String keyword = "Test";
        Pageable pageable = PageRequest.of(0, 10);
        CnsltManage entity = CnsltManage.builder().cnsltId("CNSLT_01").cnsltSj("Test Consult").build();
        given(cnsltManageRepository.findByCnsltSjContaining(keyword, pageable)).willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<CnsltManageDto> result = cnsltService.getCnsltList(keyword, pageable);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCnsltSj()).isEqualTo("Test Consult");
    }

    @Test
    @DisplayName("상담 단건 조회 및 조회수 증가 - 성공")
    void getCnslt_Success() {
        // given
        String cnsltId = "CNSLT_01";
        CnsltManage entity = CnsltManage.builder().cnsltId(cnsltId).cnsltSj("Test Consult").inqireCo(0).build();
        given(cnsltManageRepository.findById(cnsltId)).willReturn(Optional.of(entity));

        // when
        CnsltManageDto result = cnsltService.getCnslt(cnsltId);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getCnsltId()).isEqualTo(cnsltId);
        assertThat(entity.getInqireCo()).isEqualTo(1); // 조회수 증가 확인
    }

    @Test
    @DisplayName("상담 단건 조회 - 실패 (존재하지 않음)")
    void getCnslt_Fail_NotFound() {
        // given
        given(cnsltManageRepository.findById("CNSLT_99")).willReturn(Optional.empty());

        // when & then
        BusinessException exception = assertThrows(BusinessException.class, () -> cnsltService.getCnslt("CNSLT_99"));
        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("상담 등록 - 성공")
    void insertCnslt() {
        // given
        CnsltManageDto dto = CnsltManageDto.builder()
                .cnsltSj("New Consult")
                .cnsltCn("Content")
                .othbcAt("Y")
                .wrterNm("user1")
                .build();
        
        // when
        cnsltService.insertCnslt(dto);

        // then
        verify(cnsltManageRepository, times(1)).save(any(CnsltManage.class));
    }

    @Test
    @DisplayName("상담 수정 - 성공")
    void updateCnslt_Success() {
        // given
        String cnsltId = "CNSLT_01";
        CnsltManage existingEntity = CnsltManage.builder()
                .cnsltId(cnsltId)
                .cnsltSj("Old Consult")
                .cnsltCn("Old Content")
                .build();
        given(cnsltManageRepository.findById(cnsltId)).willReturn(Optional.of(existingEntity));

        CnsltManageDto updateDto = CnsltManageDto.builder()
                .cnsltId(cnsltId)
                .cnsltSj("Updated Consult")
                .cnsltCn("Updated Content")
                .wrterNm("user2")
                .build();

        // when
        cnsltService.updateCnslt(updateDto);

        // then
        assertThat(existingEntity.getCnsltSj()).isEqualTo("Updated Consult");
        assertThat(existingEntity.getCnsltCn()).isEqualTo("Updated Content");
        assertThat(existingEntity.getWrterNm()).isEqualTo("user2");
    }

    @Test
    @DisplayName("상담 수정 - 실패 (존재하지 않음)")
    void updateCnslt_Fail_NotFound() {
        // given
        CnsltManageDto updateDto = CnsltManageDto.builder().cnsltId("CNSLT_99").build();
        given(cnsltManageRepository.findById("CNSLT_99")).willReturn(Optional.empty());

        // when & then
        assertThrows(BusinessException.class, () -> cnsltService.updateCnslt(updateDto));
    }

    @Test
    @DisplayName("상담 삭제 - 성공")
    void deleteCnslt() {
        // given
        String cnsltId = "CNSLT_01";

        // when
        cnsltService.deleteCnslt(cnsltId);

        // then
        verify(cnsltManageRepository, times(1)).deleteById(cnsltId);
    }

    @Test
    @DisplayName("상담 답변 등록 - 성공")
    void answerCnslt_Success() {
        // given
        String cnsltId = "CNSLT_01";
        CnsltManage existingEntity = CnsltManage.builder()
                .cnsltId(cnsltId)
                .qnaProcessSttusCode("1")
                .build();
        given(cnsltManageRepository.findById(cnsltId)).willReturn(Optional.of(existingEntity));

        String answerCn = "This is an answer.";

        // when
        cnsltService.answerCnslt(cnsltId, answerCn);

        // then
        assertThat(existingEntity.getQnaProcessSttusCode()).isEqualTo("2");
        assertThat(existingEntity.getManagtCn()).isEqualTo(answerCn);
        assertThat(existingEntity.getManagtDe()).isNotNull();
    }

    @Test
    @DisplayName("상담 답변 등록 - 실패 (존재하지 않음)")
    void answerCnslt_Fail_NotFound() {
        // given
        given(cnsltManageRepository.findById("CNSLT_99")).willReturn(Optional.empty());

        // when & then
        assertThrows(BusinessException.class, () -> cnsltService.answerCnslt("CNSLT_99", "Answer"));
    }
}
