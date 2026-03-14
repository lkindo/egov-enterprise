package com.company.project.service.memoreport;

import com.company.project.domain.memoreport.MemoReport;
import com.company.project.domain.memoreport.MemoReportRepository;
import com.company.project.service.memoreport.dto.MemoReportDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("MemoReportService 테스트")
class MemoReportServiceTest {

    @Mock
    private MemoReportRepository memoReportRepository;

    @InjectMocks
    private MemoReportService memoReportService;

    @Test
    @DisplayName("보고서 목록 조회 성공")
    void getMemoReportList_Success() {
        // Given
        PageRequest pageable = PageRequest.of(0, 10);
        MemoReport entity = MemoReport.builder().reprtId("R1").reprtSj("Subject").build();
        given(memoReportRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(entity)));

        // When
        Page<MemoReportDto> result = memoReportService.getMemoReportList(null, pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("보고서 등록 성공")
    void createMemoReport_Success() {
        // Given
        MemoReportDto dto = MemoReportDto.builder().reprtSj("New Report").build();

        // When
        String id = memoReportService.createMemoReport("user1", dto);

        // Then
        assertThat(id).startsWith("MRM_");
        verify(memoReportRepository).save(any(MemoReport.class));
    }

    @Test
    @DisplayName("보고서 읽음 처리 성공")
    void readMemoReport_Success() {
        // Given
        MemoReport entity = MemoReport.builder().reprtId("R1").build();
        given(memoReportRepository.findById("R1")).willReturn(Optional.of(entity));

        // When
        memoReportService.readMemoReport("R1");

        // Then
        assertThat(entity.getReportrInqireDt()).isNotNull();
    }
}
