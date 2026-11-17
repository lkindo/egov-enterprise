package nuri.business.domain.sms;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
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
     *
     * <p>[Top 1d] 키워드 검색(수신번호·발송내용)은 <b>본인이 발송한 건({@code frstRgtrId = senderLoginId})</b> 으로
     * 범위를 한정한다. 타인 발송 건은 응답 DTO 에서 번호 마스킹·본문 비움을 하더라도, 키워드 검색 매칭 여부로 평문 내용이나
     * 수신번호의 존재를 추측할 수 있는 블라인드 오라클을 차단한다.
     */
    @Override
    public Page<Sms> searchSms(String searchCondition, String searchKeyword, @Nullable String senderLoginId, Pageable pageable) {
        BooleanExpression predicate = searchExpression(searchCondition, searchKeyword, senderLoginId);
        List<Sms> content = queryFactory
                .selectFrom(QSms.sms)
                .where(predicate)
                .orderBy(QSms.sms.smsTrsmSn.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(QSms.sms.count())
                .from(QSms.sms)
                .where(predicate)
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable),
                total == null ? 0L : total);
    }

    private BooleanExpression searchExpression(String searchCondition, String searchKeyword, @Nullable String senderLoginId) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("0".equals(searchCondition)) { // 수신전화번호 (RECPTN_TELNO)
            if (!StringUtils.hasText(senderLoginId)) {
                return Expressions.FALSE.isTrue();
            }
            // 그 번호로 보낸 수신자가 하나라도 있는 본인 발송 건. 전환 전 하이픈 키와 전환 후 숫자 키를 같은 검색어로 찾는다.
            QSmsRecptn recipient = QSmsRecptn.smsRecptn;
            return QSms.sms.frstRgtrId.eq(senderLoginId).and(
                    JPAExpressions.selectOne()
                            .from(recipient)
                            .where(recipient.id.smsTrsmSn.eq(QSms.sms.smsTrsmSn),
                                    Expressions.stringTemplate("replace({0}, '-', '')", recipient.id.rcptnTelno)
                                            .contains(SmsRecipientNumber.canonicalize(searchKeyword)))
                            .exists());
        } else if ("1".equals(searchCondition)) { // 전송내용 (TRNSMIS_CN)
            if (!StringUtils.hasText(senderLoginId)) {
                return Expressions.FALSE.isTrue();
            }
            return QSms.sms.frstRgtrId.eq(senderLoginId)
                    .and(QSms.sms.sndngCn.contains(searchKeyword));
        }

        return null;
    }
}
