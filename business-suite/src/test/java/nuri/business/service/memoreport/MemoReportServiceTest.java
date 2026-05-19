package nuri.business.service.memoreport;

import nuri.business.domain.memoreport.MemoReport;
import nuri.business.domain.memoreport.MemoReportRepository;
import nuri.business.service.memoreport.dto.MemoReportDto;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("MemoReportService 단위 테스트")
class MemoReportServiceTest {

    @Mock
    private MemoReportRepository memoReportRepository;

    @Mock
    private EgovIdGnrService egovMemoReportIdGnrService;

    @InjectMocks
    private MemoReportService memoReportService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("메모보고 목록 조회")
    void getMemoReportList() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        MemoReport entity = MemoReport.builder().reportId("R1").build();
        given(memoReportRepository.searchMemoReports(any(), any(), any())).willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<MemoReportDto> result = memoReportService.getMemoReportList(null, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("내가 작성한 메모보고 목록 조회")
    void getMyReportList() {
        // given
        String writerId = "user1";
        Pageable pageable = PageRequest.of(0, 10);
        MemoReport entity = MemoReport.builder().reportId("R1").writerId(writerId).build();
        given(memoReportRepository.findByWriterId(eq(writerId), eq(pageable))).willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<MemoReportDto> result = memoReportService.getMyReportList(writerId, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("내가 받은 메모보고 목록 조회")
    void getReceivedReportList() {
        // given
        String reportrId = "user1";
        Pageable pageable = PageRequest.of(0, 10);
        MemoReport entity = MemoReport.builder().reportId("R1").reportrId(reportrId).build();
        given(memoReportRepository.findByReportrId(eq(reportrId), eq(pageable))).willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<MemoReportDto> result = memoReportService.getReceivedReportList(reportrId, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("메모보고 상세 조회")
    void getMemoReport() {
        // given
        String reprtId = "R1";
        MemoReport entity = MemoReport.builder().reportId(reprtId).build();
        given(memoReportRepository.findById(reprtId)).willReturn(Optional.of(entity));

        // when
        MemoReportDto result = memoReportService.getMemoReport(reprtId);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getReportId()).isEqualTo(reprtId);
    }

    @Test
    @DisplayName("메모보고 생성")
    void createMemoReport() throws Exception {
        // given
        String userId = "user1";
        MemoReportDto dto = MemoReportDto.builder()
                .reportSubject("Subject")
                .reportrId("reportr1")
                .reprtDe("2024-05-01")
                .build();
        given(egovMemoReportIdGnrService.getNextStringId()).willReturn("R1");

        // when
        String id = memoReportService.createMemoReport(userId, dto);

        // then
        assertThat(id).isEqualTo("R1");
        verify(memoReportRepository).save(any(MemoReport.class));
    }

    @Test
    @DisplayName("메모보고 수정")
    void updateMemoReport() {
        // given
        String reprtId = "R1";
        String userId = "user1";
        MemoReport existingEntity = MemoReport.builder().reportId(reprtId).writerId(userId).build();
        MemoReportDto updateDto = MemoReportDto.builder()
                .reportId(reprtId)
                .reportSubject("Updated Subject")
                .reportContents("Updated Content")
                .reportrId("reportr1")
                .reprtDe("2024-05-02")
                .build();

        given(memoReportRepository.findById(reprtId)).willReturn(Optional.of(existingEntity));

        // when
        memoReportService.updateMemoReport(reprtId, userId, updateDto);

        // then
        assertThat(existingEntity.getReportSubject()).isEqualTo("Updated Subject");
        assertThat(existingEntity.getReprtDe()).isEqualTo("2024-05-02");
        assertThat(existingEntity.getReportContents()).isEqualTo("Updated Content");
    }

    @Test
    @DisplayName("메모보고 삭제")
    void deleteMemoReport() {
        // given
        String reprtId = "R1";

        // when
        memoReportService.deleteMemoReport(reprtId);

        // then
        verify(memoReportRepository).deleteById(reprtId);
    }

    @Test
    @DisplayName("메모보고 조회")
    void readMemoReport() {
        // given
        String reprtId = "MEMO_000000000000001";
        MemoReport entity = mock(MemoReport.class);
        when(memoReportRepository.findById(reprtId)).thenReturn(Optional.of(entity));

        // when
        memoReportService.readMemoReport(reprtId);

        // then
        verify(entity).updateInqireDt(anyString());
    }
}
