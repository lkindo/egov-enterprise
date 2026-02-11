package com.company.project.domain.code;

import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import java.util.List;

@RequiredArgsConstructor
public class InstitutionCodeRepositoryImpl implements InstitutionCodeRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<InstitutionCode> searchByFullNm(String fullNm) {
        return queryFactory
                .selectFrom(QInstitutionCode.institutionCode)
                .where(QInstitutionCode.institutionCode.allInsttNm.contains(fullNm))
                .fetch();
    }
}
