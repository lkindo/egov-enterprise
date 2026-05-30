package nuri.business.domain.auth;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.lang.NonNull;
import java.util.Objects;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "tb_authrt_info")
@SuperBuilder
public class Authority extends BaseEntity implements java.io.Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "authrt_cd", length = 30)
    @NonNull
    private String authrtCd;

    @Column(nullable = false, length = 300)
    @NonNull
    private String authrtNm;

    @Column(length = 4000)
    private String authrtExpln;

    @Column(length = 8)
    @Builder.Default
    private String authrtCrtYmd = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));

    public void update(@NonNull String authrtNm, String authrtExpln) {
        this.authrtNm = Objects.requireNonNull(authrtNm);
        this.authrtExpln = authrtExpln;
    }
}
