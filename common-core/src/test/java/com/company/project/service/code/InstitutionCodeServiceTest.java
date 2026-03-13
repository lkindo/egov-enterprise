package com.company.project.service.code;

import com.company.project.domain.code.InstitutionCode;
import com.company.project.repository.code.InstitutionCodeRepository;
import com.company.project.service.code.dto.InstitutionCodeDto;
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

@ExtendWith(MockitoExtension.class)
class InstitutionCodeServiceTest {

    @Mock
    private InstitutionCodeRepository institutionCodeRepository;

    @InjectMocks
    private InstitutionCodeService institutionCodeService;

    @Test
    @DisplayName("기관코드 목록 조회 테스트")
    void getInstitutionCodeList_Success() {
        // given
        PageRequest pageable = PageRequest.of(0, 10);
        InstitutionCode entity = InstitutionCode.builder()
                .insttCode("1234567")
                .allInsttNm("테스트기관")
                .build();
        Page<InstitutionCode> page = new PageImpl<>(Collections.singletonList(entity));
        given(institutionCodeRepository.findAll(pageable)).willReturn(page);

        // when
        Page<InstitutionCodeDto> result = institutionCodeService.getInstitutionCodeList(null, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getAllInsttNm()).isEqualTo("테스트기관");
    }

    @Test
    @DisplayName("기관코드 검색 조회 테스트")
    void getInstitutionCodeList_WithSearch_Success() {
        // given
        PageRequest pageable = PageRequest.of(0, 10);
        InstitutionCode entity = InstitutionCode.builder()
                .insttCode("1234567")
                .allInsttNm("테스트기관")
                .build();
        Page<InstitutionCode> page = new PageImpl<>(Collections.singletonList(entity));
        given(institutionCodeRepository.findByAllInsttNmContaining(eq("테스트"), any())).willReturn(page);

        // when
        Page<InstitutionCodeDto> result = institutionCodeService.getInstitutionCodeList("테스트", pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("기관코드 상세 조회 테스트")
    void getInstitutionCodeDetail_Success() {
        // given
        InstitutionCode entity = InstitutionCode.builder()
                .insttCode("1234567")
                .allInsttNm("테스트기관")
                .build();
        given(institutionCodeRepository.findById("1234567")).willReturn(Optional.of(entity));

        // when
        InstitutionCodeDto result = institutionCodeService.getInstitutionCodeDetail("1234567");

        // then
        assertThat(result.getAllInsttNm()).isEqualTo("테스트기관");
    }
}
