package nuri.foundation.domain.user.entity;

import nuri.foundation.domain.common.BaseEntity;
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
    private String orgnztId;

    @Column(name = "ognz_nm", length = 100, nullable = false)
    private String orgnztNm;

    @Column(name = "ognz_expln", length = 255)
    private String orgnztDc;

    public void update(String orgnztNm, String orgnztDc) {
        this.orgnztNm = orgnztNm;
        this.orgnztDc = orgnztDc;
    }
}
