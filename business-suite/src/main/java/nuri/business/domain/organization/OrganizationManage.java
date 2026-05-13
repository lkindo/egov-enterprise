package nuri.business.domain.organization;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "TB_ORGNZT_INFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class OrganizationManage extends BaseEntity {

    @Id
    @Column(name = "ORGNZT_ID", length = 20)
    private String orgnztId;

    @Column(name = "ORGNZT_NM", length = 20)
    private String orgnztNm;

    @Column(name = "ORGNZT_DC", length = 100)
    private String orgnztDc;
}
