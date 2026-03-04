package com.company.project.domain.schedule;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QMemoTodo is a Querydsl query type for MemoTodo
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QMemoTodo extends EntityPathBase<MemoTodo> {

    private static final long serialVersionUID = -1242380832L;

    public static final QMemoTodo memoTodo = new QMemoTodo("memoTodo");

    public final com.company.project.domain.common.QBaseTimeEntity _super = new com.company.project.domain.common.QBaseTimeEntity(this);

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath frstRegisterId = createString("frstRegisterId");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath todoBeginTime = createString("todoBeginTime");

    public final StringPath todoCn = createString("todoCn");

    public final StringPath todoEndTime = createString("todoEndTime");

    public final StringPath todoId = createString("todoId");

    public final StringPath todoNm = createString("todoNm");

    public final StringPath wrterId = createString("wrterId");

    public QMemoTodo(String variable) {
        super(MemoTodo.class, forVariable(variable));
    }

    public QMemoTodo(Path<? extends MemoTodo> path) {
        super(path.getType(), path.getMetadata());
    }

    public QMemoTodo(PathMetadata metadata) {
        super(MemoTodo.class, metadata);
    }

}