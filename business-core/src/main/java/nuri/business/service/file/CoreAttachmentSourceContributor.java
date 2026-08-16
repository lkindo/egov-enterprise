package nuri.business.service.file;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/** 필수 core 도메인의 첨부 참조 규칙. */
@Component
public class CoreAttachmentSourceContributor implements AttachmentSourceContributor {

    @Override
    public Collection<AttachmentSource> sources() {
        return List.of(AttachmentSource.DEPT_TASK);
    }
}
