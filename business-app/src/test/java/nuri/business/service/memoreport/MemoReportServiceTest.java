package nuri.business.service.memoreport;

import nuri.business.domain.memoreport.MemoReport;
import nuri.business.domain.memoreport.MemoReportRepository;
import nuri.foundation.core.user.UserDisplayNameLookup;
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
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
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
    private nuri.business.domain.user.repository.UserRepository userRepository;

    @Mock
    private UserDisplayNameLookup userDisplayNameLookup;

    @Mock
    private AttachmentAssignmentPolicy attachmentAssignmentPolicy;

    @Mock
    private nuri.business.service.file.FileService fileService;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @org.mockito.Spy
    nuri.business.service.memoreport.dto.MemoReportMapper memoReportMapper = new nuri.business.service.memoreport.dto.MemoReportMapperImpl();

    @InjectMocks
    private MemoReportService memoReportService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        given(userRepository.findByEsntlIdForUpdate(anyString())).willAnswer(invocation -> Optional.of(
                nuri.business.domain.user.entity.User.builder().esntlId(invocation.getArgument(0))
                        .userSttsCd("P").build()));
    }

    /** 서비스가 정렬 없는 요청에 넣는 기본 정렬. 아래 테스트들은 이미 정렬된 요청을 보내 위임만 본다. */
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "memoRptSn");

    private MemoReport readableReport(Long attachmentId) {
        MemoReport report = MemoReport.builder().memoRptSn(1L).userId("writer").rptrId("recipient")
                .rptTtl("제목").rptCn("읽은 본문").memoRptYmd("20261030").atchFileSn(attachmentId).build();
        given(memoReportRepository.findByIdForUpdate(1L)).willReturn(Optional.of(report));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("recipient"));
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("FILE_READ"))
                .thenReturn(true);
        return report;
    }

    private nuri.business.service.file.dto.FileReadSnapshot snapshot(java.util.UUID identity, String filename) {
        return new nuri.business.service.file.dto.FileReadSnapshot(List.of(
                new nuri.business.service.file.dto.FileReadSnapshot.Entry(identity, 15L, 1,
                        "private-uuid.pdf", "private/path", filename, "pdf", 100L, "설명", null)));
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"FILE_READ", "FILE_READ_ALL"})
    void singleDetailReadReturnsFirstReadAndMatchingImmutableAttachmentToken(String filePermission) {
        MemoReport report = readableReport(15L);
        allowFileReadOnly(filePermission);
        var snapshot = snapshot(java.util.UUID.randomUUID(), "읽은첨부.pdf");
        given(fileService.getReadSnapshot(15L)).willReturn(snapshot);
        given(fileService.getReadSnapshotForUpdate(15L)).willReturn(snapshot);

        MemoReportDto detail = memoReportService.getMemoReport(1L);
        assertThat(detail.getRptrInqDt()).isEqualTo(report.getRptrInqDt()).isNotNull();
        assertThat(detail.getInstructionReadToken()).matches("[a-f0-9]{64}");
        assertThat(detail.getAttachments()).extracting(nuri.business.service.file.dto.FileDto::getOrignlFileNm)
                .containsExactly("읽은첨부.pdf");
        verify(fileService).getReadSnapshot(15L);
        verify(fileService, org.mockito.Mockito.never()).getReadSnapshotForUpdate(any());

        memoReportService.updateDrctMatter(1L, "확인한 내용 지시", detail.getInstructionReadToken());
        assertThat(report.getDrctnMttr()).isEqualTo("확인한 내용 지시");
        verify(eventPublisher).publishEvent(any(Object.class));
    }

    private void allowFileReadOnly(String permission) {
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("FILE_READ"))
                .thenReturn("FILE_READ".equals(permission));
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("FILE_READ_ALL"))
                .thenReturn("FILE_READ_ALL".equals(permission));
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"writer", "recipient"})
    void attachedReportWithoutFileReadPermissionKeepsBodyButDoesNotExposeMetadataOrToken(String actor) {
        MemoReport report = readableReport(15L);
        allowFileReadOnly(null);
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of(actor));
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_INSTRUCT"))
                .thenReturn(true);

        MemoReportDto detail = memoReportService.getMemoReport(1L);

        assertThat(detail.getRptCn()).isEqualTo("읽은 본문");
        assertThat(detail.getAttachments()).isNull();
        assertThat(detail.getInstructionReadToken()).isNull();
        assertThat(detail.getInstructable()).isFalse();
        if (actor.equals("recipient")) assertThat(report.getRptrInqDt()).isNotNull();
        else assertThat(report.getRptrInqDt()).isNull();
        org.mockito.Mockito.verifyNoInteractions(fileService, eventPublisher);
    }

    @Test
    void attachedReportWithoutFileReadPermissionCannotAcceptEvenWellFormedToken() {
        MemoReport report = readableReport(15L);
        allowFileReadOnly(null);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> memoReportService.updateDrctMatter(1L, "지시", "a".repeat(64)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        assertThat(report.getDrctnMttr()).isNull();
        assertThat(report.getDrctnMttrRegDt()).isNull();
        org.mockito.Mockito.verifyNoInteractions(fileService, eventPublisher);
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"FILE_READ", "FILE_READ_ALL"})
    void revokingFileReadPermissionInvalidatesAlreadyIssuedTokenWithoutSideEffects(String permission) {
        MemoReport report = readableReport(15L);
        allowFileReadOnly(permission);
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_INSTRUCT"))
                .thenReturn(true);
        given(fileService.getReadSnapshot(15L)).willReturn(snapshot(java.util.UUID.randomUUID(), "읽은첨부.pdf"));
        String token = memoReportService.getMemoReport(1L).getInstructionReadToken();
        report.updateDrctMatter("기존 지시", java.time.LocalDateTime.of(2026, 10, 1, 9, 0));
        allowFileReadOnly(null);
        org.mockito.Mockito.clearInvocations(fileService);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> memoReportService.updateDrctMatter(1L, "새 지시", token))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        assertThat(report.getDrctnMttr()).isEqualTo("기존 지시");
        assertThat(report.getDrctnMttrRegDt()).isEqualTo(java.time.LocalDateTime.of(2026, 10, 1, 9, 0));
        MemoReportDto detail = memoReportService.getMemoReport(1L);
        assertThat(detail.getInstructionReadToken()).isNull();
        assertThat(detail.getAttachments()).isNull();
        assertThat(detail.getInstructable()).isFalse();
        org.mockito.Mockito.verifyNoInteractions(fileService, eventPublisher);
    }

    @Test
    void reportWithoutAttachmentDoesNotRequireFileOperationPermissionToReadOrInstruct() {
        MemoReport report = readableReport(null);
        allowFileReadOnly(null);
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_INSTRUCT"))
                .thenReturn(true);
        MemoReportDto detail = memoReportService.getMemoReport(1L);
        assertThat(detail.getAttachments()).isEmpty();
        assertThat(detail.getInstructionReadToken()).matches("[a-f0-9]{64}");
        assertThat(detail.getRptrInqDt()).isNotNull();
        assertThat(detail.getInstructable()).isTrue();

        memoReportService.updateDrctMatter(1L, "첨부 없는 본문 지시", detail.getInstructionReadToken());
        assertThat(report.getDrctnMttr()).isEqualTo("첨부 없는 본문 지시");
        org.mockito.Mockito.verifyNoInteractions(fileService);
        verify(eventPublisher).publishEvent(any(Object.class));
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"rptTtl", "rptCn", "memoRptYmd", "memoRptSn", "atchFileSn"})
    void changedReportContentRejectsInstructionWithoutMutationOrNotification(String changedField) {
        MemoReport report = readableReport(null);
        String token = memoReportService.getMemoReport(1L).getInstructionReadToken();
        report.updateDrctMatter("기존 지시", java.time.LocalDateTime.of(2026, 10, 1, 9, 0));
        Object changedValue = switch (changedField) {
            case "memoRptSn" -> 2L;
            case "atchFileSn" -> 15L;
            case "memoRptYmd" -> "20261031";
            default -> "바뀐 내용";
        };
        if (changedField.equals("atchFileSn")) {
            given(fileService.getReadSnapshotForUpdate(15L))
                    .willReturn(new nuri.business.service.file.dto.FileReadSnapshot(List.of()));
        }
        org.springframework.test.util.ReflectionTestUtils.setField(report, changedField, changedValue);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> memoReportService.updateDrctMatter(1L, "새 지시", token))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(report.getDrctnMttr()).isEqualTo("기존 지시");
        assertThat(report.getDrctnMttrRegDt()).isEqualTo(java.time.LocalDateTime.of(2026, 10, 1, 9, 0));
        org.mockito.Mockito.verifyNoInteractions(eventPublisher);
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"append", "delete", "replace-identity", "rename"})
    void sameGroupAttachmentChangesRejectInstruction(String change) {
        MemoReport report = readableReport(15L);
        var oldSnapshot = snapshot(java.util.UUID.randomUUID(), "읽은첨부.pdf");
        given(fileService.getReadSnapshot(15L)).willReturn(oldSnapshot);
        String token = memoReportService.getMemoReport(1L).getInstructionReadToken();
        var newSnapshot = switch (change) {
            case "delete" -> new nuri.business.service.file.dto.FileReadSnapshot(List.of());
            case "append" -> new nuri.business.service.file.dto.FileReadSnapshot(List.of(
                    oldSnapshot.files().getFirst(), snapshot(java.util.UUID.randomUUID(), "추가.pdf").files().getFirst()));
            case "rename" -> snapshot(oldSnapshot.files().getFirst().id(), "바뀐첨부.pdf");
            default -> snapshot(java.util.UUID.randomUUID(), "읽은첨부.pdf");
        };
        given(fileService.getReadSnapshotForUpdate(15L)).willReturn(newSnapshot);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> memoReportService.updateDrctMatter(1L, "새 지시", token))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(report.getDrctnMttr()).isNull();
        assertThat(report.getDrctnMttrRegDt()).isNull();
        org.mockito.Mockito.verifyNoInteractions(eventPublisher);
    }

    @Test
    void attachmentOrderAndReadAuditDoNotInvalidateToken() {
        MemoReport report = readableReport(15L);
        var first = snapshot(java.util.UUID.randomUUID(), "하나.pdf").files().getFirst();
        var second = snapshot(java.util.UUID.randomUUID(), "둘.pdf").files().getFirst();
        given(fileService.getReadSnapshot(15L)).willReturn(
                new nuri.business.service.file.dto.FileReadSnapshot(List.of(first, second)));
        given(fileService.getReadSnapshotForUpdate(15L)).willReturn(
                new nuri.business.service.file.dto.FileReadSnapshot(List.of(second, first)));
        String token = memoReportService.getMemoReport(1L).getInstructionReadToken();
        report.updateInqireDt(java.time.LocalDateTime.of(2026, 10, 30, 10, 0));
        memoReportService.updateDrctMatter(1L, "첫 지시", token);
        memoReportService.updateDrctMatter(1L, "변경 지시", token);
        assertThat(report.getDrctnMttr()).isEqualTo("변경 지시");
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"id", "sequence", "storedName", "path", "originalName", "extension", "size", "description"})
    void everyImmutableAttachmentIdentityAndMetadataValueParticipatesInComparison(String field) {
        MemoReport report = readableReport(15L);
        var original = snapshot(java.util.UUID.randomUUID(), "읽은첨부.pdf");
        given(fileService.getReadSnapshot(15L)).willReturn(original);
        String token = memoReportService.getMemoReport(1L).getInstructionReadToken();
        var file = original.files().getFirst();
        var changed = new nuri.business.service.file.dto.FileReadSnapshot.Entry(
                field.equals("id") ? java.util.UUID.randomUUID() : file.id(), file.atchFileSn(),
                field.equals("sequence") ? 2 : file.atchFileSeq(),
                field.equals("storedName") ? "replacement.pdf" : file.strgFileNm(),
                field.equals("path") ? "another/path" : file.fileStrgPath(),
                field.equals("originalName") ? "정정.pdf" : file.orgnlFileNm(),
                field.equals("extension") ? "txt" : file.fileEstn(),
                field.equals("size") ? 101L : file.fileSz(),
                field.equals("description") ? "바뀐 설명" : file.fileCn(), file.crtDt());
        given(fileService.getReadSnapshotForUpdate(15L)).willReturn(
                new nuri.business.service.file.dto.FileReadSnapshot(List.of(changed)));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> memoReportService.updateDrctMatter(1L, "새 지시", token))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(report.getDrctnMttr()).isNull();
        org.mockito.Mockito.verifyNoInteractions(eventPublisher);
    }

    @Test
    void attachmentAuditTimeDoesNotInvalidateAnOtherwiseIdenticalSnapshot() {
        readableReport(15L);
        var original = snapshot(java.util.UUID.randomUUID(), "읽은첨부.pdf");
        given(fileService.getReadSnapshot(15L)).willReturn(original);
        String token = memoReportService.getMemoReport(1L).getInstructionReadToken();
        var file = original.files().getFirst();
        var auditOnly = new nuri.business.service.file.dto.FileReadSnapshot.Entry(file.id(), file.atchFileSn(),
                file.atchFileSeq(), file.strgFileNm(), file.fileStrgPath(), file.orgnlFileNm(), file.fileEstn(),
                file.fileSz(), file.fileCn(), java.time.LocalDateTime.of(2026, 10, 30, 13, 0));
        given(fileService.getReadSnapshotForUpdate(15L)).willReturn(
                new nuri.business.service.file.dto.FileReadSnapshot(List.of(auditOnly)));
        memoReportService.updateDrctMatter(1L, "지시", token);
        verify(eventPublisher).publishEvent(any(Object.class));
    }

    @Test
    void tokenPreservesFieldBoundariesNullsAndExactUnicodeContent() {
        MemoReport report = readableReport(null);
        java.util.Set<String> tokens = new java.util.HashSet<>();
        for (String[] content : new String[][]{{"ab", "c"}, {"a", "bc"}, {"제목", null},
                {"제목", ""}, {"제목", "본문"}, {"제목", "본문 "}, {"제목", "가"}, {"제목", "가"}}) {
            org.springframework.test.util.ReflectionTestUtils.setField(report, "rptTtl", content[0]);
            org.springframework.test.util.ReflectionTestUtils.setField(report, "rptCn", content[1]);
            tokens.add(memoReportService.getMemoReport(1L).getInstructionReadToken());
        }
        assertThat(tokens).hasSize(8);
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.NullSource
    @org.junit.jupiter.params.provider.ValueSource(strings = {"", "   ", "\n"})
    void blankInstructionWithValidTokenDoesNotTouchAttachments(String instruction) {
        MemoReport report = readableReport(15L);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> memoReportService.updateDrctMatter(1L, instruction, "a".repeat(64)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(report.getDrctnMttr()).isNull();
        org.mockito.Mockito.verifyNoInteractions(fileService, eventPublisher);
    }

    @Test
    void overlongInstructionIsRejectedAtServiceBoundary() {
        MemoReport report = readableReport(15L);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> memoReportService.updateDrctMatter(1L, "가".repeat(2001), "a".repeat(64)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(report.getDrctnMttr()).isNull();
        org.mockito.Mockito.verifyNoInteractions(fileService, eventPublisher);
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.NullSource
    @org.junit.jupiter.params.provider.ValueSource(strings = {"FILE_READ", "FILE_READ_ALL"})
    void readAllAdminGetsBodyWithoutPrivateAttachmentsOrRecipientToken(String filePermission) {
        readableReport(15L);
        allowFileReadOnly(filePermission);
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("admin"));
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_READ_ALL"))
                .thenReturn(true);
        MemoReportDto detail = memoReportService.getMemoReport(1L);
        assertThat(detail.getRptCn()).isEqualTo("읽은 본문");
        assertThat(detail.getAttachments()).isNull();
        assertThat(detail.getInstructionReadToken()).isNull();
        assertThat(detail.getRptrInqDt()).isNull();
        org.mockito.Mockito.verifyNoInteractions(fileService, eventPublisher);
    }

    @Test
    void authorReadsAuthorizedSnapshotWithoutRecipientTokenOrReadTimestamp() {
        MemoReport report = readableReport(15L);
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("writer"));
        given(fileService.getReadSnapshot(15L)).willReturn(snapshot(java.util.UUID.randomUUID(), "작성자첨부.pdf"));

        MemoReportDto detail = memoReportService.getMemoReport(1L);
        assertThat(detail.getAttachments()).extracting(nuri.business.service.file.dto.FileDto::getOrignlFileNm)
                .containsExactly("작성자첨부.pdf");
        assertThat(detail.getInstructionReadToken()).isNull();
        assertThat(report.getRptrInqDt()).isNull();
        verify(fileService).getReadSnapshot(15L);
        org.mockito.Mockito.verifyNoMoreInteractions(fileService);
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"FILE_READ", "FILE_READ_ALL"})
    void recipientAttachmentAccessFailureDoesNotReturnFalseEmptySnapshotOrSaveInstruction(String permission) {
        MemoReport report = readableReport(15L);
        allowFileReadOnly(permission);
        given(fileService.getReadSnapshot(15L)).willThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED));
        given(fileService.getReadSnapshotForUpdate(15L)).willThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> memoReportService.getMemoReport(1L))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> memoReportService.updateDrctMatter(1L, "지시", "a".repeat(64)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        assertThat(report.getDrctnMttr()).isNull();
        assertThat(report.getRptrInqDt()).isNull();
        assertThat(report.getDrctnMttrRegDt()).isNull();
        org.mockito.Mockito.verifyNoInteractions(eventPublisher);
    }

    @ParameterizedTest
    @CsvSource({
            "true,NONE,true,true,false", "true,FILE_READ,true,true,true", "true,FILE_READ_ALL,true,true,true",
            "false,NONE,true,true,true", "true,FILE_READ,true,false,false", "true,FILE_READ,false,true,false"
    })
    void listInstructionHintRequiresAvailableFileReadPermissionWithoutReadingAttachments(
            boolean attached, String permission, boolean recipient, boolean instruct, boolean expected) {
        MemoReport report = readableReport(attached ? 15L : null);
        allowFileReadOnly(permission);
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of(recipient ? "recipient" : "writer"));
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_INSTRUCT"))
                .thenReturn(instruct);
        Pageable pageable = PageRequest.of(0, 10, NEWEST_FIRST);
        given(memoReportRepository.findByRptrId("recipient", pageable)).willReturn(new PageImpl<>(List.of(report)));

        MemoReportDto dto = memoReportService.getReceivedReportList("recipient", null, pageable).getContent().getFirst();

        assertThat(dto.getInstructable()).isEqualTo(expected);
        assertThat(dto.getAttachments()).isNull();
        assertThat(dto.getInstructionReadToken()).isNull();
        org.mockito.Mockito.verifyNoInteractions(fileService);
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.NullSource
    @org.junit.jupiter.params.provider.ValueSource(strings = {"", "a", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"})
    void invalidReadTokenFailsBeforeAttachmentOrMutation(String token) {
        MemoReport report = readableReport(15L);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> memoReportService.updateDrctMatter(1L, "지시", token))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(report.getDrctnMttr()).isNull();
        org.mockito.Mockito.verifyNoInteractions(fileService, eventPublisher);
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"missing", "A", "D"})
    @DisplayName("신규 수신자가 없거나 비활성이면 보고·첨부·알림을 남기지 않는다")
    void createRejectsUnavailableRecipient(String state) {
        given(userRepository.findByEsntlIdForUpdate("recipient")).willReturn(state.equals("missing")
                ? Optional.empty() : Optional.of(nuri.business.domain.user.entity.User.builder()
                        .esntlId("recipient").userSttsCd(state).build()));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> memoReportService.createMemoReport("writer",
                MemoReportDto.builder().rptTtl("제목").rptrId("recipient").atchFileSn(5L).build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        org.mockito.Mockito.verifyNoInteractions(memoReportRepository, attachmentAssignmentPolicy, eventPublisher);
    }

    @Test
    @DisplayName("직접 API 수신자 변경은 거부하고 기존 보고를 보존한다")
    void updateRejectsRecipientReplacement() {
        MemoReport report = MemoReport.builder().memoRptSn(1L).rptrId("old").rptTtl("원본").build();
        given(memoReportRepository.findByIdForUpdate(1L)).willReturn(Optional.of(report));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> memoReportService.updateMemoReport(1L, "writer",
                MemoReportDto.builder().rptrId("new").rptTtl("변경").build()))
                .isInstanceOf(BusinessException.class).hasMessageContaining("수신자는 변경할 수 없습니다");
        assertThat(report.getRptrId()).isEqualTo("old");
        assertThat(report.getRptTtl()).isEqualTo("원본");
        org.mockito.Mockito.verifyNoInteractions(userRepository, attachmentAssignmentPolicy, eventPublisher);
    }

    @Test
    @DisplayName("기존 비활성·식별불가 수신자를 유지한 정정은 신규 수신자 검사 없이 허용한다")
    void updatePreservesUnresolvableRecipient() {
        MemoReport report = MemoReport.builder().memoRptSn(1L).rptrId("retired").rptTtl("오타").build();
        given(memoReportRepository.findByIdForUpdate(1L)).willReturn(Optional.of(report));
        memoReportService.updateMemoReport(1L, "writer", MemoReportDto.builder()
                .rptrId("retired").rptTtl("정정").build());
        assertThat(report.getRptTtl()).isEqualTo("정정");
        assertThat(report.getRptrId()).isEqualTo("retired");
        org.mockito.Mockito.verifyNoInteractions(userRepository);
    }

    @ParameterizedTest
    @CsvSource({"all", "my", "received"})
    @DisplayName("허용된 메모보고 페이지의 참여자 이름을 중복 없이 한 번에 조회한다")
    void pageParticipantNamesUseOneScopedLookup(String scope) {
        Pageable pageable = PageRequest.of(1, 2, NEWEST_FIRST);
        MemoReport first = MemoReport.builder().memoRptSn(31L).userId("esntl-writer").rptrId("esntl-reader").build();
        MemoReport second = MemoReport.builder().memoRptSn(30L)
                .userId(scope.equals("received") ? "esntl-deleted" : "esntl-writer")
                .rptrId(scope.equals("received") ? "esntl-reader" : "esntl-deleted").build();
        var page = new PageImpl<>(List.of(first, second), pageable, 7);
        switch (scope) {
            case "all" -> given(memoReportRepository.searchByTitle("보고", pageable)).willReturn(page);
            case "my" -> given(memoReportRepository.findByUserIdAndRptTtlContaining("esntl-writer", "보고", pageable)).willReturn(page);
            case "received" -> given(memoReportRepository.findByRptrIdAndRptTtlContaining("esntl-reader", "보고", pageable)).willReturn(page);
            default -> throw new IllegalArgumentException(scope);
        }
        given(userDisplayNameLookup.findDisplayNames(anyCollection())).willReturn(Map.of(
                "esntl-writer", "보고 작성자", "esntl-reader", "보고 수신자"));

        Page<MemoReportDto> result = switch (scope) {
            case "all" -> memoReportService.getMemoReportList("보고", pageable);
            case "my" -> memoReportService.getMyReportList("esntl-writer", "보고", pageable);
            default -> memoReportService.getReceivedReportList("esntl-reader", "보고", pageable);
        };

        assertThat(result.getTotalElements()).isEqualTo(7);
        assertThat(result.getNumber()).isEqualTo(1);
        assertThat(result.getContent()).extracting(MemoReportDto::getWrterNm)
                .containsExactly("보고 작성자", scope.equals("received") ? null : "보고 작성자");
        assertThat(result.getContent().getFirst().getRptrNm()).isEqualTo("보고 수신자");
        assertThat(result.getContent().get(1).getRptrNm()).isEqualTo(scope.equals("received") ? "보고 수신자" : null);
        assertThat(result.getContent().get(1).getRptrId()).isEqualTo(second.getRptrId());
        assertThat(result.getContent()).allSatisfy(dto -> {
            assertThat(dto.getAttachments()).isNull();
            assertThat(dto.getInstructionReadToken()).isNull();
        });
        org.mockito.Mockito.verifyNoInteractions(fileService);
        verify(userDisplayNameLookup).findDisplayNames(argThat(ids -> ids.size() == 3
                && ids.containsAll(List.of("esntl-writer", "esntl-reader", "esntl-deleted"))));
        org.mockito.Mockito.verifyNoMoreInteractions(userDisplayNameLookup);
    }

    @Test
    @DisplayName("메모보고 상세는 참여자 인가 뒤 이름을 보강한다")
    void detailParticipantNamesPreserveIdentifiersAndPermissionHints() {
        MemoReport report = MemoReport.builder().memoRptSn(1L).userId("esntl-writer").rptrId("esntl-reader").build();
        given(memoReportRepository.findByIdForUpdate(1L)).willReturn(Optional.of(report));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-reader"));
        given(userDisplayNameLookup.findDisplayNames(anyCollection())).willReturn(Map.of("esntl-writer", "작성자"));

        MemoReportDto result = memoReportService.getMemoReport(1L);

        assertThat(result.getWrterNm()).isEqualTo("작성자");
        assertThat(result.getRptrNm()).isNull();
        assertThat(result.getUserId()).isEqualTo("esntl-writer");
        assertThat(result.getRptrId()).isEqualTo("esntl-reader");
        assertThat(result.getEditable()).isFalse();
        assertThat(result.getDeletable()).isFalse();
        verify(userDisplayNameLookup).findDisplayNames(argThat(ids -> ids.size() == 2
                && ids.containsAll(List.of("esntl-writer", "esntl-reader"))));
    }

    @Test
    @DisplayName("전체 목록 인가 거부 시 보고와 사용자 이름을 조회하지 않는다")
    void deniedListDoesNotLookUpParticipantNames() {
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.assertPermission("MEMO_RPT_READ_ALL"))
                .thenThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> memoReportService.getMemoReportList(null, PageRequest.of(0, 10)))
                .isInstanceOf(BusinessException.class);

        org.mockito.Mockito.verifyNoInteractions(memoReportRepository, userDisplayNameLookup);
    }

    @Test
    @DisplayName("정렬 없는 목록 요청은 최신순으로 조회하고, 요청한 정렬은 그대로 따른다 (DIP C7)")
    void listsDefaultToNewestFirst() {
        // 정렬 없는 페이지 조회는 DB 가 순서를 보장하지 않아 페이지 사이에 같은 보고가 겹치거나 빠졌다.
        Pageable newest = PageRequest.of(1, 10, NEWEST_FIRST);
        given(memoReportRepository.searchByTitle(eq(""), eq(newest))).willReturn(new PageImpl<>(List.of()));
        given(memoReportRepository.findByUserId(eq("u1"), eq(newest))).willReturn(new PageImpl<>(List.of()));
        given(memoReportRepository.findByRptrId(eq("u1"), eq(newest))).willReturn(new PageImpl<>(List.of()));

        memoReportService.getMemoReportList(null, PageRequest.of(1, 10));
        memoReportService.getMyReportList("u1", null, PageRequest.of(1, 10));
        memoReportService.getReceivedReportList("u1", null, PageRequest.of(1, 10));

        org.mockito.Mockito.verify(memoReportRepository).searchByTitle("", newest);
        org.mockito.Mockito.verify(memoReportRepository).findByUserId("u1", newest);
        org.mockito.Mockito.verify(memoReportRepository).findByRptrId("u1", newest);

        Pageable byTitle = PageRequest.of(0, 10, Sort.by("rptTtl"));
        given(memoReportRepository.findByUserId(eq("u1"), eq(byTitle))).willReturn(new PageImpl<>(List.of()));
        memoReportService.getMyReportList("u1", null, byTitle);
        org.mockito.Mockito.verify(memoReportRepository).findByUserId("u1", byTitle);
        org.mockito.Mockito.verifyNoInteractions(userDisplayNameLookup);
    }

    @Test
    @DisplayName("메모보고 전체 목록 조회 - 관리자 가드 통과 시 제목 검색으로 위임")
    void getMemoReportList() {
        // given
        Pageable pageable = PageRequest.of(0, 10, NEWEST_FIRST);
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
        Pageable pageable = PageRequest.of(0, 10, NEWEST_FIRST);
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
        Pageable pageable = PageRequest.of(0, 10, NEWEST_FIRST);
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
        Pageable pageable = PageRequest.of(0, 10, NEWEST_FIRST);
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
        given(memoReportRepository.findByIdForUpdate(memoRptSn)).willReturn(Optional.of(entity));
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
        given(memoReportRepository.findByIdForUpdate(memoRptSn)).willReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-stranger"));

        // when / then
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> memoReportService.getMemoReport(memoRptSn))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);
        org.mockito.Mockito.verifyNoInteractions(userDisplayNameLookup);
    }

    @Test
    @DisplayName("메모보고 상세 조회 - 수신자도 열람 가능(loginId 축 가드를 쓰면 여기서 오탐이 난다)")
    void getMemoReport_receiver_allowed() {
        // given
        Long memoRptSn = 1L;
        MemoReport entity = MemoReport.builder().memoRptSn(memoRptSn).userId("esntl-owner").rptrId("esntl-me").build();
        given(memoReportRepository.findByIdForUpdate(memoRptSn)).willReturn(Optional.of(entity));
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
        MemoReport existingEntity = MemoReport.builder().memoRptSn(memoRptSn).userId(userId).rptrId("reportr1").build();
        MemoReportDto updateDto = MemoReportDto.builder()
                .memoRptSn(memoRptSn)
                .rptTtl("Updated Subject")
                .rptCn("Updated Content")
                .rptrId("reportr1")
                .memoRptYmd("20240502")
                .build();

        given(memoReportRepository.findByIdForUpdate(memoRptSn)).willReturn(Optional.of(existingEntity));

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
                .rptrId("old-reporter")
                .atchFileSn(101L)
                .build();
        given(memoReportRepository.findByIdForUpdate(1L)).willReturn(Optional.of(existing));
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
        given(memoReportRepository.findByIdForUpdate(1L)).willReturn(Optional.of(existing));

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
        // 지시 변경과 같은 행 잠금을 얻은 뒤 소유권과 삭제 가능 상태를 검사한다.
        Long memoRptSn = 1L;
        nuri.business.domain.memoreport.MemoReport entity = org.mockito.Mockito.mock(nuri.business.domain.memoreport.MemoReport.class);
        org.mockito.Mockito.when(memoReportRepository.findByIdForUpdate(memoRptSn)).thenReturn(java.util.Optional.of(entity));

        // when
        memoReportService.deleteMemoReport(memoRptSn);

        // then
        verify(memoReportRepository).delete(entity);
    }

    @Test
    @DisplayName("수신자가 처음 열면 열람일시를 남긴다 (DIP I7)")
    void getMemoReport_recipientFirstView() {
        Long memoRptSn = 1L;
        MemoReport entity = MemoReport.builder().memoRptSn(memoRptSn).userId("esntl-writer").rptrId("esntl-me").build();
        when(memoReportRepository.findByIdForUpdate(memoRptSn)).thenReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-me"));

        MemoReportDto detail = memoReportService.getMemoReport(memoRptSn);

        assertThat(entity.getRptrInqDt()).isNotNull();
        assertThat(detail.getRptrInqDt()).isEqualTo(entity.getRptrInqDt());
    }

    @Test
    @DisplayName("🚨 작성자가 열어도, 수신자가 다시 열어도 열람일시는 바뀌지 않는다 — 열람됨은 수신자의 첫 열람이다 (DIP I7)")
    void getMemoReport_onlyRecipientFirstViewCounts() {
        Long memoRptSn = 1L;
        MemoReport unread = MemoReport.builder().memoRptSn(memoRptSn).userId("esntl-writer").rptrId("esntl-recipient").build();
        when(memoReportRepository.findByIdForUpdate(memoRptSn)).thenReturn(Optional.of(unread));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-writer"));

        MemoReportDto authorView = memoReportService.getMemoReport(memoRptSn);
        assertThat(unread.getRptrInqDt()).as("작성자 열람은 수신 확인이 아니다").isNull();
        assertThat(authorView.getRptrInqDt()).isNull();

        java.time.LocalDateTime firstView = java.time.LocalDateTime.of(2026, 9, 1, 9, 0);
        MemoReport read = MemoReport.builder().memoRptSn(2L).userId("esntl-writer").rptrId("esntl-recipient").build();
        read.updateInqireDt(firstView);
        when(memoReportRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(read));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-recipient"));

        MemoReportDto recipientView = memoReportService.getMemoReport(2L);
        assertThat(read.getRptrInqDt()).as("다시 열어도 첫 열람 시각을 덮지 않는다").isEqualTo(firstView);
        assertThat(recipientView.getRptrInqDt()).isEqualTo(firstView);
    }

    @Test
    @DisplayName("🔐 작성자는 지시사항을 쓸 수 없다 — 지시는 수신자만 남긴다 (DIP I7, GAP-MEMO-001)")
    void updateDrctMatter_rejectsWriter() {
        MemoReport entity = MemoReport.builder().memoRptSn(1L).userId("esntl-writer").rptrId("esntl-recipient").build();
        when(memoReportRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-writer"));

        BusinessException ex = org.junit.jupiter.api.Assertions.assertThrows(BusinessException.class,
                () -> memoReportService.updateDrctMatter(1L, "작성자가 덮어쓴 지시", null));

        assertThat(ex.getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(entity.getDrctnMttr()).isNull();
        org.mockito.Mockito.verifyNoInteractions(fileService, eventPublisher);
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
    @DisplayName("[DIP B4 P3] 지시가 달리면 보고한 사람에게 알리고 빈 지시는 기존 지시를 보존하며 거절한다")
    void updateDrctMatter_notifiesAuthor() {
        MemoReport entity = MemoReport.builder().memoRptSn(1L).rptTtl("주간 보고")
                .userId("esntl-writer").rptrId("esntl-recipient").build();
        when(memoReportRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-recipient"));

        String token = memoReportService.getMemoReport(1L).getInstructionReadToken();
        memoReportService.updateDrctMatter(1L, "보완해 주세요", token);

        org.mockito.ArgumentCaptor<nuri.foundation.core.event.NotificationRequestedEvent> event =
                org.mockito.ArgumentCaptor.forClass(nuri.foundation.core.event.NotificationRequestedEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue().receiverEsntlId()).isEqualTo("esntl-writer");

        org.mockito.Mockito.clearInvocations(eventPublisher);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> memoReportService.updateDrctMatter(1L, "", token))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(entity.getDrctnMttr()).isEqualTo("보완해 주세요");
        org.mockito.Mockito.verifyNoInteractions(eventPublisher);
    }

    @Test
    @DisplayName("[2026-10-01] 지시 알림은 작성자의 발신함(tab=MY)으로 보내고, 이미 있던 지시를 바꾸면 '변경' 으로 알린다")
    void updateDrctMatter_notifiesChangeToSentTab() {
        MemoReport entity = MemoReport.builder().memoRptSn(1L).rptTtl("주간 보고")
                .userId("esntl-writer").rptrId("esntl-recipient").build();
        when(memoReportRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-recipient"));
        org.mockito.ArgumentCaptor<nuri.foundation.core.event.NotificationRequestedEvent> event =
                org.mockito.ArgumentCaptor.forClass(nuri.foundation.core.event.NotificationRequestedEvent.class);

        String token = memoReportService.getMemoReport(1L).getInstructionReadToken();
        memoReportService.updateDrctMatter(1L, "보완해 주세요", token);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue().title()).isEqualTo("메모 보고에 지시가 달렸습니다");
        assertThat(event.getValue().linkUrl()).isEqualTo("/admin/operation/memo-reports?tab=MY");

        org.mockito.Mockito.clearInvocations(eventPublisher);
        memoReportService.updateDrctMatter(1L, "기한을 앞당겨 주세요", token);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue().title()).isEqualTo("메모 보고의 지시가 변경되었습니다");
    }

    @Test
    @DisplayName("[2026-10-01] 지시가 달린 보고는 작성자가 지우지 못한다(409) — 전체 삭제 권한자는 지우되 두 당사자에게 알린다")
    void deleteMemoReport_instructedIsProtected() {
        MemoReport entity = MemoReport.builder().memoRptSn(1L).rptTtl("주간 보고")
                .userId("esntl-writer").rptrId("esntl-recipient").build();
        entity.updateDrctMatter("보완해 주세요", java.time.LocalDateTime.now());
        when(memoReportRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(entity));
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_DELETE_ALL")).thenReturn(false);

        BusinessException ex = org.junit.jupiter.api.Assertions.assertThrows(BusinessException.class,
                () -> memoReportService.deleteMemoReport(1L));
        assertThat(ex.getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
        verify(memoReportRepository, org.mockito.Mockito.never()).delete(any(MemoReport.class));

        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_DELETE_ALL")).thenReturn(true);
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("esntl-admin"));
        memoReportService.deleteMemoReport(1L);
        verify(memoReportRepository).delete(entity);
        org.mockito.ArgumentCaptor<nuri.foundation.core.event.NotificationRequestedEvent> event =
                org.mockito.ArgumentCaptor.forClass(nuri.foundation.core.event.NotificationRequestedEvent.class);
        verify(eventPublisher, org.mockito.Mockito.times(2)).publishEvent(event.capture());
        assertThat(event.getAllValues()).extracting(nuri.foundation.core.event.NotificationRequestedEvent::receiverEsntlId)
                .containsExactly("esntl-writer", "esntl-recipient");
    }

    @Test
    @DisplayName("[DIP B4 P9] 지시가 달린 보고는 관리자도 본문을 고칠 수 없다(409) — 수정 힌트도 닫는다")
    void updateMemoReport_rejectedAfterInstruction() {
        MemoReport entity = MemoReport.builder().memoRptSn(1L).rptTtl("원래 제목").rptCn("원래 본문")
                .userId("esntl-writer").rptrId("esntl-recipient").build();
        entity.updateDrctMatter("보완해 주세요", java.time.LocalDateTime.now());
        when(memoReportRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(entity));
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
    @DisplayName("수신자는 지시사항을 남긴다 (DIP I7)")
    void updateDrctMatter_allowsRecipient() {
        MemoReport entity = MemoReport.builder().memoRptSn(1L).userId("esntl-writer").rptrId("esntl-recipient").build();
        when(memoReportRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-recipient"));

        memoReportService.updateDrctMatter(1L, "수신자 지시", memoReportService.getMemoReport(1L).getInstructionReadToken());
        assertThat(entity.getDrctnMttr()).isEqualTo("수신자 지시");
    }

    /*
      [2026-10-16 GAP-MEMO-001] 지시는 수신자만 남긴다 — 전체 수정 권한(MEMO_RPT_UPDATE_ALL)도 우회하지 못한다.
      지시에는 작성자 칸이 없어, 수신자가 아닌 사람이 단 지시도 보고한 사람에게는 수신자의 지시처럼 보였다.
      관리자는 남의 보고 본문을 대행 수정할 수 있지만(updateMemoReport) 지시를 새로 달거나 바꾸지는 못한다.
    */
    @Test
    @DisplayName("🔐 전체 수정·삭제·열람 권한이 있어도 수신자가 아니면 지시를 달거나 바꾸지 못한다 (GAP-MEMO-001)")
    void updateDrctMatter_rejectsAdminWithUpdateAll() {
        MemoReport entity = MemoReport.builder().memoRptSn(1L).userId("esntl-writer").rptrId("esntl-recipient").build();
        entity.updateDrctMatter("수신자 지시", java.time.LocalDateTime.of(2026, 10, 1, 9, 0));
        when(memoReportRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("esntl-admin"));
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission(anyString())).thenReturn(true);

        BusinessException ex = org.junit.jupiter.api.Assertions.assertThrows(BusinessException.class,
                () -> memoReportService.updateDrctMatter(1L, "관리자 지시", null));

        assertThat(ex.getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(entity.getDrctnMttr()).as("수신자의 지시를 덮지 않는다").isEqualTo("수신자 지시");
        org.mockito.Mockito.verifyNoInteractions(fileService, eventPublisher);
    }

    @ParameterizedTest(name = "instruct={0}, updateAll={1}, recipient={2} -> instructable={3}")
    @CsvSource({
            "true, false, true, true",
            "true, true, true, true",
            "true, true, false, false",
            "true, false, false, false",
            "false, true, true, false",
            "false, false, true, false"
    })
    @DisplayName("첨부 없는 보고의 instructable: 지시 기능 권한과 수신자 여부로 판정한다 — 전체 수정 권한은 지시를 열지 않는다")
    void instructableMatchesRecipientOnlyGuard(boolean instruct, boolean updateAll, boolean recipient, boolean expected) {
        MemoReport entity = MemoReport.builder().memoRptSn(1L).userId("esntl-writer").rptrId("esntl-recipient").build();
        given(memoReportRepository.findByIdForUpdate(1L)).willReturn(Optional.of(entity));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of(recipient ? "esntl-recipient" : "esntl-admin"));
        // 열람은 수신자이거나 전체 열람 권한으로 통과시킨다 — 판정 대상은 지시 힌트뿐이다.
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_READ_ALL")).thenReturn(true);
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_INSTRUCT")).thenReturn(instruct);
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_UPDATE_ALL")).thenReturn(updateAll);

        assertThat(memoReportService.getMemoReport(1L).getInstructable()).isEqualTo(expected);
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
        Pageable pageable = PageRequest.of(0, 10, NEWEST_FIRST);
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
        Pageable pageable = PageRequest.of(0, 10, NEWEST_FIRST);
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
        Pageable pageable = PageRequest.of(0, 10, NEWEST_FIRST);
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
        Pageable pageable = PageRequest.of(0, 10, NEWEST_FIRST);
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
        given(memoReportRepository.findByIdForUpdate(1L)).willReturn(Optional.of(entity));
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
        given(memoReportRepository.findByIdForUpdate(1L)).willReturn(Optional.of(entity));
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
