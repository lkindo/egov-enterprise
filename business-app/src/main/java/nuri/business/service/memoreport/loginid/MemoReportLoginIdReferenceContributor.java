package nuri.business.service.memoreport.loginid;

import nuri.foundation.core.user.LoginIdReferenceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 메모 보고의 수정·삭제는 작성자 {@code frst_rgtr_id}(로그인 ID)로 판정한다({@code MemoReportService}). 열람의 당사자
 * ({@code user_id}·{@code rptr_id})는 esntlId 라 여기 넣지 않는다. 개인 첨부의 소유 근거이기도 하다.
 */
@Component
public class MemoReportLoginIdReferenceContributor implements LoginIdReferenceContributor {

    @Override
    public Collection<Reference> loginIdReferences() {
        return List.of(new Reference("tb_memo_rpt_info", "frst_rgtr_id"));
    }
}
