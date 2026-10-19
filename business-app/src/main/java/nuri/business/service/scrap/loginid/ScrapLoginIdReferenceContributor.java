package nuri.business.service.scrap.loginid;

import nuri.foundation.core.user.LoginIdReferenceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/** 스크랩의 목록·열람·수정·삭제는 등록자 {@code frst_rgtr_id}(로그인 ID)로 판정한다({@code ScrapService}). */
@Component
public class ScrapLoginIdReferenceContributor implements LoginIdReferenceContributor {

    @Override
    public Collection<Reference> loginIdReferences() {
        return List.of(new Reference("tb_bbs_scrap", "frst_rgtr_id"));
    }
}
