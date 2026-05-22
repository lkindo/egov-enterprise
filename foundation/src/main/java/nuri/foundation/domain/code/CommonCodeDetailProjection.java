package nuri.foundation.domain.code;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CommonCodeDetailProjection {
    private String cdId;
    private String cdIdNm;
    private String dtlCd;
    private String dtlCdNm;
    private String dtlCdExpln;
    private String useYn;
}
