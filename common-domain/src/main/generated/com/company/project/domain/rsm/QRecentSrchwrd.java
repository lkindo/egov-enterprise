package com.company.project.domain.rsm;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QRecentSrchwrd is a Querydsl query type for RecentSrchwrd
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QRecentSrchwrd extends EntityPathBase<RecentSrchwrd> {

    private static final long serialVersionUID = 1892694001L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QRecentSrchwrd recentSrchwrd = new QRecentSrchwrd("recentSrchwrd");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final QRecentSrchwrdManage recentSrchwrdManage;

    public final StringPath srchwrdId = createString("srchwrdId");

    public final StringPath srchwrdManageId = createString("srchwrdManageId");

    public final StringPath srchwrdNm = createString("srchwrdNm");

    public QRecentSrchwrd(String variable) {
        this(RecentSrchwrd.class, forVariable(variable), INITS);
    }

    public QRecentSrchwrd(Path<? extends RecentSrchwrd> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QRecentSrchwrd(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QRecentSrchwrd(PathMetadata metadata, PathInits inits) {
        this(RecentSrchwrd.class, metadata, inits);
    }

    public QRecentSrchwrd(Class<? extends RecentSrchwrd> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.recentSrchwrdManage = inits.isInitialized("recentSrchwrdManage") ? new QRecentSrchwrdManage(forProperty("recentSrchwrdManage")) : null;
    }

}
