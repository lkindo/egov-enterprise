package com.company.project.service.menu.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MenuCreateDto {
    /** 硫붾돱踰덊샇 */
    private int menuNo;
    /** 留듭깮?켌D */
    private String mapCreatId;
    /** 沅뚰븳肄붾뱶 */
    private String authorCode;

    /** 沅뚰븳紐?*/
    private String authorNm;
    /** 沅뚰븳?ㅻ챸 */
    private String authorDc;
    /** 沅뚰븳?앹꽦?쇱옄 */
    private String authorCreatDe;

    /** ?앹꽦?륤D */
    private String creatPersonId;

    /** 硫붾돱?앹꽦?щ? (1 ?댁긽: ?앹꽦?? 0: 誘몄깮?? */
    private int chkYeoBu;
}
