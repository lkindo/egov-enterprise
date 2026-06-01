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

    @Column(name = "sms_id", length = 20)
    private String smsId;

    @Column(name = "rcptn_telno", length = 20)
    private String rcptnTelno;
}
