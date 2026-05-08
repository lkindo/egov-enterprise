package nuri.foundation.service.menu.dto;

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
    private String mapCreatId;
    /** 권한코드 */
    private String authorCode;

    /** 권한명 */
    private String authorNm;
    /** 권한설명 */
    private String authorDc;
    /** 권한생성일 */
    private String authorCreatDe;

    /** 생성자ID */
    private String creatPersonId;

    /** 메뉴생성여부 (1 이상: 생성됨, 0: 미생성) */
    private int chkYeoBu;
}
