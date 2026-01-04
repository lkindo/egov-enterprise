package com.company.project.domain.terms;

import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "COMTNSTPLATINFO")
@EntityListeners(AuditingEntityListener.class)
public class Terms implements Serializable {

    @Id
    @Column(name = "USE_STPLAT_ID", length = 20)
    private String useStplatId;

    @Column(name = "USE_STPLAT_NM", length = 100)
    private String useStplatNm;

    @Column(name = "USE_STPLAT_CN", columnDefinition = "TEXT")
    private String useStplatCn;

    @Column(name = "INFO_PROVD_AGRE_CN", columnDefinition = "TEXT")
    private String infoProvdAgreCn;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @CreatedDate
    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime createdDate;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @LastModifiedDate
    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime modifiedDate;

    @Builder
    public Terms(String useStplatId, String useStplatNm, String useStplatCn, String infoProvdAgreCn,
            String frstRegisterId) {
        this.useStplatId = useStplatId;
        this.useStplatNm = useStplatNm;
        this.useStplatCn = useStplatCn;
        this.infoProvdAgreCn = infoProvdAgreCn;
        this.frstRegisterId = frstRegisterId;
    }

    public void update(String useStplatNm, String useStplatCn, String infoProvdAgreCn, String lastUpdusrId) {
        this.useStplatNm = useStplatNm;
        this.useStplatCn = useStplatCn;
        this.infoProvdAgreCn = infoProvdAgreCn;
        this.lastUpdusrId = lastUpdusrId;
    }
}
