package nuri.business.domain.mail;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static nuri.business.domain.mail.QSentMail.sentMail;

@RequiredArgsConstructor
public class SentMailRepositoryImpl implements SentMailRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<SentMail> searchSentMails(String senderLoginId, String searchCondition, String searchKeyword,
            Pageable pageable) {
        List<SentMail> content = queryFactory
                .selectFrom(sentMail)
                .where(senderEq(senderLoginId), searchExpression(searchCondition, searchKeyword))
                .orderBy(sentMail.msgId.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(sentMail.count())
                .from(sentMail)
                .where(senderEq(senderLoginId), searchExpression(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable),
                total != null ? total : 0L);
    }

    /** 발신자(등록자) 한정 조건. 감사 컬럼 frstRgtrId 에는 loginId 가 저장된다. */
    private BooleanExpression senderEq(String senderLoginId) {
        return StringUtils.hasText(senderLoginId) ? sentMail.frstRgtrId.eq(senderLoginId) : null;
    }

    private BooleanExpression searchExpression(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("1".equals(searchCondition)) { // 제목 (sj)
            return sentMail.emlTtl.contains(searchKeyword);
        } else if ("2".equals(searchCondition)) { // 메일내용 (emailCn)
            return sentMail.emlCn.contains(searchKeyword);
        } else if ("3".equals(searchCondition)) { // 발신자 (dsptchPerson)
            return sentMail.sndptyNm.contains(searchKeyword);
        }

        return null;
    }
}
