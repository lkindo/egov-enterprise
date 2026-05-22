package nuri.business.domain.sms;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;

@RequiredArgsConstructor
public class SmsRepositoryImpl implements SmsRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<Sms> searchSmsUnits(String searchCondition, String searchKeyword, Pageable pageable) {
        List<Sms> content = queryFactory
                .selectFrom(QSms.sms)
                .leftJoin(QSmsRecptn.smsRecptn).on(QSms.sms.smsId.eq(QSmsRecptn.smsRecptn.id.smsId))
                .where(searchExpression(searchCondition, searchKeyword))
                .orderBy(QSms.sms.smsId.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(QSms.sms.countDistinct())
                .from(QSms.sms)
                .leftJoin(QSmsRecptn.smsRecptn).on(QSms.sms.smsId.eq(QSmsRecptn.smsRecptn.id.smsId))
                .where(searchExpression(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    @Override
    public Page<Sms> searchSms(String searchCondition, String searchKeyword, Pageable pageable) {
        return searchSmsUnits(searchCondition, searchKeyword, pageable);
    }

    private BooleanExpression searchExpression(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("0".equals(searchCondition)) { // 수신전화번호 (RECPTN_TELNO)
            return QSmsRecptn.smsRecptn.id.recptnTelno.contains(searchKeyword);
        } else if ("1".equals(searchCondition)) { // 전송내용 (TRNSMIS_CN)
            return QSms.sms.sndngCn.contains(searchKeyword);
        }

        return null;
    }
}
