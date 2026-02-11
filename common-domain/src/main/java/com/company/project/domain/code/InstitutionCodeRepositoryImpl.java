package com.company.project.domain.code;

import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import java.util.List;

import static com.company.project.domain.code.QInstitutionCode.institutionCode1;

@RequiredArgsConstructor
public class InstitutionCodeRepositoryImpl implements InstitutionCodeRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<InstitutionCode> searchByFullNm(String fullNm) {
        return queryFactory
                .selectFrom(institutionCode1)
                .where(institutionCode1.allInsttNm.contains(fullNm))
                .fetch();
    }
}
