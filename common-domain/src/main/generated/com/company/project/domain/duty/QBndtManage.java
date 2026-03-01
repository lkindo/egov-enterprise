package com.company.project.domain.duty;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QBndtManage is a Querydsl query type for BndtManage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBndtManage extends EntityPathBase<BndtManage> {

    private static final long serialVersionUID = 919716482L;

    public static final QBndtManage bndtManage = new QBndtManage("bndtManage");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath bndtDe = createString("bndtDe");

    public final StringPath bndtId = createString("bndtId");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath remark = createString("remark");

    public QBndtManage(String variable) {
        super(BndtManage.class, forVariable(variable));
    }

    public QBndtManage(Path<? extends BndtManage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBndtManage(PathMetadata metadata) {
        super(BndtManage.class, metadata);
    }

}
