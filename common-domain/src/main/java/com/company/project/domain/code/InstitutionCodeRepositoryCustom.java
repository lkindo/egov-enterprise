package com.company.project.domain.code;

import java.util.List;

public interface InstitutionCodeRepositoryCustom {
    List<InstitutionCode> searchByFullNm(String fullNm);
}