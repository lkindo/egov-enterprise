package nuri.business.domain.operation;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ExternalHrId implements Serializable {
    private String evntId;
    private String otsdHrId;
}
