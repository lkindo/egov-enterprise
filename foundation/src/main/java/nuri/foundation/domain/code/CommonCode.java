package nuri.foundation.domain.code;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.lang.NonNull;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * ⑤벏怨멸쉭 ?꾨뗀諭酉(CCMMNDETAILCODE ???뵠筌띲끋釉
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@IdClass(CommonCodeId.class)
@Table(name = "CCMMNDETAILCODE")
public class CommonCode implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "CODE_ID", length = 18)
    @NonNull
    private String codeGroupId; // eGovFrame ?????CODE_ID

    @Id
    @Column(name = "CODE", length = 45)
    @NonNull
    private String code; // 怨멸쉭 ?꾨뗀諭

    @Column(name = "CODE_NM", length = 180)
    @NonNull
    private String codeNm; // ?꾨뗀諭띰쭗?

    @Column(name = "CODE_DC", length = 600)
    private String codeDc; // ?꾨뗀諭살구

    @Column(name = "USE_AT", length = 1)
    private String useAt; // ??????? (Y/N)

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime createdDate;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastModifiedDate;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public CommonCode(@NonNull String codeGroupId, @NonNull String code, @NonNull String codeNm, String codeDc,
            String useAt,
            String frstRegisterId) {
        this.codeGroupId = Objects.requireNonNull(codeGroupId);
        this.code = Objects.requireNonNull(code);
        this.codeNm = Objects.requireNonNull(codeNm);
        this.codeDc = codeDc;
        this.useAt = useAt == null ? "Y" : useAt;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = frstRegisterId;
        this.createdDate = LocalDateTime.now();
        this.lastModifiedDate = LocalDateTime.now();
    }

    public void update(@NonNull String codeNm, String codeDc, String useAt, String lastUpdusrId) {
        this.codeNm = Objects.requireNonNull(codeNm);
        this.codeDc = codeDc;
        this.useAt = useAt;
        this.lastUpdusrId = lastUpdusrId;
        this.lastModifiedDate = LocalDateTime.now();
    }

    public void delete() {
        this.useAt = "N";
        this.lastModifiedDate = LocalDateTime.now();
    }
}
