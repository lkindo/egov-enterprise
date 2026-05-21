package nuri.foundation.domain.auth;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.time.LocalDate;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "tb_role_info")
@SuperBuilder
public class RoleInfo extends BaseEntity {

    @Id
    @Column(name = "role_id", length = 50)
    private String roleCode;

    @Column(name = "role_nm", nullable = false, length = 60)
    private String roleNm;

    @Column(name = "role_patrn", length = 300)
    private String rolePttrn;

    @Column(name = "role_expln", length = 200)
    private String roleDc;

    @Column(name = "role_type_cd", length = 80)
    private String roleTy;

    @Column(name = "role_sort")
    private Integer roleSort;

    @Column(name = "role_crt_ymd")
    @Builder.Default
    private LocalDate creatDt = LocalDate.now();

    /**
     * Updates the role information.
     *
     * @param roleNm    Role Name
     * @param rolePttrn Role Pattern
     * @param roleDc    Role Description
     * @param roleTy    Role Type
     * @param roleSort  Role Sort Order
     */
    public void update(String roleNm, String rolePttrn, String roleDc, String roleTy, Integer roleSort) {
        this.roleNm = roleNm;
        this.rolePttrn = rolePttrn;
        this.roleDc = roleDc;
        this.roleTy = roleTy;
        this.roleSort = roleSort;
    }
}
