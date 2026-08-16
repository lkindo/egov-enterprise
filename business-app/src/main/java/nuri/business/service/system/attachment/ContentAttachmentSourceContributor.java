package nuri.business.service.system.attachment;

import nuri.business.service.file.AttachmentSource;
import nuri.business.service.file.AttachmentSourceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

@Component
public class ContentAttachmentSourceContributor implements AttachmentSourceContributor {
    @Override
    public Collection<AttachmentSource> sources() {
        return List.of(AttachmentSource.POPUP, AttachmentSource.BANNER);
    }
}
