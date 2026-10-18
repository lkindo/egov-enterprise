package nuri.business.service.board.loginid;

import nuri.foundation.core.user.LoginIdReferenceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 게시판 기능이 로그인 ID 로 주인을 판정하는 기록.
 *
 * <ul>
 *   <li>{@code tb_bbs_item.frst_rgtr_id} — 게시글 첨부의 소유 근거({@code JdbcAttachmentReferenceResolver#queryBoard}).
 *       사용자를 지울 때 작성자({@code user_id}, esntlId)는 시스템 계정으로 넘기지만 등록자 컬럼은 남는다.</li>
 *   <li>{@code tb_dgstfn_info.frst_rgtr_id} — 만족도는 한 사람에 한 건이고 작성자가 고치고 지운다({@code SatisfactionService}).</li>
 * </ul>
 */
@Component
public class BoardLoginIdReferenceContributor implements LoginIdReferenceContributor {

    @Override
    public Collection<Reference> loginIdReferences() {
        return List.of(new Reference("tb_bbs_item", "frst_rgtr_id"), new Reference("tb_dgstfn_info", "frst_rgtr_id"));
    }
}
