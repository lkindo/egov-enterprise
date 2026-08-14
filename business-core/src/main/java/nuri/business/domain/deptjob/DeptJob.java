package nuri.business.domain.deptjob;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tb_dept_task_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeptJob extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long deptTaskSn;

    @Column(name = "dept_task_box_sn")
    private Long deptTaskBoxSn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dept_task_box_sn", referencedColumnName = "dept_task_box_sn", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private DeptJobBox deptJobBox;

    @Column(length = 100)
    private String deptTaskNm;

    @Column(length = 4000)
    private String deptTaskCn;

    @Column(length = 20)
    private String picId;

    @Column(length = 12)
    private String prrtyRnk; // 1: 높음, 2: 보통, 3: 낮음
    @Column(name = "atch_file_sn")
    private Long atchFileSn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atch_file_sn", referencedColumnName = "atch_file_sn", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.file.FileMaster fileMaster;

    // 팩토리 create() 전용 private 생성자 (own 필드 설정)
    private DeptJob(Long deptTaskSn, Long deptTaskBoxSn, String deptTaskNm, String deptTaskCn,
            String picId, String prrtyRnk, Long atchFileSn) {
        this.deptTaskSn = deptTaskSn;
        this.deptTaskBoxSn = deptTaskBoxSn;
        this.deptTaskNm = deptTaskNm;
        this.deptTaskCn = deptTaskCn;
        this.picId = picId;
        this.prrtyRnk = prrtyRnk;
        this.atchFileSn = atchFileSn;
    }

    @Builder
    public static DeptJob create(Long deptTaskSn, Long deptTaskBoxSn, String deptTaskNm, String deptTaskCn,
            String picId, String prrtyRnk, Long atchFileSn) {
        return new DeptJob(deptTaskSn, deptTaskBoxSn, deptTaskNm, deptTaskCn, picId, prrtyRnk, atchFileSn);
    }

    public void update(Long deptTaskBoxSn, String deptTaskNm, String deptTaskCn, String picId, String prrtyRnk,
            Long atchFileSn) {
        this.deptTaskBoxSn = deptTaskBoxSn;
        this.deptTaskNm = deptTaskNm;
        this.deptTaskCn = deptTaskCn;
        this.picId = picId;
        this.prrtyRnk = prrtyRnk;
        this.atchFileSn = atchFileSn;
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
