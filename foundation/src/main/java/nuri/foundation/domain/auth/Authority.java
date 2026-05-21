package nuri.foundation.domain.auth;

import nuri.foundation.domain.common.BaseEntity;
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
    private String authorCode;

    @Column(name = "authrt_nm", nullable = false, length = 60)
    @NonNull
    private String authorNm;

    @Column(name = "authrt_expln", length = 200)
    private String authorDc;

    @Column(name = "authrt_crt_ymd", length = 8)
    @Builder.Default
    private String authorCreatDe = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));

    public void update(@NonNull String authorNm, String authorDc) {
        this.authorNm = Objects.requireNonNull(authorNm);
        this.authorDc = authorDc;
    }
}
