package nuri.business.service.reward.loginid;

import nuri.foundation.core.user.LoginIdReferenceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 포상의 쓰기는 기능 권한으로 판정하지만, 인사 민감 정보인 포상 첨부의 개인 소유 근거는 등록자 {@code frst_rgtr_id}
 * (로그인 ID)다({@code AttachmentSource.REWARD}, 관리자도 우회하지 못한다).
 */
@Component
public class RewardLoginIdReferenceContributor implements LoginIdReferenceContributor {

    @Override
    public Collection<Reference> loginIdReferences() {
        return List.of(new Reference("tb_rward_manage", "frst_rgtr_id"));
    }
}
