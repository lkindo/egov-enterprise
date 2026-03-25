package com.company.project.foundation.domain.mypage;
import com.company.project.foundation.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "COMTNINDVDLPGE")
@SuperBuilder
public class IndvdlPge extends BaseEntity {

    @Id
    @Column(name = "CNTNTS_ID", length = 20)
    private String cntntsId;

    @Column(name = "CNTNTS_NM", length = 100)
    private String cntntsNm;

    @Column(name = "CNTNTS_USE_AT", length = 1)
    private String cntntsUseAt;

    @Column(name = "CNTNTS_LINK_URL", length = 255)
    private String cntntsLinkUrl;

    @Column(name = "CNTNTS_DC", length = 255)
    private String cntntsDc;

    public IndvdlPge(String cntntsId, String cntntsNm, String cntntsUseAt, String cntntsLinkUrl,
            String cntntsDc) {
        this.cntntsId = cntntsId;
        this.cntntsNm = cntntsNm;
        this.cntntsUseAt = cntntsUseAt;
        this.cntntsLinkUrl = cntntsLinkUrl;
        this.cntntsDc = cntntsDc;
    }

    public void update(String cntntsNm, String cntntsUseAt, String cntntsLinkUrl, String cntntsDc) {
        this.cntntsNm = cntntsNm;
        this.cntntsUseAt = cntntsUseAt;
        this.cntntsLinkUrl = cntntsLinkUrl;
        this.cntntsDc = cntntsDc;
    }
}
