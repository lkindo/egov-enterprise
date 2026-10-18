package nuri.business.service.user;

import nuri.foundation.core.user.LoginIdReferenceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 필수 core 도메인에서 로그인 ID 로 주인을 판정하는 기록.
 *
 * <ul>
 *   <li>{@code tb_file_master.frst_rgtr_id} — 업로더 본인은 아직 업무 행에 붙지 않은 첨부를 열고 지우며 다른 행에
 *       붙일 수 있다({@code FileAccessPolicy} 의 업로더 판정).</li>
 *   <li>{@code tb_dept_task_info.frst_rgtr_id} — 담당자가 빈 부서 업무는 등록자가 고치고 지운다. 등록자는 담당자를
 *       다시 지정할 수 있고 '내 업무' 목록에 든다({@code DeptJobService} 의 등록자 판정). 공유 첨부의 소유 근거이기도 하다.</li>
 * </ul>
 */
@Component
public class CoreLoginIdReferenceContributor implements LoginIdReferenceContributor {

    @Override
    public Collection<Reference> loginIdReferences() {
        return List.of(
                new Reference("tb_file_master", "frst_rgtr_id"),
                new Reference("tb_dept_task_info", "frst_rgtr_id"));
    }
}
