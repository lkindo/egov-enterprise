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

    @Column(length = 20)
    private String smsId;

    @Column(length = 20)
    private String rcptnTelno;
}
