package nuri.business.domain.deptjob;

import nuri.foundation.domain.common.BaseEntity;
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
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dept_task_box_sn")
    private Long deptTaskBoxSn;

    @Column(length = 100)
    private String deptTaskBoxNm;

    @Column(length = 20)
    private String deptId;

    private Long sortOrdr;

    // 정적 팩토리 전용 생성자 (빌더 위임 대상)
    private DeptJobBox(Long deptTaskBoxSn, String deptTaskBoxNm, String deptId, Long sortOrdr) {
        this.deptTaskBoxSn = deptTaskBoxSn;
        this.deptTaskBoxNm = deptTaskBoxNm;
        this.deptId = deptId;
        this.sortOrdr = sortOrdr;
    }

    /**
     * 부서업무함 생성 정적 팩토리.
     * 기존 {@code DeptJobBox.builder()...build()} 호출부와 호환.
     */
    @Builder
    public static DeptJobBox create(Long deptTaskBoxSn, String deptTaskBoxNm, String deptId, Long sortOrdr) {
        return new DeptJobBox(deptTaskBoxSn, deptTaskBoxNm, deptId, sortOrdr);
    }

    public void update(String deptTaskBoxNm, String deptId, Long sortOrdr) {
        this.deptTaskBoxNm = deptTaskBoxNm;
        this.deptId = deptId;
        this.sortOrdr = sortOrdr;
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
