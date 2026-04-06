package nuri.business.domain.addressbook;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 주소록 정보 JPA Entity
 * 테이블명: nadbkmanage (기존: COMTNADBKINFO)
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "nadbkmanage")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@AttributeOverrides({
    @AttributeOverride(name = "createdBy", column = @Column(name = "frst_register_id", updatable = false, length = 20)),
    @AttributeOverride(name = "lastModifiedBy", column = @Column(name = "last_updusr_id", length = 20)),
    @AttributeOverride(name = "createdDate", column = @Column(name = "frst_regist_pnttm", updatable = false)),
    @AttributeOverride(name = "lastModifiedDate", column = @Column(name = "last_updt_pnttm"))
})
public class AddressBook extends BaseEntity {

    @Id
    @Column(name = "adbk_id", length = 20)
    private String adbkId;

    @Column(name = "adbk_nm", length = 100, nullable = false)
    private String adbkNm;

    @Column(name = "othbc_scope", length = 20)
    private String othbcScope;

    @Column(name = "trget_orgnzt_id", length = 20)
    private String trgetOrgnztId;

    @Column(name = "use_at", length = 1)
    private String useAt;

    @Column(name = "wrter_id", length = 20)
    private String wrterId;

    public void update(String adbkNm, String othbcScope, String useAt) {
        this.adbkNm = adbkNm;
        this.othbcScope = othbcScope;
        this.useAt = useAt;
    }
}
