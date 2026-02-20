package com.company.project.domain.duty;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QBndtCeckManage is a Querydsl query type for BndtCeckManage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBndtCeckManage extends EntityPathBase<BndtCeckManage> {

    private static final long serialVersionUID = 1332379884L;

    public static final QBndtCeckManage bndtCeckManage = new QBndtCeckManage("bndtCeckManage");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath bndtCeckCd = createString("bndtCeckCd");

    public final StringPath bndtCeckCdNm = createString("bndtCeckCdNm");

    public final StringPath bndtCeckSe = createString("bndtCeckSe");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath useAt = createString("useAt");

    public QBndtCeckManage(String variable) {
        super(BndtCeckManage.class, forVariable(variable));
    }

    public QBndtCeckManage(Path<? extends BndtCeckManage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBndtCeckManage(PathMetadata metadata) {
        super(BndtCeckManage.class, metadata);
    }

}

