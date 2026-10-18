package nuri.business.service.promotion.loginid;

import nuri.foundation.core.user.LoginIdReferenceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 팝업·배너의 쓰기는 기능 권한으로 판정하지만, 그 이미지 첨부의 소유 근거(삭제할 수 있는 사람)는 등록자
 * {@code frst_rgtr_id}(로그인 ID)다({@code AttachmentSource.POPUP}·{@code BANNER}).
 */
@Component
public class PromotionLoginIdReferenceContributor implements LoginIdReferenceContributor {

    @Override
    public Collection<Reference> loginIdReferences() {
        return List.of(new Reference("tb_popup_info", "frst_rgtr_id"), new Reference("tb_bnr_info", "frst_rgtr_id"));
    }
}
