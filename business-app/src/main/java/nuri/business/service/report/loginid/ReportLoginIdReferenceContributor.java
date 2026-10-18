package nuri.business.service.report.loginid;

import nuri.foundation.core.user.LoginIdReferenceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 업무 보고의 주인은 로그인 ID 다 — 수정·삭제·상세는 {@code frst_rgtr_id}, 일반 사용자의 목록은 {@code user_id} 로 거른다
 * ({@code WorkReportService}). 개인 첨부의 소유 근거이기도 하다.
 */
@Component
public class ReportLoginIdReferenceContributor implements LoginIdReferenceContributor {

    @Override
    public Collection<Reference> loginIdReferences() {
        return List.of(new Reference("tb_rpt_info", "frst_rgtr_id"), new Reference("tb_rpt_info", "user_id"));
    }
}
