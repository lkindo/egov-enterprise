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
    /** 硫붾?�踰?�샇 */
    private int menuNo;
    /** 留듭�?켌D */
    private String mapCreatId;
    /** 沅뚰븳肄붾뱶 */
    private String authorCode;

    /** 沅뚰븳紐?*/
    private String authorNm;
    /** 沅뚰�??�챸 */
    private String authorDc;
    /** 沅뚰�??�꽦??�옄 */
    private String authorCreatDe;

    /** ??�꽦?륤D */
    private String creatPersonId;

    /** 硫붾???�꽦??? (1 ??�긽: ??�꽦?? 0: 誘몄�?? */
    private int chkYeoBu;
}
