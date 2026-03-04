package com.company.project.domain.rsm;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QRecentSrchwrdManage is a Querydsl query type for RecentSrchwrdManage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QRecentSrchwrdManage extends EntityPathBase<RecentSrchwrdManage> {

    private static final long serialVersionUID = 1631078582L;

    public static final QRecentSrchwrdManage recentSrchwrdManage = new QRecentSrchwrdManage("recentSrchwrdManage");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath srchwrdConectUrl = createString("srchwrdConectUrl");

    public final StringPath srchwrdManageId = createString("srchwrdManageId");

    public final StringPath srchwrdManageNm = createString("srchwrdManageNm");

    public final StringPath userSearchAt = createString("userSearchAt");

    public QRecentSrchwrdManage(String variable) {
        super(RecentSrchwrdManage.class, forVariable(variable));
    }

    public QRecentSrchwrdManage(Path<? extends RecentSrchwrdManage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QRecentSrchwrdManage(PathMetadata metadata) {
        super(RecentSrchwrdManage.class, metadata);
    }

}