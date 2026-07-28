package nuri.business.domain.deptjob;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DeptJobRepository extends JpaRepository<DeptJob, String>, QuerydslPredicateExecutor<DeptJob> {

    /**
     * 해당 업무함에 속한 부서업무가 하나라도 있는지.
     *
     * <p>업무함 삭제가 산하 업무를 고아로 남기는 것을 막기 위한 선(先)검사다
     * ({@code DeptJobBoxService.deleteDeptJobBox}).</p>
     */
    boolean existsByDeptTaskBoxId(String deptTaskBoxId);

    /**
     * 사용자 삭제 시 그 사용자가 담당자인 부서업무를 <b>담당자 공석</b>(pic_id=NULL)으로 되돌린다.
     *
     * <p>[V2_32 FK 결속] {@code fk_tb_dept_task_info_tb_user_info}(pic_id→esntl_id, NO ACTION)
     * 하에서 담당자 행을 지우려면 자식의 참조를 먼저 끊어야 한다. 업무 자체는 <b>부서 자산</b>이므로
     * 삭제하지 않고 담당자만 비운다 — 담당자 공석은 이미 정상 상태이며, 그 경우 인가는
     * 등록자(frstRgtrId) 기준으로 판정된다({@code DeptJobService.assertPicOrAdmin}).</p>
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE DeptJob d SET d.picId = null WHERE d.picId IN :esntlIds")
    int releasePicByPicIdIn(@Param("esntlIds") List<String> esntlIds);
}
