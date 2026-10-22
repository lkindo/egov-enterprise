package nuri.business.service.cms;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.cms.CmsContent;
import nuri.business.domain.cms.CmsContentRepository;
import nuri.business.domain.cms.CmsSiteSetting;
import nuri.business.domain.cms.CmsSiteSettingRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.cms.dto.CmsHomeDto;
import nuri.business.service.cms.dto.CmsHomeUpdateRequest;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.util.EntityVersions;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/**
 * 업무 홈 소개 지정(ADR-0039 결정 2). 업무 홈(`/`)은 대체하지 않는다 — 지정한 게시 페이지가 홈 맨 위 조각으로 보일 뿐이다.
 *
 * <p>지정과 게시 중지는 홈 설정 행 → 콘텐츠 행 순서로 잠근다. 지정은 게시 중이고 보관하지 않은 페이지만 받고, 게시 중지는 같은
 * 트랜잭션에서 지정을 비운다. 재게시는 지정을 되살리지 않는다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CmsHomeService {

    private final CmsSiteSettingRepository siteSettingRepository;
    private final CmsContentRepository contentRepository;
    private final SensitiveAuditPort sensitiveAudit;

    public CmsHomeDto getHome() {
        CmsSiteSetting setting = siteSettingRepository.findByStngCd(CmsSiteSetting.HOME_INTRO).orElse(null);
        if (setting == null) {
            return new CmsHomeDto(null, null, null, 0);
        }
        CmsContent content = setting.getContsSn() == null ? null
                : contentRepository.findById(setting.getContsSn()).orElse(null);
        return new CmsHomeDto(setting.getContsSn(), content == null ? null : content.getContsPathNm(),
                content == null ? null : content.getContsTtl(), setting.getVersion());
    }

    @Transactional
    public CmsHomeDto updateHome(CmsHomeUpdateRequest request) {
        SecurityUtil.assertPermission("CMS_HOME_UPDATE");
        CmsSiteSetting setting = lockHome();
        if (setting == null) {
            setting = siteSettingRepository.save(CmsSiteSetting.create(CmsSiteSetting.HOME_INTRO));
        }
        EntityVersions.assertCurrent(request.getVersion(), Objects.requireNonNullElse(setting.getVersion(), 0));
        Long contsSn = request.getContsSn();
        if (contsSn != null) {
            CmsContent content = contentRepository.findByIdForUpdate(contsSn)
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "콘텐츠 페이지를 찾을 수 없습니다"));
            if (!content.isPublished() || content.isArchived()) {
                throw new BusinessException(CommonErrorCode.INVALID_STATE, "게시 중인 페이지만 업무 홈에 보일 수 있습니다");
            }
        }
        setting.point(contsSn);
        siteSettingRepository.flush();
        sensitiveAudit.recordMutation("CMS_HOME_UPDATE", contsSn == null ? "NONE" : contsSn.toString());
        return getHome();
    }

    /** 지금 홈에 지정된 페이지(없으면 null). 게시 상태는 보지 않는다 — 읽는 쪽이 게시 중인지 다시 확인한다. */
    Long currentHomeContsSn() {
        return siteSettingRepository.findByStngCd(CmsSiteSetting.HOME_INTRO).map(CmsSiteSetting::getContsSn).orElse(null);
    }

    /** 게시 중지가 지정을 비우기 전에 잡는 잠금. 설정 행이 없는 구성이면 null 이다. */
    CmsSiteSetting lockHome() {
        return siteSettingRepository.findByStngCdForUpdate(CmsSiteSetting.HOME_INTRO).orElse(null);
    }
}
