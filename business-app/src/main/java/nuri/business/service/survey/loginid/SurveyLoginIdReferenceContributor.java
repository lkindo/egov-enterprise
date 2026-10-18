package nuri.business.service.survey.loginid;

import nuri.foundation.core.user.LoginIdReferenceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 투표 참여 여부는 참여자 {@code frst_rgtr_id}(로그인 ID)로 판정한다 — 이미 참여했으면 다시 투표하지 못하고 화면이
 * '참여함' 으로 보인다({@code OnlinePollService}). 설문 응답({@code tb_srvy_rslt})은 넣지 않는다: 응답 취소가 계정 생성
 * 시각과 응답 시각을 대조해 재사용을 이미 걸러 낸다({@code SurveyResultService#cancelSubmission}).
 */
@Component
public class SurveyLoginIdReferenceContributor implements LoginIdReferenceContributor {

    @Override
    public Collection<Reference> loginIdReferences() {
        return List.of(new Reference("tb_onln_poll_rslt", "frst_rgtr_id"));
    }
}
