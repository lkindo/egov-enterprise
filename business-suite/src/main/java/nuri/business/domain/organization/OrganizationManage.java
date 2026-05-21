package nuri.business.domain.organization;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "tb_orgnzt_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class OrganizationManage extends BaseEntity {

    @Id
    @Column(name = "ognz_id", length = 20)
    private String orgnztId;

    @Column(name = "ognz_nm", length = 100)
    private String orgnztNm;

    @Column(name = "ognz_expln", length = 4000)
    private String orgnztDc;
}
