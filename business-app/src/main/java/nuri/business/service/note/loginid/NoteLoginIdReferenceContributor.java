package nuri.business.service.note.loginid;

import nuri.foundation.core.user.LoginIdReferenceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 쪽지의 발신·수신은 esntlId 로 판정하지만 첨부의 소유 근거는 등록자 {@code frst_rgtr_id}(로그인 ID)도 쓴다
 * ({@code AttachmentSource.NOTE}).
 */
@Component
public class NoteLoginIdReferenceContributor implements LoginIdReferenceContributor {

    @Override
    public Collection<Reference> loginIdReferences() {
        return List.of(new Reference("tb_note_info", "frst_rgtr_id"));
    }
}
