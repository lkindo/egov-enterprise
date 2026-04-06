package nuri.foundation.domain.log;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class BbsSummaryId implements Serializable {
    private String occrrncDe;
    private String statsKind;
    private String detailStatsKind;
}
