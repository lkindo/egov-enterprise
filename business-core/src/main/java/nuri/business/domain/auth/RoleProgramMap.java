package nuri.business.domain.auth;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.domain.common.BaseEntity;
import org.springframework.lang.NonNull;

import java.io.Serializable;

/**
 * 역할 ↔ 프로그램 매핑 엔티티.
 * {@code tb_role_prgrm_map} 테이블에 대응한다.
 */
@Entity
@Table(name = "tb_role_prgrm_map")
@IdClass(RoleProgramMapId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoleProgramMap extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "role_id", length = 20)
    @NonNull
    private String roleId;

    @Id
    @Column(name = "prgrm_file_nm", length = 100)
    @NonNull
    private String prgrmFileNm;

    private RoleProgramMap(@NonNull String roleId, @NonNull String prgrmFileNm) {
        this.roleId = roleId;
        this.prgrmFileNm = prgrmFileNm;
    }

    @Builder
    public static RoleProgramMap create(@NonNull String roleId, @NonNull String prgrmFileNm) {
        return new RoleProgramMap(roleId, prgrmFileNm);
    }
}
