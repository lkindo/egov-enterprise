package nuri.business.domain.addressbook;
 
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 주소록 정보 JPA Entity
 * 테이블명: TB_ADBK_MANAGE
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_adbk_manage")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@AttributeOverrides({
    @AttributeOverride(name = "createdBy", column = @Column(name = "frst_rgtr_id", updatable = false, length = 20)),
    @AttributeOverride(name = "lastModifiedBy", column = @Column(name = "last_mdfr_id", length = 20)),
    @AttributeOverride(name = "createdDate", column = @Column(name = "crt_dt", updatable = false)),
    @AttributeOverride(name = "lastModifiedDate", column = @Column(name = "mdfcn_dt"))
})
public class AddressBook extends BaseEntity {

    @Id
    @Column(name = "adbk_id", length = 20)
    private String adbkId;

    @Column(name = "adbk_nm", length = 100, nullable = false)
    private String adbkNm;

    @Column(name = "rls_scope_cd", length = 20)
    private String othbcScope;

    @Column(name = "trget_orgnzt_id", length = 20)
    private String trgetOrgnztId;

    @Column(name = "use_yn", length = 1)
    private String useYn;

    @Column(name = "wrter_id", length = 20)
    private String wrterId;

    public void update(String adbkNm, String othbcScope, String useYn) {
        this.adbkNm = adbkNm;
        this.othbcScope = othbcScope;
        this.useYn = useYn;
    }

    // legacy
    public String getUseAt() { return useYn; }
    public void setUseAt(String v) { this.useYn = v; }
}
