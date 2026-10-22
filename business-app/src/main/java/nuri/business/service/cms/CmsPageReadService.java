package nuri.business.service.cms;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.cms.CmsContent;
import nuri.business.domain.cms.CmsContentRepository;
import nuri.business.domain.cms.CmsContentRevision;
import nuri.business.domain.cms.CmsContentRevisionRepository;
import nuri.business.domain.cms.CmsSiteSetting;
import nuri.business.domain.cms.CmsSiteSettingRepository;
import nuri.business.service.cms.dto.CmsPublishedPageDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.regex.Pattern;

/**
 * 사용자에게 보이는 게시본(ADR-0039 결정 3). 로그인 사용자 누구나 읽는다. 초안·지난 게시본은 이 경로로 나가지 않고, 미게시·게시
 * 중지·보관 페이지는 모두 "없음" 으로 같게 답한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CmsPageReadService {

    private static final Pattern PATH = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");

    private final CmsContentRepository contentRepository;
    private final CmsContentRevisionRepository revisionRepository;
    private final CmsSiteSettingRepository siteSettingRepository;
    private final CmsDocumentValidator validator;

    public CmsPublishedPageDto getPublishedPage(String contsPathNm) {
        Optional<CmsContent> content = contsPathNm == null || contsPathNm.length() > 100 || !PATH.matcher(contsPathNm).matches()
                ? Optional.empty() : contentRepository.findByContsPathNm(contsPathNm);
        return content.flatMap(this::published)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "게시된 페이지가 없습니다"));
    }

    /** 업무 홈 맨 위에 보일 게시본. 지정이 없거나 게시 중이 아니면 비어 있다. */
    public Optional<CmsPublishedPageDto> getHomeIntro() {
        return siteSettingRepository.findByStngCd(CmsSiteSetting.HOME_INTRO)
                .map(CmsSiteSetting::getContsSn)
                .flatMap(contentRepository::findById)
                .flatMap(this::published);
    }

    private Optional<CmsPublishedPageDto> published(CmsContent content) {
        if (!content.isPublished() || content.isArchived()) {
            return Optional.empty();
        }
        return revisionRepository.findById(content.getContsRvsnSn()).map(revision -> toDto(content, revision));
    }

    private CmsPublishedPageDto toDto(CmsContent content, CmsContentRevision revision) {
        long number = revisionRepository.countByContsSnAndContsRvsnSnLessThanEqual(content.getContsSn(),
                revision.getContsRvsnSn());
        return new CmsPublishedPageDto(content.getContsPathNm(), revision.getContsTtl(), revision.getContsExpln(),
                validator.toResponse(revision.getContsDocCn()), number, revision.getCrtDt());
    }
}
