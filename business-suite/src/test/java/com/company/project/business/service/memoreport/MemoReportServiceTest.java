package com.company.project.business.service.memoreport;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.business.domain.memoreport.MemoReport;
import com.company.project.business.domain.memoreport.MemoReportRepository;
import com.company.project.business.service.memoreport.dto.MemoReportDto;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("MemoReportService 단위 테스트")
class MemoReportServiceTest {

    @Mock
    private MemoReportRepository memoReportRepository;

    @InjectMocks
    private MemoReportService memoReportService;

    @Test
    @DisplayName("전체 보고서 목록 조회 - 성공")
    void getMemoReportList_Success() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        MemoReport entity = MemoReport.builder().reprtId("R1").reprtSj("Subject").build();
        given(memoReportRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(entity)));

        // When
        Page<MemoReportDto> result = memoReportService.getMemoReportList(null, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getReprtId()).isEqualTo("R1");
    }

    @Test
    @DisplayName("내가 작성한 보고서 목록 조회 - 성공")
    void getMyReportList_Success() {
        // Given
        String wrterId = "user1";
        Pageable pageable = PageRequest.of(0, 10);
        MemoReport entity = MemoReport.builder().reprtId("R1").wrterId(wrterId).build();
        given(memoReportRepository.findByWrterId(eq(wrterId), eq(pageable))).willReturn(new PageImpl<>(List.of(entity)));

        // When
        Page<MemoReportDto> result = memoReportService.getMyReportList(wrterId, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getReprtId()).isEqualTo("R1");
    }

    @Test
    @DisplayName("받은 보고서 목록 조회 - 성공")
    void getReceivedReportList_Success() {
        // Given
        String reportrId = "user2";
        Pageable pageable = PageRequest.of(0, 10);
        MemoReport entity = MemoReport.builder().reprtId("R1").reportrId(reportrId).build();
        given(memoReportRepository.findByReportrId(eq(reportrId), eq(pageable))).willReturn(new PageImpl<>(List.of(entity)));

        // When
        Page<MemoReportDto> result = memoReportService.getReceivedReportList(reportrId, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getReprtId()).isEqualTo("R1");
    }

    @Test
    @DisplayName("보고서 단건 상세 조회 - 성공")
    void getMemoReport_Success() {
        // Given
        String reprtId = "R1";
        MemoReport entity = MemoReport.builder().reprtId(reprtId).reprtSj("Subject").build();
        given(memoReportRepository.findById(reprtId)).willReturn(Optional.of(entity));

        // When
        MemoReportDto result = memoReportService.getMemoReport(reprtId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getReprtId()).isEqualTo(reprtId);
        assertThat(result.getReprtSj()).isEqualTo("Subject");
    }

    @Test
    @DisplayName("보고서 단건 상세 조회 - 실패 (존재하지 않음)")
    void getMemoReport_Fail_NotFound() {
        // Given
        String reprtId = "R99";
        given(memoReportRepository.findById(reprtId)).willReturn(Optional.empty());

        // When & Then
        assertThrows(BusinessException.class, () -> memoReportService.getMemoReport(reprtId));
    }

    @Test
    @DisplayName("보고서 등록 - 성공")
    void createMemoReport_Success() {
        // Given
        String userId = "user1";
        MemoReportDto dto = MemoReportDto.builder()
                .reprtSj("New Report")
                .reportDe("2024-05-01")
                .reportrId("user2")
                .reportCn("Content")
                .build();
                
        given(memoReportRepository.save(any(MemoReport.class))).willAnswer(inv -> inv.getArgument(0));

        // When
        String id = memoReportService.createMemoReport(userId, dto);

        // Then
        assertThat(id).isNotNull();
        assertThat(id).startsWith("MRM_");
        verify(memoReportRepository, times(1)).save(any(MemoReport.class));
    }

    @Test
    @DisplayName("보고서 수정 - 성공")
    void updateMemoReport_Success() {
        // Given
        String reprtId = "R1";
        String userId = "user1";
        MemoReport existingEntity = MemoReport.builder()
                .reprtId(reprtId)
                .reprtSj("Old Subject")
                .wrterId(userId)
                .build();
                
        given(memoReportRepository.findById(reprtId)).willReturn(Optional.of(existingEntity));
        
        MemoReportDto updateDto = MemoReportDto.builder()
                .reprtSj("Updated Subject")
                .reportDe("2024-05-02")
                .reportrId("user2")
                .reportCn("Updated Content")
                .build();

        // When
        memoReportService.updateMemoReport(reprtId, userId, updateDto);

        // Then
        assertThat(existingEntity.getReprtSj()).isEqualTo("Updated Subject");
        assertThat(existingEntity.getReportDe()).isEqualTo("2024-05-02");
        assertThat(existingEntity.getReportCn()).isEqualTo("Updated Content");
        assertThat(existingEntity.getReportrId()).isEqualTo("user2");
    }

    @Test
    @DisplayName("보고서 수정 - 실패 (존재하지 않음)")
    void updateMemoReport_Fail_NotFound() {
        // Given
        String reprtId = "R99";
        given(memoReportRepository.findById(reprtId)).willReturn(Optional.empty());
        MemoReportDto updateDto = MemoReportDto.builder().build();

        // When & Then
        assertThrows(BusinessException.class, () -> memoReportService.updateMemoReport(reprtId, "user1", updateDto));
    }

    @Test
    @DisplayName("보고서 삭제 - 성공")
    void deleteMemoReport_Success() {
        // Given
        String reprtId = "R1";

        // When
        memoReportService.deleteMemoReport(reprtId);

        // Then
        verify(memoReportRepository, times(1)).deleteById(reprtId);
    }

    @Test
    @DisplayName("보고서 읽음 처리 - 성공")
    void readMemoReport_Success() {
        // Given
        String reprtId = "R1";
        MemoReport entity = MemoReport.builder().reprtId(reprtId).build();
        given(memoReportRepository.findById(reprtId)).willReturn(Optional.of(entity));

        // When
        memoReportService.readMemoReport(reprtId);

        // Then
        assertThat(entity.getReportrInqireDt()).isNotNull();
    }

    @Test
    @DisplayName("지시사항 등록(업데이트) - 성공")
    void updateDrctMatter_Success() {
        // Given
        String reprtId = "R1";
        String drctMatter = "Good job!";
        MemoReport entity = MemoReport.builder().reprtId(reprtId).build();
        given(memoReportRepository.findById(reprtId)).willReturn(Optional.of(entity));

        // When
        memoReportService.updateDrctMatter(reprtId, drctMatter);

        // Then
        assertThat(entity.getDrctMatter()).isEqualTo(drctMatter);
        assertThat(entity.getDrctMatterRegistDt()).isNotNull();
    }

    @Test
    @DisplayName("지시사항 등록(업데이트) - 실패 (존재하지 않음)")
    void updateDrctMatter_Fail_NotFound() {
        // Given
        String reprtId = "R99";
        given(memoReportRepository.findById(reprtId)).willReturn(Optional.empty());

        // When & Then
        assertThrows(BusinessException.class, () -> memoReportService.updateDrctMatter(reprtId, "Good job!"));
    }
}
