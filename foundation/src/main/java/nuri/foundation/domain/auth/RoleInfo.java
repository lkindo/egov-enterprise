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
@Table(name = "TB_ROLE_INFO")
@SuperBuilder
public class RoleInfo extends BaseEntity {

    @Id
    @Column(name = "ROLE_ID", length = 50)
    private String roleCode;

    @Column(name = "ROLE_NM", nullable = false, length = 60)
    private String roleNm;

    @Column(name = "ROLE_PATRN", length = 300)
    private String rolePttrn;

    @Column(name = "ROLE_EXPLN", length = 200)
    private String roleDc;

    @Column(name = "ROLE_TYPE_CD", length = 80)
    private String roleTy;

    @Column(name = "ROLE_SORT")
    private Integer roleSort;

    @Column(name = "ROLE_CRT_YMD")
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
