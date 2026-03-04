package com.company.project.domain.duty;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QBndtDiary is a Querydsl query type for BndtDiary
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBndtDiary extends EntityPathBase<BndtDiary> {

    private static final long serialVersionUID = 714319622L;

    public static final QBndtDiary bndtDiary = new QBndtDiary("bndtDiary");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath bndtCeckCd = createString("bndtCeckCd");

    public final StringPath bndtCeckSe = createString("bndtCeckSe");

    public final StringPath bndtDe = createString("bndtDe");

    public final StringPath bndtId = createString("bndtId");

    public final StringPath chckSttus = createString("chckSttus");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public QBndtDiary(String variable) {
        super(BndtDiary.class, forVariable(variable));
    }

    public QBndtDiary(Path<? extends BndtDiary> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBndtDiary(PathMetadata metadata) {
        super(BndtDiary.class, metadata);
    }

}