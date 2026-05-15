package nuri.foundation.domain.log;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class UserLogId implements Serializable {
    private String ocrnYmd;
    private String dmndUserId;
    private String srvcNm;
    private String methodNm;
}
