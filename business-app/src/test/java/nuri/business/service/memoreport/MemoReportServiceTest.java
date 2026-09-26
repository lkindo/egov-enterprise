package nuri.business.service.memoreport;

import nuri.business.domain.memoreport.MemoReport;
import nuri.business.domain.memoreport.MemoReportRepository;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.memoreport.dto.MemoReportDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
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

    @Mock
    private AttachmentAssignmentPolicy attachmentAssignmentPolicy;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

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
        __secUtilMock.verify(() -> nuri.business.security.util.SecurityUtil.assertPermission("MEMO_RPT_READ_ALL"));
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
                .atchFileSn(101L)
                .build();
        given(memoReportRepository.save(any(MemoReport.class)))
                .willReturn(MemoReport.builder().memoRptSn(2L).build());

        // when
        Long memoRptSn = memoReportService.createMemoReport(userId, dto);

        // then
        assertThat(memoRptSn).isEqualTo(2L);
        org.mockito.ArgumentCaptor<MemoReport> saved = org.mockito.ArgumentCaptor.forClass(MemoReport.class);
        verify(memoReportRepository).save(saved.capture());
        assertThat(saved.getValue().getAtchFileSn()).isEqualTo(101L);
        verify(attachmentAssignmentPolicy).assertAssignable(101L);
    }

    @Test
    @DisplayName("메모보고 생성 - 첨부 할당 거부 시 저장하지 않는다")
    void createMemoReport_deniedAttachmentDoesNotSave() {
        MemoReportDto dto = MemoReportDto.builder()
                .rptTtl("Subject")
                .rptrId("reporter")
                .atchFileSn(101L)
                .build();
        org.mockito.Mockito.doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(attachmentAssignmentPolicy).assertAssignable(101L);

        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> memoReportService.createMemoReport("user1", dto))
                .isInstanceOf(BusinessException.class);

        verify(attachmentAssignmentPolicy).assertAssignable(101L);
        org.mockito.Mockito.verifyNoInteractions(memoReportRepository);
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
    @DisplayName("메모보고 수정 - 새 첨부 할당 거부 시 기존 엔티티를 변경하지 않는다")
    void updateMemoReport_deniedAttachmentDoesNotMutate() {
        MemoReport existing = MemoReport.builder()
                .memoRptSn(1L)
                .rptTtl("Old Subject")
                .rptCn("Old Content")
                .rptrId("old-reporter")
                .atchFileSn(100L)
                .build();
        MemoReportDto request = MemoReportDto.builder()
                .rptTtl("New Subject")
                .rptCn("New Content")
                .rptrId("new-reporter")
                .atchFileSn(101L)
                .build();
        given(memoReportRepository.findById(1L)).willReturn(Optional.of(existing));
        org.mockito.Mockito.doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(attachmentAssignmentPolicy).assertAssignable(101L);

        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> memoReportService.updateMemoReport(1L, "user1", request))
                .isInstanceOf(BusinessException.class);

        assertThat(existing.getRptTtl()).isEqualTo("Old Subject");
        assertThat(existing.getRptCn()).isEqualTo("Old Content");
        assertThat(existing.getRptrId()).isEqualTo("old-reporter");
        assertThat(existing.getAtchFileSn()).isEqualTo(100L);
    }

    @Test
    @DisplayName("메모보고 수정 - 동일 첨부 유지와 null 분리는 재할당 검증을 하지 않는다")
    void updateMemoReport_sameOrDetachedAttachmentSkipsAssignmentCheck() {
        MemoReport existing = MemoReport.builder()
                .memoRptSn(1L)
                .rptTtl("Old")
                .rptrId("reporter")
                .atchFileSn(100L)
                .build();
        given(memoReportRepository.findById(1L)).willReturn(Optional.of(existing));

        memoReportService.updateMemoReport(1L, "user1", MemoReportDto.builder()
                .rptTtl("Same")
                .rptrId("reporter")
                .atchFileSn(100L)
                .build());
        memoReportService.updateMemoReport(1L, "user1", MemoReportDto.builder()
                .rptTtl("Detached")
                .rptrId("reporter")
                .atchFileSn(null)
                .build());

        org.mockito.Mockito.verifyNoInteractions(attachmentAssignmentPolicy);
        assertThat(existing.getAtchFileSn()).isNull();
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
    @DisplayName("수신자가 처음 열면 열람일시를 남긴다 (DIP I7)")
    void readMemoReport_recipientFirstView() {
        Long memoRptSn = 1L;
        MemoReport entity = MemoReport.builder().memoRptSn(memoRptSn).userId("esntl-writer").rptrId("esntl-me").build();
        when(memoReportRepository.findById(memoRptSn)).thenReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-me"));

        memoReportService.readMemoReport(memoRptSn);

        assertThat(entity.getRptrInqDt()).isNotNull();
    }

    @Test
    @DisplayName("🚨 작성자가 열어도, 수신자가 다시 열어도 열람일시는 바뀌지 않는다 — 열람됨은 수신자의 첫 열람이다 (DIP I7)")
    void readMemoReport_onlyRecipientFirstViewCounts() {
        Long memoRptSn = 1L;
        MemoReport unread = MemoReport.builder().memoRptSn(memoRptSn).userId("esntl-writer").rptrId("esntl-recipient").build();
        when(memoReportRepository.findById(memoRptSn)).thenReturn(Optional.of(unread));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-writer"));

        memoReportService.readMemoReport(memoRptSn);
        assertThat(unread.getRptrInqDt()).as("작성자 열람은 수신 확인이 아니다").isNull();

        java.time.LocalDateTime firstView = java.time.LocalDateTime.of(2026, 9, 1, 9, 0);
        MemoReport read = MemoReport.builder().memoRptSn(2L).userId("esntl-writer").rptrId("esntl-recipient").build();
        read.updateInqireDt(firstView);
        when(memoReportRepository.findById(2L)).thenReturn(Optional.of(read));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-recipient"));

        memoReportService.readMemoReport(2L);
        assertThat(read.getRptrInqDt()).as("다시 열어도 첫 열람 시각을 덮지 않는다").isEqualTo(firstView);
    }

    @Test
    @DisplayName("🔐 작성자는 지시사항을 쓸 수 없다 — 지시는 수신자·관리자만 남긴다 (DIP I7)")
    void updateDrctMatter_rejectsWriter() {
        MemoReport entity = MemoReport.builder().memoRptSn(1L).userId("esntl-writer").rptrId("esntl-recipient").build();
        when(memoReportRepository.findById(1L)).thenReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-writer"));

        BusinessException ex = org.junit.jupiter.api.Assertions.assertThrows(BusinessException.class,
                () -> memoReportService.updateDrctMatter(1L, "작성자가 덮어쓴 지시"));

        assertThat(ex.getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(entity.getDrctnMttr()).isNull();
    }

    @Test
    @DisplayName("[DIP B4 P3] 보고를 올리면 받은 사람에게 알리고, 자기에게 보낸 보고는 알리지 않는다")
    void createMemoReport_notifiesRecipient() {
        given(memoReportRepository.save(any(MemoReport.class)))
                .willReturn(MemoReport.builder().memoRptSn(3L).build());

        memoReportService.createMemoReport("esntl-writer", MemoReportDto.builder()
                .rptTtl("주간 보고").rptrId("esntl-recipient").memoRptYmd("20260926").build());

        org.mockito.ArgumentCaptor<nuri.foundation.core.event.NotificationRequestedEvent> event =
                org.mockito.ArgumentCaptor.forClass(nuri.foundation.core.event.NotificationRequestedEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue().receiverEsntlId()).isEqualTo("esntl-recipient");
        assertThat(event.getValue().content()).isEqualTo("주간 보고");
        // 승인된 URL 키 없이 쿼리를 만들지 않는다.
        assertThat(event.getValue().linkUrl()).isEqualTo("/admin/operation/memo-reports");

        org.mockito.Mockito.clearInvocations(eventPublisher);
        memoReportService.createMemoReport("esntl-writer", MemoReportDto.builder()
                .rptTtl("메모").rptrId("esntl-writer").memoRptYmd("20260926").build());
        org.mockito.Mockito.verifyNoInteractions(eventPublisher);
    }

    @Test
    @DisplayName("[DIP B4 P3] 지시가 달리면 보고한 사람에게 알린다 — 지시를 지우거나 자기 보고면 알리지 않는다")
    void updateDrctMatter_notifiesAuthor() {
        MemoReport entity = MemoReport.builder().memoRptSn(1L).rptTtl("주간 보고")
                .userId("esntl-writer").rptrId("esntl-recipient").build();
        when(memoReportRepository.findById(1L)).thenReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-recipient"));

        memoReportService.updateDrctMatter(1L, "보완해 주세요");

        org.mockito.ArgumentCaptor<nuri.foundation.core.event.NotificationRequestedEvent> event =
                org.mockito.ArgumentCaptor.forClass(nuri.foundation.core.event.NotificationRequestedEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue().receiverEsntlId()).isEqualTo("esntl-writer");

        org.mockito.Mockito.clearInvocations(eventPublisher);
        memoReportService.updateDrctMatter(1L, "");
        org.mockito.Mockito.verifyNoInteractions(eventPublisher);
    }

    @Test
    @DisplayName("[DIP B4 P9] 지시가 달린 보고는 관리자도 본문을 고칠 수 없다(409) — 수정 힌트도 닫는다")
    void updateMemoReport_rejectedAfterInstruction() {
        MemoReport entity = MemoReport.builder().memoRptSn(1L).rptTtl("원래 제목").rptCn("원래 본문")
                .userId("esntl-writer").rptrId("esntl-recipient").build();
        entity.updateDrctMatter("보완해 주세요", java.time.LocalDateTime.now());
        when(memoReportRepository.findById(1L)).thenReturn(Optional.of(entity));
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission(anyString())).thenReturn(true);

        BusinessException ex = org.junit.jupiter.api.Assertions.assertThrows(BusinessException.class,
                () -> memoReportService.updateMemoReport(1L, "admin", MemoReportDto.builder()
                        .rptTtl("바꾼 제목").rptCn("바꾼 본문").rptrId("esntl-recipient").memoRptYmd("20260926").build()));

        assertThat(ex.getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
        assertThat(entity.getRptCn()).isEqualTo("원래 본문");
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("esntl-admin"));
        assertThat(memoReportService.getMemoReport(1L).getEditable()).isFalse();
    }

    @Test
    @DisplayName("수신자와 전체 수정 권한자는 지시사항을 남긴다 (DIP I7)")
    void updateDrctMatter_allowsRecipientAndAdmin() {
        MemoReport entity = MemoReport.builder().memoRptSn(1L).userId("esntl-writer").rptrId("esntl-recipient").build();
        when(memoReportRepository.findById(1L)).thenReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-recipient"));

        memoReportService.updateDrctMatter(1L, "수신자 지시");
        assertThat(entity.getDrctnMttr()).isEqualTo("수신자 지시");

        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-admin"));
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_UPDATE_ALL"))
                .thenReturn(true);

        memoReportService.updateDrctMatter(1L, "관리자 지시");
        assertThat(entity.getDrctnMttr()).isEqualTo("관리자 지시");
    }

    /*
      [2026-09-08 PD-RPT-001] editable — 화면이 인가를 흉내내지 않게 서버가 판정한다.

      쓰기 인가는 기본 기능 권한과 assertOwnerOrPermission(frstRgtrId, overridePermission) 즉 **loginId 축**인데 같은 도메인의 열람 인가는
      userId·rptrId 즉 **esntlId 축**이다. 두 축이 달라 화면은 응답만 보고 "내가 고칠 수 있는가" 를
      계산할 수 없었다. 그래서 판정 결과만 싣는다(식별자는 싣지 않는다 — loginId 가 목록 응답에
      실리면 계정 열거 표면이 넓어진다).
    */
    @Test
    @DisplayName("editable: 작성자 본인이면 true — 쓰기 인가와 같은 loginId 축으로 판정한다")
    void editableTrueForOwner() {
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_UPDATE"))
                .thenReturn(true);
        Pageable pageable = PageRequest.of(0, 10);
        MemoReport entity = MemoReport.builder().memoRptSn(1L).userId("esntl-me").build();
        entity.setFrstRgtrId("login-me");
        given(memoReportRepository.findByUserId(eq("esntl-me"), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(entity)));
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_READ_ALL")).thenReturn(false);
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                .thenReturn(Optional.of("login-me"));

        Page<MemoReportDto> result = memoReportService.getMyReportList("esntl-me", null, pageable);

        assertThat(result.getContent().get(0).getEditable()).isTrue();
    }

    @Test
    @DisplayName("editable: 남의 보고면 false — 열람은 되지만 수정은 안 되는 상태를 화면이 알 수 있다")
    void editableFalseForOthers() {
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_UPDATE"))
                .thenReturn(true);
        Pageable pageable = PageRequest.of(0, 10);
        MemoReport entity = MemoReport.builder().memoRptSn(1L).rptrId("esntl-me").build();
        entity.setFrstRgtrId("login-someone-else");
        given(memoReportRepository.findByRptrId(eq("esntl-me"), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(entity)));
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_READ_ALL")).thenReturn(false);
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                .thenReturn(Optional.of("login-me"));

        Page<MemoReportDto> result = memoReportService.getReceivedReportList("esntl-me", null, pageable);

        assertThat(result.getContent().get(0).getEditable()).isFalse();
    }

    @Test
    @DisplayName("editable: 전체 열람·수정 권한이 있으면 남의 보고도 수정 가능하다")
    void editableTrueForAdmin() {
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_UPDATE"))
                .thenReturn(true);
        Pageable pageable = PageRequest.of(0, 10);
        MemoReport entity = MemoReport.builder().memoRptSn(1L).build();
        entity.setFrstRgtrId("login-someone-else");
        given(memoReportRepository.searchByTitle(eq(""), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(entity)));
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_READ_ALL")).thenReturn(true);

        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_UPDATE_ALL")).thenReturn(true);

        Page<MemoReportDto> result = memoReportService.getMemoReportList(null, pageable);

        assertThat(result.getContent().get(0).getEditable()).isTrue();
    }

    @Test
    @DisplayName("editable: 작성자 정보가 없으면 false — 판정 불가를 '가능' 으로 열지 않는다")
    void editableFalseWhenOwnerMissing() {
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_UPDATE"))
                .thenReturn(true);
        Pageable pageable = PageRequest.of(0, 10);
        // 감사 컬럼이 비어 있으면 assertOwnerOrPermission 도 통과시키지 않는다(현재 loginId 와 null 은 같을 수 없다).
        MemoReport entity = MemoReport.builder().memoRptSn(1L).userId("esntl-me").build();
        given(memoReportRepository.findByUserId(eq("esntl-me"), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(entity)));
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_READ_ALL")).thenReturn(false);
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                .thenReturn(Optional.of("login-me"));

        Page<MemoReportDto> result = memoReportService.getMyReportList("esntl-me", null, pageable);

        assertThat(result.getContent().get(0).getEditable()).isFalse();
    }

    @ParameterizedTest(name = "readAll={0}, updateAll={1}, deleteAll={2}, owner={3}")
    @CsvSource({
            "true, false, false, false, false, false",
            "false, true, false, false, true, false",
            "false, false, true, false, false, true",
            "true, true, true, false, true, true",
            "false, false, false, true, true, true",
            "false, false, false, false, false, false"
    })
    @DisplayName("수정·삭제 capability는 열람 권한과 독립이며 각각의 쓰기 가드와 일치한다")
    void modificationCapabilitiesMatchTheirIndependentGuards(
            boolean readAll, boolean updateAll, boolean deleteAll, boolean owner,
            boolean editable, boolean deletable) {
        MemoReport entity = MemoReport.builder().memoRptSn(1L).rptrId("esntl-me").build();
        entity.setFrstRgtrId(owner ? "login-me" : "login-other");
        given(memoReportRepository.findById(1L)).willReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-me"));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                .thenReturn(Optional.of("login-me"));
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_READ_ALL"))
                .thenReturn(readAll);
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_UPDATE_ALL"))
                .thenReturn(updateAll);
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_DELETE_ALL"))
                .thenReturn(deleteAll);

        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_UPDATE"))
                .thenReturn(true);
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_DELETE"))
                .thenReturn(true);

        MemoReportDto result = memoReportService.getMemoReport(1L);

        assertThat(result.getEditable()).isEqualTo(editable);
        assertThat(result.getDeletable()).isEqualTo(deletable);
    }

    @ParameterizedTest
    @CsvSource({
            "true, false, false, false",
            "false, true, false, false",
            "true, false, true, false",
            "true, false, false, true",
            "false, true, true, false",
            "false, true, false, true"
    })
    @DisplayName("기본 수정·삭제 기능 권한은 소유·대행 권한이 있어도 각각 필요하다")
    void modificationCapabilitiesRequireOperationPermission(
            boolean owner, boolean override, boolean update, boolean delete) {
        MemoReport entity = MemoReport.builder().memoRptSn(1L).rptrId("esntl-me").build();
        entity.setFrstRgtrId(owner ? "login-me" : "login-other");
        given(memoReportRepository.findById(1L)).willReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-me"));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                .thenReturn(Optional.of("login-me"));
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_UPDATE_ALL"))
                .thenReturn(override);
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_DELETE_ALL"))
                .thenReturn(override);

        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_UPDATE"))
                .thenReturn(update);
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_DELETE"))
                .thenReturn(delete);

        MemoReportDto result = memoReportService.getMemoReport(1L);

        assertThat(result.getEditable()).isEqualTo(update);
        assertThat(result.getDeletable()).isEqualTo(delete);
    }
}
