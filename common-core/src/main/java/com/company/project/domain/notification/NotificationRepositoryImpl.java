package com.company.project.domain.notification;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static com.company.project.domain.notification.QNotification.notification;

/**
 * ?類ｋ궖???뵝 Repository Custom ?닌뗭겱筌?
 */
@RequiredArgsConstructor
public class NotificationRepositoryImpl implements NotificationRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<Notification> searchNotifications(String keyword, Pageable pageable) {
        List<Notification> content = queryFactory
                .selectFrom(notification)
                .where(keywordContains(keyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(notification.createdDate.desc())
                .fetch();

        long total = queryFactory
                .select(notification.count())
                .from(notification)
                .where(keywordContains(keyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    private BooleanExpression keywordContains(String keyword) {
        return StringUtils.hasText(keyword) ? notification.ntfcSj.containsIgnoreCase(keyword)
                .or(notification.ntfcCn.containsIgnoreCase(keyword)) : null;
    }
}
