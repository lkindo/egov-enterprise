package com.company.project.domain.survey;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QOnlinePollManage is a Querydsl query type for OnlinePollManage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QOnlinePollManage extends EntityPathBase<OnlinePollManage> {

    private static final long serialVersionUID = -796320300L;

    public static final QOnlinePollManage onlinePollManage = new QOnlinePollManage("onlinePollManage");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath pollAutoDsuseYn = createString("pollAutoDsuseYn");

    public final StringPath pollBeginDe = createString("pollBeginDe");

    public final StringPath pollDsuseYn = createString("pollDsuseYn");

    public final StringPath pollEndDe = createString("pollEndDe");

    public final StringPath pollId = createString("pollId");

    public final ListPath<OnlinePollItem, QOnlinePollItem> pollItems = this.<OnlinePollItem, QOnlinePollItem>createList("pollItems", OnlinePollItem.class, QOnlinePollItem.class, PathInits.DIRECT2);

    public final StringPath pollKindCode = createString("pollKindCode");

    public final StringPath pollNm = createString("pollNm");

    public QOnlinePollManage(String variable) {
        super(OnlinePollManage.class, forVariable(variable));
    }

    public QOnlinePollManage(Path<? extends OnlinePollManage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QOnlinePollManage(PathMetadata metadata) {
        super(OnlinePollManage.class, metadata);
    }

}
