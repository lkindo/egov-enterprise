package com.company.project.domain.menu;

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

    private static final long serialVersionUID = -1485576802L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QBkmkMenu bkmkMenu = new QBkmkMenu("bkmkMenu");

    public final QBkmkMenu_BkmkMenuId id;

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
