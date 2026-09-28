package nuri.business.service.system.content.community;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.system.content.community.CommunityRepository;
import nuri.foundation.core.template.TemplateReferenceContributor;
import org.springframework.stereotype.Component;

/** 폐쇄된 커뮤니티도 원장 참조를 유지하므로 사용 여부와 무관하게 삭제를 보호한다. */
@Component
@RequiredArgsConstructor
public class CommunityTemplateReferenceContributor implements TemplateReferenceContributor {
    private final CommunityRepository communityRepository;
    @Override public String sourceLabel() { return "커뮤니티"; }
    @Override public long countReferences(String templateId) { return communityRepository.countByTmpltId(templateId); }
}
