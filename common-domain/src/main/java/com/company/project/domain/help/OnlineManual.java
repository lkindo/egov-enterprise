package com.company.project.domain.help;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 온라인매뉴얼 정보 Entity
 * 레거시 테이블: NONLINEMANUAL
 */
@Entity
@Table(name = "NONLINEMANUAL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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
                        String onlineMnlDf, String onlineMnlDc) {
        this.onlineMnlId = onlineMnlId;
        this.onlineMnlNm = onlineMnlNm;
        this.onlineMnlSeCode = onlineMnlSeCode;
        this.onlineMnlDf = onlineMnlDf;
        this.onlineMnlDc = onlineMnlDc;
    }

    public void update(String onlineMnlNm, String onlineMnlSeCode, String onlineMnlDf, String onlineMnlDc) {
        this.onlineMnlNm = onlineMnlNm;
        this.onlineMnlSeCode = onlineMnlSeCode;
        this.onlineMnlDf = onlineMnlDf;
        this.onlineMnlDc = onlineMnlDc;
    }
}
