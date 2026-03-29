package com.company.project.foundation.domain.menu;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QBkmkMenu is a Querydsl query type for BkmkMenu
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBkmkMenu extends EntityPathBase<BkmkMenu> {

    private static final long serialVersionUID = -1898399117L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QBkmkMenu bkmkMenu = new QBkmkMenu("bkmkMenu");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final QBkmkMenu_BkmkMenuId id;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath menuNm = createString("menuNm");

    public final StringPath progrmStrePath = createString("progrmStrePath");

    public QBkmkMenu(String variable) {
        this(BkmkMenu.class, forVariable(variable), INITS);
    }

    public QBkmkMenu(Path<? extends BkmkMenu> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QBkmkMenu(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QBkmkMenu(PathMetadata metadata, PathInits inits) {
        this(BkmkMenu.class, metadata, inits);
    }

    public QBkmkMenu(Class<? extends BkmkMenu> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.id = inits.isInitialized("id") ? new QBkmkMenu_BkmkMenuId(forProperty("id")) : null;
    }

}

