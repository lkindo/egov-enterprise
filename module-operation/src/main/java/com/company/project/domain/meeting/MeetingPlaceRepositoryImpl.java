package com.company.project.domain.meeting;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static com.company.project.domain.meeting.QMeetingPlace.meetingPlace;

/**
 * ???벥???類ｋ궖 Repository Custom ?닌뗭겱筌?
 */
@RequiredArgsConstructor
public class MeetingPlaceRepositoryImpl implements MeetingPlaceRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<MeetingPlace> searchMeetingPlaces(String keyword, Pageable pageable) {
        List<MeetingPlace> content = queryFactory
                .selectFrom(meetingPlace)
                .where(keywordContains(keyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(meetingPlace.mtgPlaceNm.asc())
                .fetch();

        long total = queryFactory
                .select(meetingPlace.count())
                .from(meetingPlace)
                .where(keywordContains(keyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    private BooleanExpression keywordContains(String keyword) {
        return StringUtils.hasText(keyword) ? meetingPlace.mtgPlaceNm.containsIgnoreCase(keyword) : null;
    }
}
