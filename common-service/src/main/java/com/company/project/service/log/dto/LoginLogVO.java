package com.company.project.service.log.dto;

import egovframework.com.cmm.ComDefaultVO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginLogVO extends ComDefaultVO {
    private String searchBgnDe = "";
    private String searchEndDe = "";
    private String searchWrd = "";
}