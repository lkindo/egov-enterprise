package com.company.project.service.duty;

import com.company.project.domain.duty.Duty;
import com.company.project.domain.duty.DutyDiaryRepository;
import com.company.project.domain.duty.DutyRepository;
import com.company.project.service.duty.dto.DutyDto;
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

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class DutyServiceTest {

    @Mock
    private DutyRepository dutyRepository;

    @Mock
    private DutyDiaryRepository dutyDiaryRepository;

    @Mock
    private com.company.project.domain.duty.DutyCheckRepository dutyCheckRepository;

    @InjectMocks
    private DutyService dutyService;

    @Test
    @DisplayName("당직 일지 페이징 조회 서비스 테스트")
    void getDutyList_Pagination() {
        // given
        Duty duty = Duty.builder()
                .id(new Duty.DutyId("TEST_ID", "20231001"))
                .remark("Remark")
                .build();

        Pageable pageable = PageRequest.of(0, 10);
        Page<Duty> dutyPage = new PageImpl<>(Collections.singletonList(duty), pageable, 1);

        given(dutyRepository.findById_BndtDeStartingWith(anyString(), any(Pageable.class)))
                .willReturn(dutyPage);

        given(dutyDiaryRepository.findById_BndtIdAndId_BndtDe(anyString(), anyString()))
                .willReturn(Collections.emptyList());

        // when
        Page<DutyDto> resultPage = dutyService.getDutyList("202310", pageable);

        // then
        assertThat(resultPage.getTotalElements()).isEqualTo(1);
        assertThat(resultPage.getContent().get(0).getBndtDe()).isEqualTo("20231001");
    }
}
