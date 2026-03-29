package com.company.project.foundation.domain.menu;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QMenu is a Querydsl query type for Menu
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QMenu extends EntityPathBase<Menu> {

    private static final long serialVersionUID = -809519956L;

    public static final QMenu menu = new QMenu("menu");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final NumberPath<Long> id = createNumber("id", Long.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath menuDc = createString("menuDc");

    public final StringPath menuNm = createString("menuNm");

    public final NumberPath<Integer> menuOrdr = createNumber("menuOrdr", Integer.class);

    public final StringPath modernRoute = createString("modernRoute");

    public final StringPath progrmFileNm = createString("progrmFileNm");

    public final StringPath relateImageNm = createString("relateImageNm");

    public final StringPath relateImagePath = createString("relateImagePath");

    public final DateTimePath<java.time.LocalDateTime> routeUpdatedAt = createDateTime("routeUpdatedAt", java.time.LocalDateTime.class);

    public final NumberPath<Long> upperMenuNo = createNumber("upperMenuNo", Long.class);

    public QMenu(String variable) {
        super(Menu.class, forVariable(variable));
    }

    public QMenu(Path<? extends Menu> path) {
        super(path.getType(), path.getMetadata());
    }

    public QMenu(PathMetadata metadata) {
        super(Menu.class, metadata);
    }

}

