package nuri.business.service.promotion.popup;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.promotion.popup.Popup;
import nuri.business.domain.promotion.popup.PopupDomainRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.promotion.popup.dto.PopupDto;
import nuri.business.service.promotion.popup.dto.PopupSaveRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PopupService {

    private static final String INTERNAL_FILE_PREFIX = "/api/v1/files/";
    private static final Pattern CANONICAL_FILE_URL =
            Pattern.compile("\\A/api/v1/files/([1-9][0-9]*)\\z");
    private static final Pattern LEGACY_FILE_URL =
            Pattern.compile("\\A/api/v1/files/download\\?fileId=([1-9][0-9]*)\\z");
    private static final Pattern SIZE_PATTERN = Pattern.compile(PopupSaveRequest.SIZE_PATTERN);

    private final PopupDomainRepository popupRepository;
    private final AttachmentAssignmentPolicy attachmentAssignmentPolicy;

    public Page<PopupDto> getPopupList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return popupRepository.findAll(Objects.requireNonNull(pageable)).map(PopupDto::from);
        }
        return popupRepository.findByPopupTtlNmContaining(keyword, Objects.requireNonNull(pageable))
                .map(PopupDto::from);
    }

    public List<PopupDto> getActivePopups() {
        return popupRepository.findActivePopups(LocalDate.now()).stream()
                .map(PopupDto::from)
                .collect(Collectors.toList());
    }

    /** 관리 화면의 단건 조회 — 게시 여부·기간과 관계없이 돌려준다. 사용자 화면은 {@link #getPublishedPopup} 을 쓴다. */
    public PopupDto getPopup(Long popupSn) {
        return popupRepository.findById(Objects.requireNonNull(popupSn))
                .map(PopupDto::from)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    /**
     * 사용자 화면의 단건 조회 — 오늘 게시 중인 팝업만 돌려준다. 게시하지 않았거나 기간 밖이면 없는 것과 같은 404 다.
     *
     * <p>[2026-10-19] 종전에는 사용자 API 가 관리용 {@link #getPopup} 을 그대로 불러, 번호만 알면 게시를 끈 팝업이나
     * 아직 시작하지 않은·끝난 팝업도 읽혔다(활성 목록은 게시 중인 것만 보이는데 단건만 새던 것). 판정은 활성 목록과 같은
     * {@link Popup#isPublishedOn} 이다.
     */
    public PopupDto getPublishedPopup(Long popupSn) {
        LocalDate today = LocalDate.now();
        return popupRepository.findById(Objects.requireNonNull(popupSn))
                .filter(popup -> popup.isPublishedOn(today))
                .map(PopupDto::from)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public Long createPopup(String userId, PopupDto dto) {
        SecurityUtil.assertPermission("POPUP_CREATE");
        validateDimensions(dto);
        assertLinkable(dto.getFileUrl());
        Long atchFileSn = parseRequestedAttachmentId(dto.getFileUrl());
        LocalDate[] period = noticePeriod(dto);
        if (atchFileSn != null) {
            attachmentAssignmentPolicy.assertAssignable(atchFileSn);
        }
        Popup popup = Popup.builder()
                .popupTtlNm(dto.getPopupTtlNm())
                .fileUrl(dto.getFileUrl())
                .popupWdthPstn(dto.getPopupWdthPstn())
                .popupVrtcPstn(dto.getPopupVrtcPstn())
                .popupVrtcSz(dto.getPopupVrtcSz())
                .popupWdthSz(dto.getPopupWdthSz())
                .ntceBgnde(period[0])
                .ntceEndde(period[1])
                .stopvewSetupYn(dto.getStopvewSetupYn())
                .ntceYn(dto.getNtceYn())
                .build();
        popup.setFrstRgtrId(userId);
        Popup saved = popupRepository.save(Objects.requireNonNull(popup));
        return saved.getPopupSn();
    }

    @Transactional
    public void updatePopup(Long popupSn, String userId, PopupDto dto) {
        SecurityUtil.assertPermission("POPUP_UPDATE");
        Popup popup = popupRepository.findById(Objects.requireNonNull(popupSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        // [2026-10-18] 화면이 읽은 버전과 다르면 다른 사람이 먼저 고친 것이다 — 덮지 않고 409 로 알린다.
        nuri.foundation.core.util.EntityVersions.assertCurrent(dto.getVersion(), popup.getVersion());
        validateDimensions(dto);
        LocalDate[] period = noticePeriod(dto);
        if (!Objects.equals(popup.getFileUrl(), dto.getFileUrl())) {
            assertLinkable(dto.getFileUrl());
        }

        Long requestedAtchFileSn = parseRequestedAttachmentId(dto.getFileUrl());
        Long currentAtchFileSn = parsePersistedAttachmentId(popup.getFileUrl());
        if (requestedAtchFileSn != null && !Objects.equals(currentAtchFileSn, requestedAtchFileSn)) {
            attachmentAssignmentPolicy.assertAssignable(requestedAtchFileSn);
        }

        popup.update(dto.getPopupTtlNm(), dto.getFileUrl(), dto.getPopupWdthPstn(),
                dto.getPopupVrtcPstn(),
                dto.getPopupVrtcSz(), dto.getPopupWdthSz(),
                period[0],
                period[1],
                dto.getStopvewSetupYn(), dto.getNtceYn());
        popup.setLastMdfrId(userId);
    }

    @Transactional
    public void deletePopup(Long popupSn) {
        SecurityUtil.assertPermission("POPUP_DELETE");
        if (!popupRepository.existsById(Objects.requireNonNull(popupSn))) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        popupRepository.deleteById(Objects.requireNonNull(popupSn));
    }

    private static void validateDimensions(PopupDto dto) {
        if ((dto.getPopupWdthSz() != null && !SIZE_PATTERN.matcher(dto.getPopupWdthSz()).matches())
                || (dto.getPopupVrtcSz() != null && !SIZE_PATTERN.matcher(dto.getPopupVrtcSz()).matches())) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, PopupSaveRequest.SIZE_MESSAGE);
        }
    }

    /**
     * 게시 기간 — 시작일·종료일을 읽고 순서를 확인한다. [2026-10-18] 종전에는 순서를 화면(배너·팝업 관리 화면의 폼
     * 스키마)만 확인해, API 를 직접 부르면 종료일이 시작일보다 앞선 팝업이 저장됐고 그 팝업은 어느 날에도 뜨지 않았다
     * ({@code findActivePopups} 는 오늘이 두 날짜 사이인 행만 고른다). 둘 중 하나가 비면 순서를 볼 수 없어 그대로 둔다.
     *
     * @return {@code [시작일, 종료일]} — 비어 있으면 null
     */
    private static LocalDate[] noticePeriod(PopupDto dto) {
        LocalDate begin = noticeDate(dto.getNtceBgnde());
        LocalDate end = noticeDate(dto.getNtceEndde());
        if (begin != null && end != null && end.isBefore(begin)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "게시 종료일은 시작일보다 빠를 수 없습니다.");
        }
        return new LocalDate[] {begin, end};
    }

    /**
     * 게시 일자(YYYY-MM-DD). 형식이 아니거나 없는 날짜면 400 이다 — 종전에는 파싱 예외가 그대로 500 이 됐다
     * (2026-09-24 ZAP API 스캔). 화면은 같은 규칙을 미리 검사하므로 이 경로는 API 를 직접 부를 때 닿는다.
     */
    private static LocalDate noticeDate(String value) {
        if (value == null) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException e) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "유효한 게시 일자(YYYY-MM-DD)를 입력하세요.");
        }
    }

    private static void assertLinkable(String fileUrl) {
        if (!nuri.foundation.core.util.SafeUrls.isLinkable(fileUrl)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "이미지 주소는 /로 시작하는 사이트 안 경로이거나 http(s) 주소여야 합니다.");
        }
    }

    /**
     * 요청 URL이 파일 API를 가리키면 첨부 ID를 반환한다. 파일 API prefix를 사용하면서 두 정식
     * 형식 중 어느 것에도 정확히 일치하지 않는 값은 일반 URL로 흘려보내지 않고 거부한다.
     */
    private static Long parseRequestedAttachmentId(String fileUrl) {
        if (fileUrl == null) {
            return null;
        }
        Long atchFileSn = matchAttachmentId(fileUrl);
        if (atchFileSn != null) {
            return atchFileSn;
        }
        if (fileUrl.startsWith(INTERNAL_FILE_PREFIX)) {
            throw new BusinessException(
                    CommonErrorCode.INVALID_INPUT_VALUE,
                    "Invalid internal attachment URL");
        }
        return null;
    }

    /** 기존 저장값은 비교에만 사용한다. 과거의 비정식 값이 있더라도 정식 URL로 교정할 수 있어야 한다. */
    private static Long parsePersistedAttachmentId(String fileUrl) {
        if (fileUrl == null) {
            return null;
        }
        try {
            return matchAttachmentId(fileUrl);
        } catch (BusinessException malformedPersistedUrl) {
            return null;
        }
    }

    private static Long matchAttachmentId(String fileUrl) {
        Matcher canonical = CANONICAL_FILE_URL.matcher(fileUrl);
        if (canonical.matches()) {
            return parseAttachmentId(canonical.group(1));
        }
        Matcher legacy = LEGACY_FILE_URL.matcher(fileUrl);
        if (legacy.matches()) {
            return parseAttachmentId(legacy.group(1));
        }
        return null;
    }

    private static Long parseAttachmentId(String rawId) {
        try {
            long atchFileSn = Long.parseLong(rawId);
            if (atchFileSn <= 0 || !rawId.equals(Long.toString(atchFileSn))) {
                throw new NumberFormatException("non-canonical attachment ID");
            }
            return atchFileSn;
        } catch (NumberFormatException overflow) {
            throw new BusinessException(
                    CommonErrorCode.INVALID_INPUT_VALUE,
                    "Invalid internal attachment URL");
        }
    }
}
