package nuri.business.service.promotion.popup;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.promotion.popup.Popup;
import nuri.business.domain.promotion.popup.PopupDomainRepository;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.promotion.popup.dto.PopupDto;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("PopupService 단위 테스트 (Full Coverage)")
class PopupServiceImplTest {

    @Mock
    private PopupDomainRepository popupRepository;

    @Mock
    private AttachmentAssignmentPolicy attachmentAssignmentPolicy;

    @InjectMocks
    private PopupService popupService;

    @BeforeEach
    void clearAuthenticationBefore() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clearAuthenticationAfter() {
        SecurityContextHolder.clearContext();
    }

    // ==========================================
    // 1. 팝업 목록 및 상세 조회 테스트
    // ==========================================

    @Test
    @DisplayName("팝업 목록 조회 - 키워드 없음")
    void getPopupList_NoKeyword() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        Popup popup = Popup.builder().popupSn(1L).popupTtlNm("팝업1").build();
        given(popupRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(popup)));

        // when
        Page<PopupDto> result = popupService.getPopupList(null, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getPopupTtlNm()).isEqualTo("팝업1");
        verify(popupRepository, times(1)).findAll(pageable);
    }

    @Test
    @DisplayName("팝업 목록 조회 - 키워드 있음")
    void getPopupList_WithKeyword() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        Popup popup = Popup.builder().popupSn(1L).popupTtlNm("팝업검색").build();
        given(popupRepository.findByPopupTtlNmContaining(eq("검색"), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(popup)));

        // when
        Page<PopupDto> result = popupService.getPopupList("검색", pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        verify(popupRepository, times(1)).findByPopupTtlNmContaining("검색", pageable);
    }

    @Test
    @DisplayName("활성 팝업 목록 조회")
    void getActivePopups() {
        // given
        Popup popup = Popup.builder().popupSn(1L).build();
        given(popupRepository.findActivePopups(any(LocalDate.class))).willReturn(List.of(popup));

        // when
        List<PopupDto> result = popupService.getActivePopups();

        // then
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("팝업 상세 조회 - 성공")
    void getPopup_Success() {
        // given
        Popup popup = Popup.builder()
                .popupSn(1L)
                .popupTtlNm("제목")
                .ntceBgnde(LocalDate.of(2026, 1, 1))
                .ntceEndde(LocalDate.of(2026, 1, 31))
                .build();
        given(popupRepository.findById(1L)).willReturn(Optional.of(popup));

        // when
        PopupDto result = popupService.getPopup(1L);

        // then
        assertThat(result.getPopupSn()).isEqualTo(1L);
        assertThat(result.getPopupTtlNm()).isEqualTo("제목");
        assertThat(result.getNtceBgnde()).isEqualTo("2026-01-01");
        assertThat(result.getNtceEndde()).isEqualTo("2026-01-31");
    }

    @Test
    @DisplayName("팝업 상세 조회 - 자원 없음 예외")
    void getPopup_NotFound_ShouldThrowBusinessException() {
        // given
        given(popupRepository.findById(1L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> popupService.getPopup(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Resource Not Found");
    }

    @Test
    @DisplayName("사용자 단건 조회 - 오늘 게시 중인 팝업은 돌려준다")
    void getPublishedPopup_returnsPopupInNoticePeriod() {
        LocalDate today = LocalDate.now();
        Popup popup = Popup.builder().popupSn(1L).popupTtlNm("운영 안내").ntceYn("Y")
                .ntceBgnde(today.minusDays(1)).ntceEndde(today.plusDays(1)).build();
        given(popupRepository.findById(1L)).willReturn(Optional.of(popup));

        assertThat(popupService.getPublishedPopup(1L).getPopupTtlNm()).isEqualTo("운영 안내");
    }

    static Stream<Arguments> unpublishedPopups() {
        // 자정 경계에서 테스트와 서비스의 '오늘' 이 갈려도 판정이 같도록 이틀 여유를 둔다.
        LocalDate today = LocalDate.now();
        return Stream.of(
                Arguments.of("게시 안 함", "N", today.minusDays(2), today.plusDays(2)),
                Arguments.of("게시 여부 없음", null, today.minusDays(2), today.plusDays(2)),
                Arguments.of("시작 전", "Y", today.plusDays(2), today.plusDays(5)),
                Arguments.of("종료 뒤", "Y", today.minusDays(5), today.minusDays(2)),
                Arguments.of("기간 없음", "Y", null, null));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("unpublishedPopups")
    @DisplayName("🔒 사용자 단건 조회 - 게시하지 않았거나 기간 밖인 팝업은 없는 것과 같은 404 다")
    void getPublishedPopup_hidesUnpublishedPopup(String label, String ntceYn, LocalDate begin, LocalDate end) {
        Popup popup = Popup.builder().popupSn(7L).popupTtlNm("숨은 팝업").ntceYn(ntceYn)
                .ntceBgnde(begin).ntceEndde(end).build();
        given(popupRepository.findById(7L)).willReturn(Optional.of(popup));

        assertThatExceptionOfType(BusinessException.class)
                .as("%s 팝업이 사용자 단건 조회로 읽혔다", label)
                .isThrownBy(() -> popupService.getPublishedPopup(7L))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);
        // 관리용 단건 조회는 같은 팝업을 그대로 돌려준다 — 관리자는 게시 전·후 팝업을 고쳐야 한다.
        assertThat(popupService.getPopup(7L).getPopupTtlNm()).isEqualTo("숨은 팝업");
    }

    // ==========================================
    // 2. 팝업 등록, 수정, 삭제 테스트
    // ==========================================

    @Test
    @DisplayName("팝업 등록 - 성공")
    void createPopup_Success() {
        authenticate("POPUP_CREATE");
        // given
        PopupDto dto = PopupDto.builder()
                .popupTtlNm("Test Popup")
                .ntceBgnde("2026-01-01")
                .ntceEndde("2026-01-31")
                .stopvewSetupYn("Y")
                .ntceYn("Y")
                .build();

        given(popupRepository.save(any(Popup.class)))
                .willReturn(Popup.builder().popupSn(1L).popupTtlNm("Test Popup").build());

        // when
        Long popupSn = popupService.createPopup("admin", dto);

        // then
        assertThat(popupSn).isEqualTo(1L);
        verify(popupRepository, times(1)).save(any(Popup.class));
    }

    @Test
    @DisplayName("팝업 등록 - canonical 및 legacy 내부 첨부 URL은 정확한 ID를 검증한다")
    void createPopup_internalAttachmentUrlsAreValidated() {
        authenticate("POPUP_CREATE");
        given(popupRepository.save(any(Popup.class)))
                .willReturn(Popup.builder().popupSn(1L).build());

        popupService.createPopup("admin", PopupDto.builder()
                .popupTtlNm("Canonical")
                .fileUrl("/api/v1/files/101")
                .build());
        popupService.createPopup("admin", PopupDto.builder()
                .popupTtlNm("Legacy")
                .fileUrl("/api/v1/files/download?fileId=202")
                .build());

        verify(attachmentAssignmentPolicy).assertAssignable(101L);
        verify(attachmentAssignmentPolicy).assertAssignable(202L);
    }

    @Test
    @DisplayName("팝업 등록 - 위험한 스킴과 프로토콜 상대 주소는 저장하지 않는다")
    void createPopup_rejectsUnsafeUrls() {
        authenticate("POPUP_CREATE");
        for (String url : java.util.List.of("javascript:alert(1)", "data:image/svg+xml,x", "vbscript:x", "//attacker.test")) {
            PopupDto dto = PopupDto.builder().popupTtlNm("위험").fileUrl(url).build();
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> popupService.createPopup("admin", dto))
                    .hasFieldOrPropertyWithValue("errorCode", nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
        }
        org.mockito.Mockito.verify(popupRepository, org.mockito.Mockito.never()).save(any(Popup.class));
    }

    @Test
    @DisplayName("팝업 등록 - 외부 URL과 일반 내부 자산 경로는 첨부 검증 대상이 아니다")
    void createPopup_nonAttachmentUrlsRemainAllowed() {
        authenticate("POPUP_CREATE");
        given(popupRepository.save(any(Popup.class)))
                .willReturn(Popup.builder().popupSn(1L).build());

        popupService.createPopup("admin", PopupDto.builder()
                .popupTtlNm("External")
                .fileUrl("https://cdn.example.test/api/v1/files/101")
                .build());
        popupService.createPopup("admin", PopupDto.builder()
                .popupTtlNm("Asset")
                .fileUrl("/assets/popup.html")
                .build());

        verifyNoInteractions(attachmentAssignmentPolicy);
        verify(popupRepository, times(2)).save(any(Popup.class));
    }

    @Test
    @DisplayName("팝업 등록 - 내부 첨부 prefix를 쓴 비정상 URL은 fail-closed한다")
    void createPopup_malformedInternalAttachmentUrlFailsClosed() {
        authenticate("POPUP_CREATE");
        List<String> malformed = List.of(
                "/api/v1/files/",
                "/api/v1/files/0",
                "/api/v1/files/000101",
                "/api/v1/files/101/extra",
                "/api/v1/files/101?download=true",
                "/api/v1/files/download?fileId=abc",
                "/api/v1/files/download?fileId=0",
                "/api/v1/files/download?fileId=000202",
                "/api/v1/files/download?fileId=202&download=true",
                "/api/v1/files/download?fileId=202#fragment",
                "/api/v1/files/not-a-number",
                "/api/v1/files/999999999999999999999999999999");

        for (String fileUrl : malformed) {
            assertThatThrownBy(() -> popupService.createPopup("admin", PopupDto.builder()
                            .popupTtlNm("Malformed")
                            .fileUrl(fileUrl)
                            .build()))
                    .isInstanceOf(BusinessException.class)
                    .extracting(error -> ((BusinessException) error).getErrorCode())
                    .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        }

        verifyNoInteractions(attachmentAssignmentPolicy, popupRepository);
    }

    @Test
    @DisplayName("팝업 등록·수정 - 게시 일자가 YYYY-MM-DD 날짜가 아니면 400 이고 저장·변경하지 않는다")
    void noticeDateMustBeCalendarDate() {
        Popup popup = Popup.builder().popupSn(1L).popupTtlNm("OLD").build();
        org.springframework.test.util.ReflectionTestUtils.setField(popup, "version", 0);
        given(popupRepository.findById(1L)).willReturn(Optional.of(popup));

        // 2026-09-24 ZAP API 스캔: 날짜가 아닌 값이 LocalDate.parse 예외로 500 이 됐다.
        for (String date : List.of("John Doe", "", "20260201", "2026-02-30", "2026-2-1")) {
            for (boolean start : new boolean[] {true, false}) {
                PopupDto dto = PopupDto.builder().popupTtlNm("NEW")
                        .ntceBgnde(start ? date : "2026-02-01")
                        .ntceEndde(start ? "2026-02-28" : date)
                        .version(0)
                        .build();
                authenticate("POPUP_CREATE");
                assertThatThrownBy(() -> popupService.createPopup("admin", dto))
                        .as("create %s %s", start ? "start" : "end", date)
                        .isInstanceOf(BusinessException.class)
                        .extracting(error -> ((BusinessException) error).getErrorCode())
                        .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
                authenticate("POPUP_UPDATE");
                assertThatThrownBy(() -> popupService.updatePopup(1L, "updater", dto))
                        .as("update %s %s", start ? "start" : "end", date)
                        .isInstanceOf(BusinessException.class)
                        .extracting(error -> ((BusinessException) error).getErrorCode())
                        .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
            }
        }

        verify(popupRepository, never()).save(any());
        assertThat(popup.getPopupTtlNm()).isEqualTo("OLD");
        assertThat(popup.getLastMdfrId()).isNull();
    }

    @Test
    @DisplayName("[2026-10-18] 팝업 등록·수정 - 종료일이 시작일보다 앞서면 400 이고 저장·변경하지 않는다(화면만 보던 검사를 서버도 한다)")
    void noticePeriodMustNotEndBeforeItBegins() {
        Popup popup = Popup.builder().popupSn(1L).popupTtlNm("OLD").build();
        org.springframework.test.util.ReflectionTestUtils.setField(popup, "version", 0);
        given(popupRepository.findById(1L)).willReturn(Optional.of(popup));
        PopupDto reversed = PopupDto.builder().popupTtlNm("NEW").ntceBgnde("2026-03-10").ntceEndde("2026-03-09").version(0).build();

        authenticate("POPUP_CREATE");
        assertThatThrownBy(() -> popupService.createPopup("admin", reversed))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("종료일")
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        authenticate("POPUP_UPDATE");
        assertThatThrownBy(() -> popupService.updatePopup(1L, "updater", reversed))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("종료일")
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        verify(popupRepository, never()).save(any());
        assertThat(popup.getPopupTtlNm()).isEqualTo("OLD");

        // 같은 날 시작해 같은 날 끝나는 하루 게시는 허용한다.
        popupService.updatePopup(1L, "updater", PopupDto.builder().popupTtlNm("ONE DAY")
                .ntceBgnde("2026-03-10").ntceEndde("2026-03-10").version(0).build());
        assertThat(popup.getNtceEndde()).isEqualTo(LocalDate.of(2026, 3, 10));
    }

    @Test
    @DisplayName("[2026-10-18] 팝업 수정 - 읽은 버전이 다르면 409 이고 덮어쓰지 않는다")
    void updatePopup_rejectsStaleVersion() {
        authenticate("POPUP_UPDATE");
        Popup popup = Popup.builder().popupSn(1L).popupTtlNm("CURRENT").build();
        org.springframework.test.util.ReflectionTestUtils.setField(popup, "version", 2);
        given(popupRepository.findById(1L)).willReturn(Optional.of(popup));

        assertThatThrownBy(() -> popupService.updatePopup(1L, "updater", PopupDto.builder().popupTtlNm("STALE").version(1).build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(popup.getPopupTtlNm()).isEqualTo("CURRENT");
        assertThat(popup.getLastMdfrId()).isNull();
    }

    @Test
    @DisplayName("팝업 등록 - 첨부 할당 거부 시 저장하지 않는다")
    void createPopup_deniedAttachmentDoesNotSave() {
        authenticate("POPUP_CREATE");
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(attachmentAssignmentPolicy).assertAssignable(101L);

        assertThatThrownBy(() -> popupService.createPopup("admin", PopupDto.builder()
                        .popupTtlNm("Denied")
                        .fileUrl("/api/v1/files/101")
                        .build()))
                .isInstanceOf(BusinessException.class);

        verify(attachmentAssignmentPolicy).assertAssignable(101L);
        verifyNoInteractions(popupRepository);
    }

    @Test
    @DisplayName("팝업 수정 - 성공")
    void updatePopup_Success() {
        authenticate("POPUP_UPDATE");
        // given
        Popup popup = Popup.builder()
                .popupSn(1L)
                .popupTtlNm("OLD")
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(popup, "version", 0);
        given(popupRepository.findById(1L)).willReturn(Optional.of(popup));

        PopupDto dto = PopupDto.builder()
                .popupTtlNm("NEW")
                .ntceBgnde("2026-02-01")
                .ntceEndde("2026-02-28")
                .stopvewSetupYn("N")
                .ntceYn("N")
                .version(0)
                .build();

        // when
        popupService.updatePopup(1L, "updater", dto);

        // then
        assertThat(popup.getPopupTtlNm()).isEqualTo("NEW");
        assertThat(popup.getNtceBgnde()).isEqualTo(LocalDate.of(2026, 2, 1));
        assertThat(popup.getNtceEndde()).isEqualTo(LocalDate.of(2026, 2, 28));
        assertThat(popup.getLastMdfrId()).isEqualTo("updater");
    }

    @Test
    @DisplayName("팝업 수정 - 같은 첨부 유지와 null 분리는 재할당 검증을 건너뛴다")
    void updatePopup_sameOrDetachedAttachmentSkipsAssignmentCheck() {
        authenticate("POPUP_UPDATE");
        Popup popup = Popup.builder()
                .popupSn(1L)
                .popupTtlNm("OLD")
                .fileUrl("/api/v1/files/101")
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(popup, "version", 0);
        given(popupRepository.findById(1L)).willReturn(Optional.of(popup));

        popupService.updatePopup(1L, "updater", PopupDto.builder()
                .popupTtlNm("NEW")
                .fileUrl("/api/v1/files/download?fileId=101")
                .version(0)
                .build());
        popupService.updatePopup(1L, "updater", PopupDto.builder()
                .popupTtlNm("DETACHED")
                .fileUrl(null)
                .version(0)
                .build());

        verifyNoInteractions(attachmentAssignmentPolicy);
        assertThat(popup.getFileUrl()).isNull();
    }

    @Test
    @DisplayName("팝업 수정 - 새 내부 첨부 할당 거부 시 기존 엔티티를 변경하지 않는다")
    void updatePopup_deniedChangedAttachmentDoesNotMutate() {
        authenticate("POPUP_UPDATE");
        Popup popup = Popup.builder()
                .popupSn(1L)
                .popupTtlNm("OLD")
                .fileUrl("/api/v1/files/100")
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(popup, "version", 0);
        given(popupRepository.findById(1L)).willReturn(Optional.of(popup));
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(attachmentAssignmentPolicy).assertAssignable(101L);

        assertThatThrownBy(() -> popupService.updatePopup(1L, "updater", PopupDto.builder()
                        .popupTtlNm("NEW")
                        .fileUrl("/api/v1/files/101")
                        .version(0)
                        .build()))
                .isInstanceOf(BusinessException.class);

        assertThat(popup.getPopupTtlNm()).isEqualTo("OLD");
        assertThat(popup.getFileUrl()).isEqualTo("/api/v1/files/100");
        assertThat(popup.getLastMdfrId()).isNull();
        verify(attachmentAssignmentPolicy).assertAssignable(101L);
    }

    @Test
    @DisplayName("팝업 수정 - 자원 없음 예외")
    void updatePopup_NotFound_ShouldThrowBusinessException() {
        authenticate("POPUP_UPDATE");
        // given
        given(popupRepository.findById(1L)).willReturn(Optional.empty());
        PopupDto dto = PopupDto.builder().popupTtlNm("NEW").build();

        // when & then
        assertThatThrownBy(() -> popupService.updatePopup(1L, "updater", dto))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("팝업 삭제 - 성공")
    void deletePopup_Success() {
        authenticate("POPUP_DELETE");
        // given
        given(popupRepository.existsById(1L)).willReturn(true);

        // when
        popupService.deletePopup(1L);

        // then
        verify(popupRepository, times(1)).deleteById(1L);
    }

    @Test
    @DisplayName("팝업 삭제 - 자원 없음 예외")
    void deletePopup_NotFound_ShouldThrowBusinessException() {
        authenticate("POPUP_DELETE");
        // given
        given(popupRepository.existsById(1L)).willReturn(false);

        // when & then
        assertThatThrownBy(() -> popupService.deletePopup(1L))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @ParameterizedTest(name = "{0} denies {1} before accessing business dependencies")
    @MethodSource("deniedWrites")
    void writesRequireTheirExactPermission(String operation, String identity) {
        authenticateDeniedIdentity(identity, operation);
        PopupDto request = PopupDto.builder().popupTtlNm("Changed").fileUrl("/api/v1/files/101").build();

        assertDenied(() -> {
            switch (operation) {
                case "CREATE" -> popupService.createPopup("operator", request);
                case "UPDATE" -> popupService.updatePopup(1L, "operator", request);
                case "DELETE" -> popupService.deletePopup(1L);
                default -> throw new IllegalArgumentException(operation);
            }
        });

        verifyNoInteractions(popupRepository, attachmentAssignmentPolicy);
    }

    @Test
    void foreignCreatorIsManageableOnlyWithTheExactUpdateOrDeleteGrant() {
        Popup existing = Popup.builder().popupSn(1L).popupTtlNm("Original").build();
        existing.setFrstRgtrId("foreign-creator");
        org.springframework.test.util.ReflectionTestUtils.setField(existing, "version", 0);
        PopupDto request = PopupDto.builder().popupTtlNm("Changed").version(0).build();

        authenticate();
        assertDenied(() -> popupService.updatePopup(1L, "operator", request));
        assertDenied(() -> popupService.deletePopup(1L));
        verifyNoInteractions(popupRepository, attachmentAssignmentPolicy);
        assertThat(existing.getPopupTtlNm()).isEqualTo("Original");

        authenticate("POPUP_UPDATE");
        given(popupRepository.findById(1L)).willReturn(Optional.of(existing));
        popupService.updatePopup(1L, "operator", request);
        assertThat(existing.getPopupTtlNm()).isEqualTo("Changed");
        assertThat(existing.getFrstRgtrId()).isEqualTo("foreign-creator");

        authenticate("POPUP_DELETE");
        given(popupRepository.existsById(1L)).willReturn(true);
        popupService.deletePopup(existing.getPopupSn());
        verify(popupRepository).deleteById(1L);
    }

    private static Stream<Arguments> deniedWrites() {
        return Stream.of("CREATE", "UPDATE", "DELETE").flatMap(operation ->
                Stream.of("NO_AUTHENTICATION", "ANONYMOUS", "NO_PERMISSION", "WRONG_OPERATION", "ROLE_ONLY")
                        .map(identity -> Arguments.of(operation, identity)));
    }

    static Stream<Arguments> invalidSavedDimensions() {
        return Stream.of("width", "height").flatMap(field ->
                Stream.of("", " ", "99", "4001", "0100", "100.0", "+100", "1e3", "100\n", "100\r\n")
                        .map(value -> Arguments.of(field, value)));
    }

    @ParameterizedTest
    @MethodSource("invalidSavedDimensions")
    void invalidDimensionsDoNotCreateOrClaimAttachments(String field, String value) {
        authenticate("POPUP_CREATE");
        PopupDto request = PopupDto.builder().popupTtlNm("변경").fileUrl("/api/v1/files/999")
                .popupWdthSz("width".equals(field) ? value : "400")
                .popupVrtcSz("height".equals(field) ? value : "300").build();

        assertThatThrownBy(() -> popupService.createPopup("operator", request))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        verifyNoInteractions(popupRepository, attachmentAssignmentPolicy);
    }

    @ParameterizedTest
    @MethodSource("invalidSavedDimensions")
    void invalidDimensionsLeaveAnExistingPopupAndAuditUnchanged(String field, String value) {
        authenticate("POPUP_UPDATE");
        Popup existing = Popup.builder().popupSn(1L).popupTtlNm("기존").fileUrl("/api/v1/files/101")
                .popupWdthSz("400").popupVrtcSz("300").build();
        org.springframework.test.util.ReflectionTestUtils.setField(existing, "version", 0);
        existing.setLastMdfrId("previous");
        given(popupRepository.findById(1L)).willReturn(Optional.of(existing));
        PopupDto request = PopupDto.builder().popupTtlNm("변경").fileUrl("/api/v1/files/999").version(0)
                .popupWdthSz("width".equals(field) ? value : "400")
                .popupVrtcSz("height".equals(field) ? value : "300").build();

        assertThatThrownBy(() -> popupService.updatePopup(1L, "operator", request))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(existing.getPopupTtlNm()).isEqualTo("기존");
        assertThat(existing.getFileUrl()).isEqualTo("/api/v1/files/101");
        assertThat(existing.getPopupWdthSz()).isEqualTo("400");
        assertThat(existing.getPopupVrtcSz()).isEqualTo("300");
        assertThat(existing.getVersion()).isZero();
        assertThat(existing.getLastMdfrId()).isEqualTo("previous");
        verify(popupRepository, never()).save(any());
        verifyNoInteractions(attachmentAssignmentPolicy);
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.NullSource
    @org.junit.jupiter.params.provider.ValueSource(strings = {"100", "999", "1000", "3999", "4000"})
    void canonicalDimensionsAndNullKeepTheirValuesOnCreateAndUpdate(String value) {
        authenticate("POPUP_CREATE", "POPUP_UPDATE");
        given(popupRepository.save(any(Popup.class))).willAnswer(invocation -> invocation.getArgument(0));
        PopupDto request = PopupDto.builder().popupTtlNm("유효").popupWdthSz(value).popupVrtcSz(value).version(0).build();

        popupService.createPopup("operator", request);

        var saved = org.mockito.ArgumentCaptor.forClass(Popup.class);
        verify(popupRepository).save(saved.capture());
        assertThat(saved.getValue().getPopupWdthSz()).isEqualTo(value);
        assertThat(saved.getValue().getPopupVrtcSz()).isEqualTo(value);
        Popup existing = Popup.builder().popupSn(1L).popupTtlNm("기존").popupWdthSz("0100").popupVrtcSz("5000").build();
        org.springframework.test.util.ReflectionTestUtils.setField(existing, "version", 0);
        given(popupRepository.findById(1L)).willReturn(Optional.of(existing));
        popupService.updatePopup(1L, "operator", request);
        assertThat(existing.getPopupWdthSz()).isEqualTo(value);
        assertThat(existing.getPopupVrtcSz()).isEqualTo(value);
        verifyNoInteractions(attachmentAssignmentPolicy);
    }

    @Test
    void legacyDimensionsAreStillReturnedByReadOperations() {
        Popup existing = Popup.builder().popupSn(1L).popupTtlNm("기존").popupWdthSz("0100").popupVrtcSz("5000").build();
        given(popupRepository.findById(1L)).willReturn(Optional.of(existing));
        given(popupRepository.findAll(any(Pageable.class))).willReturn(new PageImpl<>(List.of(existing)));

        assertThat(popupService.getPopup(1L).getPopupWdthSz()).isEqualTo("0100");
        assertThat(popupService.getPopupList(null, PageRequest.of(0, 10)).getContent().getFirst().getPopupVrtcSz()).isEqualTo("5000");
    }

    @Test
    void invalidDimensionsStillRequireTheExactWritePermission() {
        authenticate();
        PopupDto request = PopupDto.builder().popupTtlNm("변경").popupWdthSz("99").version(0).build();

        assertDenied(() -> popupService.createPopup("operator", request));
        assertDenied(() -> popupService.updatePopup(1L, "operator", request));
        verifyNoInteractions(popupRepository, attachmentAssignmentPolicy);
    }

    private static void authenticateDeniedIdentity(String identity, String operation) {
        switch (identity) {
            case "NO_AUTHENTICATION" -> SecurityContextHolder.clearContext();
            case "ANONYMOUS" -> {
                var user = principal("POPUP_" + operation);
                SecurityContextHolder.getContext().setAuthentication(
                        new AnonymousAuthenticationToken("fixture", user, user.getAuthorities()));
            }
            case "NO_PERMISSION" -> authenticate();
            case "WRONG_OPERATION" -> authenticate("CREATE".equals(operation) ? "POPUP_DELETE" : "POPUP_CREATE");
            case "ROLE_ONLY" -> {
                var user = CustomUserDetails.builder().userId("operator").esntlId("ESNTL_operator").enabled(true)
                        .groups(List.of("ROLE_ADMIN", "ROLE_SYSTEM")).roleName("ADMIN").authorCode("ROLE_ADMIN").build();
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"), new SimpleGrantedAuthority("ROLE_SYSTEM"))));
            }
            default -> throw new IllegalArgumentException(identity);
        }
    }

    private static CustomUserDetails principal(String... permissions) {
        return CustomUserDetails.builder().userId("operator").esntlId("ESNTL_operator").enabled(true)
                .permissions(List.of(permissions)).authorizationVersion("fixture").build();
    }

    private static void authenticate(String... permissions) {
        var user = principal(permissions);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    private static void assertDenied(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }
}
