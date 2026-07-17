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
    @Column(length = 20)
    private String deptTaskId;

    @Column(name = "dept_task_box_id", length = 20)
    private String deptTaskBoxId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dept_task_box_id", referencedColumnName = "dept_task_box_id", insertable = false, updatable = false,
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

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atch_file_id", referencedColumnName = "atch_file_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.file.FileMaster fileMaster;

    // 팩토리 create() 전용 private 생성자 (own 필드 설정)
    private DeptJob(String deptTaskId, String deptTaskBoxId, String deptTaskNm, String deptTaskCn,
            String picId, String prrtyRnk, String atchFileId) {
        this.deptTaskId = deptTaskId;
        this.deptTaskBoxId = deptTaskBoxId;
        this.deptTaskNm = deptTaskNm;
        this.deptTaskCn = deptTaskCn;
        this.picId = picId;
        this.prrtyRnk = prrtyRnk;
        this.atchFileId = atchFileId;
    }

    @Builder
    public static DeptJob create(String deptTaskId, String deptTaskBoxId, String deptTaskNm, String deptTaskCn,
            String picId, String prrtyRnk, String atchFileId) {
        return new DeptJob(deptTaskId, deptTaskBoxId, deptTaskNm, deptTaskCn, picId, prrtyRnk, atchFileId);
    }

    public void update(String deptTaskBoxId, String deptTaskNm, String deptTaskCn, String picId, String prrtyRnk,
            String atchFileId) {
        this.deptTaskBoxId = deptTaskBoxId;
        this.deptTaskNm = deptTaskNm;
        this.deptTaskCn = deptTaskCn;
        this.picId = picId;
        this.prrtyRnk = prrtyRnk;
        this.atchFileId = atchFileId;
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
