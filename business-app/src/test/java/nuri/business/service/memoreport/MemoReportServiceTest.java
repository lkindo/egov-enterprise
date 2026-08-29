package nuri.business.service.memoreport;

import nuri.business.domain.memoreport.MemoReport;
import nuri.business.domain.memoreport.MemoReportRepository;
import nuri.business.service.memoreport.dto.MemoReportDto;
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

    private org.mockito.MockedStatic<nuri.business.security.util.SecurityUtil> __secUtilMock;
    @org.junit.jupiter.api.BeforeEach
    void __openSecUtilMock() { __secUtilMock = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class); }
    @org.junit.jupiter.api.AfterEach
    void __closeSecUtilMock() { if (__secUtilMock != null) __secUtilMock.close(); }

    @Mock
    private MemoReportRepository memoReportRepository;

    @org.mockito.Spy
    nuri.business.service.memoreport.dto.MemoReportMapper memoReportMapper = new nuri.business.service.memoreport.dto.MemoReportMapperImpl();

    @InjectMocks
    private MemoReportService memoReportService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("메모보고 전체 목록 조회 - 관리자 가드 통과 시 제목 검색으로 위임")
    void getMemoReportList() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        MemoReport entity = MemoReport.builder().memoRptSn(1L).build();
        // 검색어 null 은 빈 문자열로 정규화되어 전달된다(널이면 LIKE 가 전건 누락된다)
        given(memoReportRepository.searchByTitle(eq(""), eq(pageable))).willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<MemoReportDto> result = memoReportService.getMemoReportList(null, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        // 조직 전체 열람은 관리자 전용이어야 한다(컨트롤러 @PreAuthorize 와 짝을 이루는 2차 가드)
        __secUtilMock.verify(() -> nuri.business.security.util.SecurityUtil.assertAdmin());
    }

    @Test
    @DisplayName("내가 작성한 메모보고 목록 조회")
    void getMyReportList() {
        // given
        String writerId = "user1";
        Pageable pageable = PageRequest.of(0, 10);
        MemoReport entity = MemoReport.builder().memoRptSn(1L).userId(writerId).build();
        given(memoReportRepository.findByUserId(eq(writerId), eq(pageable))).willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<MemoReportDto> result = memoReportService.getMyReportList(writerId, null, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("발신함·수신함 검색어가 실제로 제목을 좁힌다 — 소유 스코프는 유지된다")
    void scopedListsApplyTitleSearch() {
        /*
         * [2026-08-29] 종전에는 두 목록에 검색 변형이 없었고 컨트롤러도 searchKeyword 를
         * 선언하지 않아, 화면이 보낸 검색어를 Spring 이 조용히 버렸다 — 기본 탭(수신함)에서
         * 무엇을 입력해도 목록이 그대로였다. 오류가 아니라 '변하지 않음' 이라 사용자는 검색이
         * 된 줄 안다.
         *
         * 소유 스코프(userId/rptrId)가 유지되는지도 함께 본다 — 검색을 붙이며 인가 범위가
         * 넓어지면 안 된다.
         */
        Pageable pageable = PageRequest.of(0, 10);
        MemoReport mine = MemoReport.builder().memoRptSn(1L).userId("user1").build();
        MemoReport received = MemoReport.builder().memoRptSn(2L).rptrId("user1").build();

        given(memoReportRepository.findByUserIdAndRptTtlContaining(eq("user1"), eq("보고"), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(mine)));
        given(memoReportRepository.findByRptrIdAndRptTtlContaining(eq("user1"), eq("보고"), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(received)));

        assertThat(memoReportService.getMyReportList("user1", "보고", pageable).getContent()).hasSize(1);
        assertThat(memoReportService.getReceivedReportList("user1", "보고", pageable).getContent()).hasSize(1);

        // 공백만 있는 검색어는 조건으로 보지 않는다 — 전체 목록과 같아야 한다.
        given(memoReportRepository.findByUserId(eq("user1"), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(mine)));
        assertThat(memoReportService.getMyReportList("user1", "   ", pageable).getContent()).hasSize(1);
    }

    @Test
    @DisplayName("내가 받은 메모보고 목록 조회")
    void getReceivedReportList() {
        // given
        String reportrId = "user1";
        Pageable pageable = PageRequest.of(0, 10);
        MemoReport entity = MemoReport.builder().memoRptSn(1L).rptrId(reportrId).build();
        given(memoReportRepository.findByRptrId(eq(reportrId), eq(pageable))).willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<MemoReportDto> result = memoReportService.getReceivedReportList(reportrId, null, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("메모보고 상세 조회 - 작성자 본인은 열람 가능")
    void getMemoReport() {
        // given — 참여자 축은 esntlId(userId/rptrId)다. loginId(frstRgtrId)가 아니다.
        Long memoRptSn = 1L;
        MemoReport entity = MemoReport.builder().memoRptSn(memoRptSn).userId("esntl-me").build();
        given(memoReportRepository.findById(memoRptSn)).willReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-me"));

        // when
        MemoReportDto result = memoReportService.getMemoReport(memoRptSn);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getMemoRptSn()).isEqualTo(memoRptSn);
    }

    @Test
    @DisplayName("[IDOR] 메모보고 상세 조회 - 작성자도 수신자도 아니면 ACCESS_DENIED")
    void getMemoReport_nonParticipant_denied() {
        // given
        Long memoRptSn = 1L;
        MemoReport entity = MemoReport.builder().memoRptSn(memoRptSn).userId("esntl-owner").rptrId("esntl-receiver").build();
        given(memoReportRepository.findById(memoRptSn)).willReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-stranger"));

        // when / then
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> memoReportService.getMemoReport(memoRptSn))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);
    }

    @Test
    @DisplayName("메모보고 상세 조회 - 수신자도 열람 가능(loginId 축 가드를 쓰면 여기서 오탐이 난다)")
    void getMemoReport_receiver_allowed() {
        // given
        Long memoRptSn = 1L;
        MemoReport entity = MemoReport.builder().memoRptSn(memoRptSn).userId("esntl-owner").rptrId("esntl-me").build();
        given(memoReportRepository.findById(memoRptSn)).willReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-me"));

        // when
        MemoReportDto result = memoReportService.getMemoReport(memoRptSn);

        // then
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("메모보고 생성")
    void createMemoReport() throws Exception {
        // given
        String userId = "user1";
        MemoReportDto dto = MemoReportDto.builder()
                .rptTtl("Subject")
                .rptrId("reportr1")
                .memoRptYmd("20240501")
                .build();
        given(memoReportRepository.save(any(MemoReport.class)))
                .willReturn(MemoReport.builder().memoRptSn(2L).build());

        // when
        Long memoRptSn = memoReportService.createMemoReport(userId, dto);

        // then
        assertThat(memoRptSn).isEqualTo(2L);
        verify(memoReportRepository).save(any(MemoReport.class));
    }

    @Test
    @DisplayName("메모보고 수정")
    void updateMemoReport() {
        // given
        Long memoRptSn = 1L;
        String userId = "user1";
        MemoReport existingEntity = MemoReport.builder().memoRptSn(memoRptSn).userId(userId).build();
        MemoReportDto updateDto = MemoReportDto.builder()
                .memoRptSn(memoRptSn)
                .rptTtl("Updated Subject")
                .rptCn("Updated Content")
                .rptrId("reportr1")
                .memoRptYmd("20240502")
                .build();

        given(memoReportRepository.findById(memoRptSn)).willReturn(Optional.of(existingEntity));

        // when
        memoReportService.updateMemoReport(memoRptSn, userId, updateDto);

        // then
        assertThat(existingEntity.getRptTtl()).isEqualTo("Updated Subject");
        assertThat(existingEntity.getMemoRptYmd()).isEqualTo("20240502");
        assertThat(existingEntity.getRptCn()).isEqualTo("Updated Content");
    }

    @Test
    @DisplayName("메모보고 삭제")
    void deleteMemoReport() {
        // given — 소유권 가드용 findById(삭제 시 findById→delete 로 변경됨)
        Long memoRptSn = 1L;
        nuri.business.domain.memoreport.MemoReport entity = org.mockito.Mockito.mock(nuri.business.domain.memoreport.MemoReport.class);
        org.mockito.Mockito.when(memoReportRepository.findById(memoRptSn)).thenReturn(java.util.Optional.of(entity));

        // when
        memoReportService.deleteMemoReport(memoRptSn);

        // then
        verify(memoReportRepository).delete(entity);
    }

    @Test
    @DisplayName("메모보고 조회")
    void readMemoReport() {
        // given
        Long memoRptSn = 1L;
        MemoReport entity = mock(MemoReport.class);
        when(memoReportRepository.findById(memoRptSn)).thenReturn(Optional.of(entity));
        // 열람 표시도 참여자만 가능하다 — 작성자 본인으로 세팅
        when(entity.getUserId()).thenReturn("esntl-me");
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-me"));

        // when
        memoReportService.readMemoReport(memoRptSn);

        // then
        verify(entity).updateInqireDt(any(java.time.LocalDateTime.class));
    }
}
