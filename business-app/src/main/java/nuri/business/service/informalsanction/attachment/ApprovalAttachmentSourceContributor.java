package nuri.business.service.informalsanction.attachment;

import nuri.business.service.file.AttachmentSource;
import nuri.business.service.file.AttachmentSourceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/** 약식결재 첨부 참조원(V2_151) — 문서 머리·차수 이력·임시저장. 결재 기능이 생성물에서 빠지면 함께 빠진다. */
@Component
public class ApprovalAttachmentSourceContributor implements AttachmentSourceContributor {
    @Override
    public Collection<AttachmentSource> sources() {
        return List.of(AttachmentSource.APPROVAL, AttachmentSource.APPROVAL_REVISION, AttachmentSource.APPROVAL_DRAFT);
    }
}
