package nuri.business.service.mail.loginid;

import nuri.foundation.core.user.LoginIdReferenceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 보낸 메일의 열람·삭제·다시 보내기와 일반 사용자의 발송 이력 목록은 발신자 {@code frst_rgtr_id}(로그인 ID)로 판정한다
 * ({@code MailService}). 개인 첨부의 소유 근거이기도 하다.
 */
@Component
public class MailLoginIdReferenceContributor implements LoginIdReferenceContributor {

    @Override
    public Collection<Reference> loginIdReferences() {
        return List.of(new Reference("tb_email_dsptch_manage", "frst_rgtr_id"));
    }
}
