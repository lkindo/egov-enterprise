package nuri.business.service.cms.attachment;

import nuri.business.service.file.AttachmentSource;
import nuri.business.service.file.AttachmentSourceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/** 콘텐츠 페이지 이미지의 첨부 참조원(ADR-0039 결정 8). 콘텐츠 기능이 빠진 구성에서는 이 등록도 함께 빠진다. */
@Component
public class CmsAttachmentSourceContributor implements AttachmentSourceContributor {
    @Override
    public Collection<AttachmentSource> sources() {
        return List.of(AttachmentSource.CMS_PAGE);
    }
}
