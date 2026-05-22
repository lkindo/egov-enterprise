package nuri.foundation.service.menu.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MenuCreateDto {
    /** 메뉴번호 */
    private int menuNo;
    /** 맵생성ID */
    @JsonProperty("mapCreatId")
    private String mpngCrtId;
    /** 권한코드 */
    @JsonProperty("authorCode")
    private String authrtCd;

    /** 권한명 */
    @JsonProperty("authorNm")
    private String authrtNm;

    /** 권한설명 */
    @JsonProperty("authorDc")
    private String authrtExpln;

    /** 권한생성일 */
    @JsonProperty("authorCreatDe")
    private String authrtCrtYmd;

    /** 생성자ID */
    @JsonProperty("creatPersonId")
    private String crtrId;

    /** 메뉴생성여부 (1 이상: 생성됨, 0: 미생성) */
    private int chkYeoBu;
}

