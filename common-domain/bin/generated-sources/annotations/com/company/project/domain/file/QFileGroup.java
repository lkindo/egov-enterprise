package com.company.project.domain.file;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QFileGroup is a Querydsl query type for FileGroup
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QFileGroup extends EntityPathBase<FileGroup> {

    private static final long serialVersionUID = -1204592312L;

    public static final QFileGroup fileGroup = new QFileGroup("fileGroup");

    public final com.company.project.domain.common.QBaseTimeEntity _super = new com.company.project.domain.common.QBaseTimeEntity(this);

    public final StringPath atchFileId = createString("atchFileId");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final ListPath<FileItem, QFileItem> fileItems = this.<FileItem, QFileItem>createList("fileItems", FileItem.class, QFileItem.class, PathInits.DIRECT2);

    public final NumberPath<Long> id = createNumber("id", Long.class);

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath useAt = createString("useAt");

    public QFileGroup(String variable) {
        super(FileGroup.class, forVariable(variable));
    }

    public QFileGroup(Path<? extends FileGroup> path) {
        super(path.getType(), path.getMetadata());
    }

    public QFileGroup(PathMetadata metadata) {
        super(FileGroup.class, metadata);
    }

}

