package com.company.project.domain.survey;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QOnlinePollItem is a Querydsl query type for OnlinePollItem
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QOnlinePollItem extends EntityPathBase<OnlinePollItem> {

    private static final long serialVersionUID = -698135742L;

    public static final QOnlinePollItem onlinePollItem = new QOnlinePollItem("onlinePollItem");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath pollId = createString("pollId");

    public final StringPath pollIemId = createString("pollIemId");

    public final StringPath pollIemNm = createString("pollIemNm");

    public QOnlinePollItem(String variable) {
        super(OnlinePollItem.class, forVariable(variable));
    }

    public QOnlinePollItem(Path<? extends OnlinePollItem> path) {
        super(path.getType(), path.getMetadata());
    }

    public QOnlinePollItem(PathMetadata metadata) {
        super(OnlinePollItem.class, metadata);
    }

}
