package com.company.project.domain.menu;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QBkmkMenu_BkmkMenuId is a Querydsl query type for BkmkMenuId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QBkmkMenu_BkmkMenuId extends BeanPath<BkmkMenu.BkmkMenuId> {

    private static final long serialVersionUID = -2145138735L;

    public static final QBkmkMenu_BkmkMenuId bkmkMenuId = new QBkmkMenu_BkmkMenuId("bkmkMenuId");

    public final NumberPath<Long> menuId = createNumber("menuId", Long.class);

    public final StringPath userId = createString("userId");

    public QBkmkMenu_BkmkMenuId(String variable) {
        super(BkmkMenu.BkmkMenuId.class, forVariable(variable));
    }

    public QBkmkMenu_BkmkMenuId(Path<? extends BkmkMenu.BkmkMenuId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBkmkMenu_BkmkMenuId(PathMetadata metadata) {
        super(BkmkMenu.BkmkMenuId.class, metadata);
    }

}
