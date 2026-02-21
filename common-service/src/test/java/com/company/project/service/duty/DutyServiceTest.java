package com.company.project.service.duty;

import com.company.project.domain.duty.*;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DutyServiceTest {

        @Mock
        private BndtManageRepository bndtManageRepository;

        @Mock
        private BndtDiaryRepository bndtDiaryRepository;

        @Mock
        private BndtCeckManageRepository bndtCeckManageRepository;

        @InjectMocks
        private DutyService dutyService;

        @Test
        @DisplayName("Duty List Pagination Test")
        void getDutyList_Pagination() {
                // given
                BndtManage duty = BndtManage.builder()
                                .bndtId("TEST_ID")
                                .bndtDe("20231001")
                                .remark("Remark")
                                .build();

                Pageable pageable = PageRequest.of(0, 10);
                Page<BndtManage> dutyPage = new PageImpl<>(
                                java.util.Objects.requireNonNull(Collections.singletonList(duty)), pageable, 1);

                given(bndtManageRepository.findByBndtDeStartingWith(anyString(), any(Pageable.class)))
                                .willReturn(dutyPage);

                given(bndtDiaryRepository.findByBndtDeStartingWith(anyString()))
                                .willReturn(Collections.emptyList());

                // when
                Page<DutyDto> resultPage = dutyService.getDutyList("202310", pageable);

                // then
                assertThat(resultPage.getTotalElements()).isEqualTo(1);
                assertThat(resultPage.getContent().get(0).getBndtDe()).isEqualTo("20231001");

                verify(bndtManageRepository).findByBndtDeStartingWith(anyString(), any(Pageable.class));
        }
}
