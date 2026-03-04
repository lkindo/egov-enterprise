package com.company.project.domain.help;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

/**
 * ??ㅼ뵬?紐꺿꼻??곷섰 ?類ｋ궖 Entity
 * ??뉕탢?????뵠?? NONLINEMANUAL
 */
@Entity
@Table(name = "NONLINEMANUAL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OnlineManual extends BaseEntity {

    @Id
    @Column(name = "ONLINE_MNL_ID", length = 20)
    private String onlineMnlId;

    @Column(name = "ONLINE_MNL_NM", length = 255, nullable = false)
    private String onlineMnlNm;

    @Column(name = "ONLINE_MNL_SE_CODE", length = 3, nullable = false)
    private String onlineMnlSeCode;

    @Column(name = "ONLINE_MNL_DFN", columnDefinition = "TEXT")
    private String onlineMnlDf;

    @Column(name = "ONLINE_MNL_DC", columnDefinition = "TEXT")
    private String onlineMnlDc;

    @Builder
    public OnlineManual(String onlineMnlId, String onlineMnlNm, String onlineMnlSeCode,
                        String onlineMnlDf, String onlineMnlDc, String frstRegisterId) {
        this.onlineMnlId = onlineMnlId;
        this.onlineMnlNm = onlineMnlNm;
        this.onlineMnlSeCode = onlineMnlSeCode;
        this.onlineMnlDf = onlineMnlDf;
        this.onlineMnlDc = onlineMnlDc;
        this.createdBy = frstRegisterId;
    }

    public void update(String onlineMnlNm, String onlineMnlSeCode, String onlineMnlDf, String onlineMnlDc, String userId) {
        this.onlineMnlNm = onlineMnlNm;
        this.onlineMnlSeCode = onlineMnlSeCode;
        this.onlineMnlDf = onlineMnlDf;
        this.onlineMnlDc = onlineMnlDc;
        if (userId != null) {
            this.lastModifiedBy = userId;
        }
    }
}