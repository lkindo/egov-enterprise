package nuri.foundation.domain.auth;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "NROLEINFO")
@SuperBuilder
public class RoleInfo extends BaseEntity {

    @Id
    @Column(name = "ROLE_CODE", length = 50)
    private String roleCode;

    @Column(name = "ROLE_NM", nullable = false, length = 60)
    private String roleNm;

    @Column(name = "ROLE_PTTRN", length = 300)
    private String rolePttrn;

    @Column(name = "ROLE_DC", length = 200)
    private String roleDc;

    @Column(name = "ROLE_TY", length = 80)
    private String roleTy;

    @Column(name = "ROLE_SORT", length = 10)
    private String roleSort;

    @Column(name = "ROLE_CREAT_DE", length = 20)
    @Builder.Default
    private String creatDt = java.time.LocalDate.now().toString().replace("-", "");

    /**
     * Updates the role information.
     *
     * @param roleNm    Role Name
     * @param rolePttrn Role Pattern
     * @param roleDc    Role Description
     * @param roleTy    Role Type
     * @param roleSort  Role Sort Order
     */
    public void update(String roleNm, String rolePttrn, String roleDc, String roleTy, String roleSort) {
        this.roleNm = roleNm;
        this.rolePttrn = rolePttrn;
        this.roleDc = roleDc;
        this.roleTy = roleTy;
        this.roleSort = roleSort;
    }
}
