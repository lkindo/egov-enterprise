package nuri.business.service.schedule.loginid;

import nuri.foundation.core.user.LoginIdReferenceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 일정의 주인은 로그인 ID 다 — 수정·삭제·비공유 상세는 {@code frst_rgtr_id}, 내 일정 목록·달력은 담당자
 * {@code schdl_pic_id} 로 거른다({@code ScheduleService}·{@code ScheduleRepository}). 일지({@code tb_diary_info})는
 * 개인 첨부의 소유 근거를 {@code frst_rgtr_id} 로 판정한다({@code AttachmentSource.DIARY}).
 */
@Component
public class ScheduleLoginIdReferenceContributor implements LoginIdReferenceContributor {

    @Override
    public Collection<Reference> loginIdReferences() {
        return List.of(
                new Reference("tb_schdl_info", "frst_rgtr_id"),
                new Reference("tb_schdl_info", "schdl_pic_id"),
                new Reference("tb_diary_info", "frst_rgtr_id"));
    }
}
