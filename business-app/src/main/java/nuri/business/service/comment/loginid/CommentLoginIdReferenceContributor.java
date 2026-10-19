package nuri.business.service.comment.loginid;

import nuri.foundation.core.user.LoginIdReferenceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 댓글의 수정·삭제는 등록자 {@code frst_rgtr_id}(로그인 ID)로 판정한다({@code CommentService}). 사용자를 지울 때 작성자
 * ({@code wrter_id}, esntlId)는 시스템 계정으로 넘기지만 등록자 컬럼은 남는다.
 */
@Component
public class CommentLoginIdReferenceContributor implements LoginIdReferenceContributor {

    @Override
    public Collection<Reference> loginIdReferences() {
        return List.of(new Reference("tb_bbs_comment", "frst_rgtr_id"));
    }
}
