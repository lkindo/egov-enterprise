package nuri.business.domain.user.entity;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * 부서 정보 Entity
 * 매핑 테이블: NORGNZTINFO
 */
@Entity
@Table(name = "tb_orgnzt_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class DeptManage extends BaseEntity {

    @Id
    @Column(name = "ognz_id", length = 20)
    private String ognzId;

    @Column(length = 100, nullable = false)
    private String ognzNm;

    @Column(length = 4000)
    private String ognzExpln;

    public void update(String ognzNm, String ognzExpln) {
        this.ognzNm = ognzNm;
        this.ognzExpln = ognzExpln;
    }

    // ----- [Legacy Aliases for Compatibility] -----
    public String getOrgnztId() { return ognzId; }
    public String getOrgnztNm() { return ognzNm; }
    public String getOrgnztDc() { return ognzExpln; }
    public void setOrgnztId(String v) { this.ognzId = v; }
    public void setOrgnztNm(String v) { this.ognzNm = v; }
    public void setOrgnztDc(String v) { this.ognzExpln = v; }
}
