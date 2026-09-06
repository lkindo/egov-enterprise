package nuri.business.service.system.content.popup;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.system.content.popup.Popup;
import nuri.business.domain.system.content.popup.PopupDomainRepository;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.system.content.popup.dto.PopupDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
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

    public PopupDto getPopup(Long popupSn) {
        return popupRepository.findById(Objects.requireNonNull(popupSn))
                .map(PopupDto::from)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public Long createPopup(String userId, PopupDto dto) {
        Long atchFileSn = parseRequestedAttachmentId(dto.getFileUrl());
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
                .ntceBgnde(dto.getNtceBgnde() != null ? LocalDate.parse(dto.getNtceBgnde()) : null)
                .ntceEndde(dto.getNtceEndde() != null ? LocalDate.parse(dto.getNtceEndde()) : null)
                .stopvewSetupYn(dto.getStopvewSetupYn())
                .ntceYn(dto.getNtceYn())
                .build();
        popup.setFrstRgtrId(userId);
        Popup saved = popupRepository.save(Objects.requireNonNull(popup));
        return saved.getPopupSn();
    }

    @Transactional
    public void updatePopup(Long popupSn, String userId, PopupDto dto) {
        Popup popup = popupRepository.findById(Objects.requireNonNull(popupSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        Long requestedAtchFileSn = parseRequestedAttachmentId(dto.getFileUrl());
        Long currentAtchFileSn = parsePersistedAttachmentId(popup.getFileUrl());
        if (requestedAtchFileSn != null && !Objects.equals(currentAtchFileSn, requestedAtchFileSn)) {
            attachmentAssignmentPolicy.assertAssignable(requestedAtchFileSn);
        }

        popup.update(dto.getPopupTtlNm(), dto.getFileUrl(), dto.getPopupWdthPstn(),
                dto.getPopupVrtcPstn(),
                dto.getPopupVrtcSz(), dto.getPopupWdthSz(),
                dto.getNtceBgnde() != null ? LocalDate.parse(dto.getNtceBgnde()) : null,
                dto.getNtceEndde() != null ? LocalDate.parse(dto.getNtceEndde()) : null,
                dto.getStopvewSetupYn(), dto.getNtceYn());
        popup.setLastMdfrId(userId);
    }

    @Transactional
    public void deletePopup(Long popupSn) {
        if (!popupRepository.existsById(Objects.requireNonNull(popupSn))) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        popupRepository.deleteById(Objects.requireNonNull(popupSn));
    }

    public List<String> getPopupWhiteList() {
        return popupRepository.findAll().stream()
                .map(p -> p.getFileUrl())
                .collect(Collectors.toList());
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
