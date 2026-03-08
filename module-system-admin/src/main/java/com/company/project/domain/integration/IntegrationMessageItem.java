package com.company.project.domain.integration;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "NCNTCMESSAGEITEM")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class IntegrationMessageItem {

    @EmbeddedId
    private IntegrationMessageItemId id;

    @Column(name = "IEM_NM", length = 100, nullable = false)
    private String itemNm;

    @Column(name = "IEM_TY", length = 20)
    private String itemType;

    @Column(name = "IEM_LT")
    private Integer itemLt;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegistPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @Builder
    public IntegrationMessageItem(IntegrationMessageItemId id, String itemNm, String itemType, Integer itemLt,
            String useAt, String frstRegisterId) {
        this.id = id;
        this.itemNm = itemNm;
        this.itemType = itemType;
        this.itemLt = itemLt;
        this.useAt = useAt != null ? useAt : "Y";
        this.frstRegisterId = frstRegisterId;
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdusrId = frstRegisterId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void update(String itemNm, String itemType, Integer itemLt, String updusrId) {
        this.itemNm = itemNm;
        this.itemType = itemType;
        this.itemLt = itemLt;
        this.lastUpdusrId = updusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void delete(String updusrId) {
        this.useAt = "N";
        this.lastUpdusrId = updusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @AllArgsConstructor
    @EqualsAndHashCode
    @Builder
    public static class IntegrationMessageItemId implements Serializable {
        @Column(name = "CNTC_MSSAGE_ID", length = 20)
        private String cntcMessageId;

        @Column(name = "IEM_ID", length = 20)
        private String itemId;
    }
}
