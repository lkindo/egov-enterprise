package com.company.project.domain.mail;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;

import static com.company.project.domain.mail.QSentMail.sentMail;

@RequiredArgsConstructor
public class SentMailRepositoryImpl implements SentMailRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<SentMail> searchSentMails(String searchCondition, String searchKeyword, Pageable pageable) {
        List<SentMail> content = queryFactory
                .selectFrom(sentMail)
                .where(searchExpression(searchCondition, searchKeyword))
                .orderBy(sentMail.mssageId.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(sentMail.count())
                .from(sentMail)
                .where(searchExpression(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    private BooleanExpression searchExpression(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("1".equals(searchCondition)) { // 제목 (sj)
            return sentMail.sj.contains(searchKeyword);
        } else if ("2".equals(searchCondition)) { // 메일내용 (emailCn)
            return sentMail.emailCn.contains(searchKeyword);
        } else if ("3".equals(searchCondition)) { // 발신자 (dsptchPerson)
            return sentMail.dsptchPerson.contains(searchKeyword);
        }

        return null;
    }
}
