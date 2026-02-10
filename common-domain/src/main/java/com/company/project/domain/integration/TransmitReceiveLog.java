package com.company.project.domain.integration;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "NTRSMRCVLOG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TransmitReceiveLog {

    @Id
    @Column(name = "REQUST_ID", length = 20)
    private String requestId;

    @Column(name = "OCCRRNC_DE", length = 20)
    private String occurrenceDe;

    @Column(name = "TRSMRCV_SE_CODE", length = 3)
    private String transmitReceiveSeCode;

    @Column(name = "CNTC_ID", length = 20)
    private String cntcId;

    @Column(name = "PROVD_INSTT_ID", length = 20)
    private String provdInsttId;

    @Column(name = "PROVD_SYS_ID", length = 20)
    private String provdSysId;

    @Column(name = "PROVD_SVC_ID", length = 20)
    private String provdSvcId;

    @Column(name = "REQUST_INSTT_ID", length = 20)
    private String requstInsttId;

    @Column(name = "REQUST_SYS_ID", length = 20)
    private String requstSysId;

    @Column(name = "REQUST_TRNSMIT_TM", length = 20)
    private String requestTransmitTm;

    @Column(name = "REQUST_RECV_TM", length = 20)
    private String requestRecvTm;

    @Column(name = "RSPNS_TRNSMIT_TM", length = 20)
    private String responseTransmitTm;

    @Column(name = "RSPNS_RECV_TM", length = 20)
    private String responseRecvTm;

    @Column(name = "RESULT_CODE", length = 20)
    private String resultCode;

    @Column(name = "RESULT_MSSAGE", length = 4000)
    private String resultMessage;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegistPnttm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Builder
    public TransmitReceiveLog(String requestId, String occurrenceDe, String transmitReceiveSeCode, String cntcId,
            String provdInsttId, String provdSysId, String provdSvcId, String requstInsttId, String requstSysId,
            String requestTransmitTm, String requestRecvTm, String responseTransmitTm, String responseRecvTm,
            String resultCode, String resultMessage, String frstRegisterId) {
        this.requestId = requestId;
        this.occurrenceDe = occurrenceDe;
        this.transmitReceiveSeCode = transmitReceiveSeCode;
        this.cntcId = cntcId;
        this.provdInsttId = provdInsttId;
        this.provdSysId = provdSysId;
        this.provdSvcId = provdSvcId;
        this.requstInsttId = requstInsttId;
        this.requstSysId = requstSysId;
        this.requestTransmitTm = requestTransmitTm;
        this.requestRecvTm = requestRecvTm;
        this.responseTransmitTm = responseTransmitTm;
        this.responseRecvTm = responseRecvTm;
        this.resultCode = resultCode;
        this.resultMessage = resultMessage;
        this.frstRegisterId = frstRegisterId;
        this.frstRegistPnttm = LocalDateTime.now();
    }
}
