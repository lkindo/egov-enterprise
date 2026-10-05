package nuri.business.domain.menu;

import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static nuri.business.domain.menu.QMenu.menu;

@RequiredArgsConstructor
public class MenuRepositoryImpl implements MenuRepositoryCustom {

        private final JPAQueryFactory queryFactory;

        @Override
        public Page<Menu> searchMenus(String searchKeyword, Pageable pageable) {
                List<Menu> content = queryFactory
                                .selectFrom(menu)
                                .where(menuNmLike(searchKeyword))
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .orderBy(menu.menuOrdr.asc())
                                .fetch();

                long total = queryFactory
                                .select(menu.count())
                                .from(menu)
                                .where(menuNmLike(searchKeyword))
                                .fetchOne();

                return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
        }

        private com.querydsl.core.types.dsl.BooleanExpression menuNmLike(String searchKeyword) {
                return StringUtils.hasText(searchKeyword) ? menu.menuNm.contains(searchKeyword) : null;
        }
}
