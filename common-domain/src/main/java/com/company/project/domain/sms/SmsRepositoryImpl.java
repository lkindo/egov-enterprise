package com.company.project.domain.sms;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.company.project.domain.sms.QSms.sms;
import static com.company.project.domain.sms.QSmsRecptn.smsRecptn;

@RequiredArgsConstructor
public class SmsRepositoryImpl implements SmsRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<Sms> searchSmsUnits(String searchCondition, String searchKeyword, Pageable pageable) {
        List<Sms> content = queryFactory
                .selectFrom(sms)
                .leftJoin(sms.recipients, smsRecptn)
                .where(searchExpression(searchCondition, searchKeyword))
                .orderBy(sms.smsId.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(sms.countDistinct())
                .from(sms)
                .leftJoin(sms.recipients, smsRecptn)
                .where(searchExpression(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(content, pageable, total);
    }

    private BooleanExpression searchExpression(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("0".equals(searchCondition)) { // 수신번호 (RECPTN_TELNO)
            return smsRecptn.recptnTelno.contains(searchKeyword);
        } else if ("1".equals(searchCondition)) { // 내용 (TRNSMIS_CN)
            return sms.trnsmitCn.contains(searchKeyword);
        }

        return null;
    }
}
