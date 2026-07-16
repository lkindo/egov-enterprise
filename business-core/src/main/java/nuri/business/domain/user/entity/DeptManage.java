package nuri.business.domain.user.entity;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 부서 정보 Entity
 * 매핑 테이블: NORGNZTINFO
 */
@Entity
@Table(name = "tb_ognz_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeptManage extends BaseEntity {

    @Id
    @Column(name = "ognz_id", length = 20)
    private String ognzId;

    @Column(length = 100, nullable = false)
    private String ognzNm;

    @Column(length = 4000)
    private String ognzExpln;

    private DeptManage(String ognzId, String ognzNm, String ognzExpln) {
        this.ognzId = ognzId;
        this.ognzNm = ognzNm;
        this.ognzExpln = ognzExpln;
    }

    @Builder
    public static DeptManage create(String ognzId, String ognzNm, String ognzExpln) {
        return new DeptManage(ognzId, ognzNm, ognzExpln);
    }

    public void update(String ognzNm, String ognzExpln) {
        this.ognzNm = ognzNm;
        this.ognzExpln = ognzExpln;
    }

    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
