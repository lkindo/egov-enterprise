package nuri.business.domain.sms;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.jpa.JPAExpressions;
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

    /**
     * 발송 건 목록 — 페이지는 <b>발송 건(tb_sms_info) 단위</b>로 자른다.
     *
     * <p>[2026-10-19] 종전에는 수신자 표를 조인한 뒤 offset/limit 을 걸어, 수신자가 여럿인 발송 건이 그 수만큼 행을
     * 차지했다. 한 쪽에 같은 건이 겹쳐 실리거나(혹은 중복 제거로 쪽 크기보다 적게 실리고) 다음 쪽의 건이 밀려 빠졌다 —
     * 전체 건수는 countDistinct 라 맞아 보였다. 수신번호 검색은 조인 대신 EXISTS 로 바꿔, 목록·건수 모두 발송 건만 센다.
     */
    @Override
    public Page<Sms> searchSms(String searchCondition, String searchKeyword, Pageable pageable) {
        List<Sms> content = queryFactory
                .selectFrom(QSms.sms)
                .where(searchExpression(searchCondition, searchKeyword))
                .orderBy(QSms.sms.smsTrsmSn.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(QSms.sms.count())
                .from(QSms.sms)
                .where(searchExpression(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable),
                total == null ? 0L : total);
    }

    private BooleanExpression searchExpression(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("0".equals(searchCondition)) { // 수신전화번호 (RECPTN_TELNO)
            // 그 번호로 보낸 수신자가 하나라도 있는 발송 건. 전환 전 하이픈 키와 전환 후 숫자 키를 같은 검색어로 찾는다.
            QSmsRecptn recipient = QSmsRecptn.smsRecptn;
            return JPAExpressions.selectOne()
                    .from(recipient)
                    .where(recipient.id.smsTrsmSn.eq(QSms.sms.smsTrsmSn),
                            Expressions.stringTemplate("replace({0}, '-', '')", recipient.id.rcptnTelno)
                                    .contains(SmsRecipientNumber.canonicalize(searchKeyword)))
                    .exists();
        } else if ("1".equals(searchCondition)) { // 전송내용 (TRNSMIS_CN)
            return QSms.sms.sndngCn.contains(searchKeyword);
        }

        return null;
    }
}
