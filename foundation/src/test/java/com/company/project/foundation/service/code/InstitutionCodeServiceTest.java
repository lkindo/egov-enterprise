package com.company.project.foundation.service.code;

import com.company.project.foundation.domain.code.InstitutionCode;
import com.company.project.foundation.domain.code.InstitutionCodeRecptnLog;
import com.company.project.foundation.domain.code.InstitutionCodeRecptnLogRepository;
import com.company.project.foundation.repository.code.InstitutionCodeRepository;
import com.company.project.foundation.service.code.dto.InstitutionCodeDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class InstitutionCodeServiceTest {

    @Mock
    private InstitutionCodeRepository institutionCodeRepository;

    @Mock
    private InstitutionCodeRecptnLogRepository recptnLogRepository;

    @InjectMocks
    private InstitutionCodeService institutionCodeService;

    @Test
    @DisplayName("기�?코드 목록 조회 ?�스??)
    void getInstitutionCodeList_Success() {
        // given
        PageRequest pageable = PageRequest.of(0, 10);
        InstitutionCode entity = InstitutionCode.builder()
                .insttCode("1234567")
                .allInsttNm("?�스?�기관")
                .build();
        Page<InstitutionCode> page = new PageImpl<>(Collections.singletonList(entity));
        given(institutionCodeRepository.findAll(pageable)).willReturn(page);

        // when
        Page<InstitutionCodeDto> result = institutionCodeService.getInstitutionCodeList(null, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getAllInsttNm()).isEqualTo("?�스?�기관");
    }

    @Test
    @DisplayName("기�?코드 검??조회 ?�스??)
    void getInstitutionCodeList_WithSearch_Success() {
        // given
        PageRequest pageable = PageRequest.of(0, 10);
        InstitutionCode entity = InstitutionCode.builder()
                .insttCode("1234567")
                .allInsttNm("?�스?�기관")
                .build();
        Page<InstitutionCode> page = new PageImpl<>(Collections.singletonList(entity));
        given(institutionCodeRepository.findByAllInsttNmContaining(eq("?�스??), any())).willReturn(page);

        // when
        Page<InstitutionCodeDto> result = institutionCodeService.getInstitutionCodeList("?�스??, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("기�?코드 ?�세 조회 ?�스??- 존재?��? ?�음")
    void getInstitutionCodeDetail_NotFound() {
        given(institutionCodeRepository.findById("NOT_EXIST")).willReturn(Optional.empty());
        assertThat(institutionCodeService.getInstitutionCodeDetail("NOT_EXIST")).isNull();
    }

    @Test
    @DisplayName("기�?코드 ?�신 로그 목록 조회 ?�스??- 공정구분 ?�터 ?�함")
    void getInstitutionCodeRecptnList_WithProcessSe_Success() {
        // given
        PageRequest pageable = PageRequest.of(0, 10);
        InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId id = InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId.builder()
                .occrrncDe("20240314").insttCode("123").opertSn(1L).build();
        InstitutionCodeRecptnLog entity = InstitutionCodeRecptnLog.builder().id(id).allInsttNm("Test").build();
        given(recptnLogRepository.findByAllInsttNmContainingAndProcessSe(eq("Test"), eq("1"), eq(pageable)))
                .willReturn(new PageImpl<>(Collections.singletonList(entity)));

        // when
        Page<com.company.project.foundation.service.code.dto.InstitutionCodeRecptnDto> result = 
                institutionCodeService.getInstitutionCodeRecptnList("Test", "1", pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("기�?코드 ?�신 처리 ?�스??)
    void processInstitutionCodeRecptn_Success() {
        // given
        String occrrncDe = "20240314";
        String insttCode = "1234567";
        Long opertSn = 1L;
        String userId = "admin";

        InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId id = InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId.builder()
                .occrrncDe(occrrncDe).insttCode(insttCode).opertSn(opertSn).build();
        InstitutionCodeRecptnLog logEntity = spy(InstitutionCodeRecptnLog.builder()
                .id(id).allInsttNm("New Instt").build());
        
        given(recptnLogRepository.findById(any())).willReturn(Optional.of(logEntity));
        given(institutionCodeRepository.findById(insttCode)).willReturn(Optional.empty());

        // when
        institutionCodeService.processInstitutionCodeRecptn(occrrncDe, insttCode, opertSn, userId);

        // then
        verify(logEntity).updateProcessSe("1", userId);
        verify(institutionCodeRepository).save(any(InstitutionCode.class));
    }
}
