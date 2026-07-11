package nuri.business.domain.auth;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.lang.NonNull;
import java.util.Objects;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_authrt_info")
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
    private String authrtCrtYmd;

    private Authority(@NonNull String authrtCd, @NonNull String authrtNm, String authrtExpln, String authrtCrtYmd) {
        this.authrtCd = Objects.requireNonNull(authrtCd);
        this.authrtNm = Objects.requireNonNull(authrtNm);
        this.authrtExpln = authrtExpln;
        this.authrtCrtYmd = authrtCrtYmd == null ? defaultDate() : authrtCrtYmd;
    }

    @Builder
    public static Authority create(@NonNull String authrtCd, @NonNull String authrtNm, String authrtExpln, String authrtCrtYmd) {
        return new Authority(authrtCd, authrtNm, authrtExpln, authrtCrtYmd);
    }

    public static Authority createRaw(String authrtCd, String authrtNm, String authrtExpln, String authrtCrtYmd) {
        Authority auth = new Authority(authrtCd, authrtNm, authrtExpln, null);
        auth.authrtCrtYmd = authrtCrtYmd;
        return auth;
    }

    private static String defaultDate() {
        return java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
    }

    public void update(@NonNull String authrtNm, String authrtExpln) {
        this.authrtNm = Objects.requireNonNull(authrtNm);
        this.authrtExpln = authrtExpln;
    }
}
