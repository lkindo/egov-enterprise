package nuri.business.domain.code;

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
    /** 목록에서 바로 수정 창을 여는 화면이 그대로 돌려보내는 낙관적 잠금 버전(V2_133). */
    private Integer version;
}
