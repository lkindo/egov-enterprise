package nuri.business.domain.deptjob;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 부서업무함
 *
 * @see NDEPTJOBBX 데이터베이스
 */
@Entity
@Table(name = "tb_dept_job_bx")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeptJobBox extends BaseEntity {

    @Id
    @Column(name = "dept_task_box_id", length = 20)
    private String deptTaskBoxId;

    @Column(length = 100)
    private String deptTaskBoxNm;

    @Column(length = 20)
    private String deptId;

    private Integer sortOrdr;

    // 정적 팩토리 전용 생성자 (빌더 위임 대상)
    private DeptJobBox(String deptTaskBoxId, String deptTaskBoxNm, String deptId, Integer sortOrdr) {
        this.deptTaskBoxId = deptTaskBoxId;
        this.deptTaskBoxNm = deptTaskBoxNm;
        this.deptId = deptId;
        this.sortOrdr = sortOrdr;
    }

    /**
     * 부서업무함 생성 정적 팩토리.
     * 기존 {@code DeptJobBox.builder()...build()} 호출부와 호환.
     */
    @Builder
    public static DeptJobBox create(String deptTaskBoxId, String deptTaskBoxNm, String deptId, Integer sortOrdr) {
        return new DeptJobBox(deptTaskBoxId, deptTaskBoxNm, deptId, sortOrdr);
    }

    public void update(String deptTaskBoxNm, String deptId, Integer sortOrdr) {
        this.deptTaskBoxNm = deptTaskBoxNm;
        this.deptId = deptId;
        this.sortOrdr = sortOrdr;
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
