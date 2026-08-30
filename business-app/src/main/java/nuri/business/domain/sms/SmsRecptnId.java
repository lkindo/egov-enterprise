package nuri.business.domain.sms;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class SmsRecptnId implements Serializable {

    @Column(name = "sms_trsm_sn")
    private Long smsTrsmSn;

    @Column(length = 13)
    private String rcptnTelno;
}
