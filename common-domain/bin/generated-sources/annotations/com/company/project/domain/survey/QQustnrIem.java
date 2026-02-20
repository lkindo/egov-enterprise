package com.company.project.domain.survey;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QQustnrIem is a Querydsl query type for QustnrIem
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QQustnrIem extends EntityPathBase<QustnrIem> {

    private static final long serialVersionUID = 1057728395L;

    public static final QQustnrIem qustnrIem = new QQustnrIem("qustnrIem");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath etcAnswerAt = createString("etcAnswerAt");

    public final StringPath iemCn = createString("iemCn");

    public final NumberPath<Long> iemSn = createNumber("iemSn", Long.class);

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath qestnrId = createString("qestnrId");

    public final StringPath qestnrQesitmId = createString("qestnrQesitmId");

    public final StringPath qestnrTmplatId = createString("qestnrTmplatId");

    public final StringPath qustnrIemId = createString("qustnrIemId");

    public QQustnrIem(String variable) {
        super(QustnrIem.class, forVariable(variable));
    }

    public QQustnrIem(Path<? extends QustnrIem> path) {
        super(path.getType(), path.getMetadata());
    }

    public QQustnrIem(PathMetadata metadata) {
        super(QustnrIem.class, metadata);
    }

}

