package com.company.project.business.domain.file;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QFileItem is a Querydsl query type for FileItem
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QFileItem extends EntityPathBase<FileItem> {

    private static final long serialVersionUID = -411912622L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QFileItem fileItem = new QFileItem("fileItem");

    public final com.company.project.foundation.domain.common.QBaseTimeEntity _super = new com.company.project.foundation.domain.common.QBaseTimeEntity(this);

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath fileExtsn = createString("fileExtsn");

    public final QFileGroup fileGroup;

    public final NumberPath<Long> fileSize = createNumber("fileSize", Long.class);

    public final NumberPath<Integer> fileSn = createNumber("fileSn", Integer.class);

    public final StringPath fileStreCours = createString("fileStreCours");

    public final NumberPath<Long> id = createNumber("id", Long.class);

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath orignlFileNm = createString("orignlFileNm");

    public final StringPath streFileNm = createString("streFileNm");

    public QFileItem(String variable) {
        this(FileItem.class, forVariable(variable), INITS);
    }

    public QFileItem(Path<? extends FileItem> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QFileItem(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QFileItem(PathMetadata metadata, PathInits inits) {
        this(FileItem.class, metadata, inits);
    }

    public QFileItem(Class<? extends FileItem> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.fileGroup = inits.isInitialized("fileGroup") ? new QFileGroup(forProperty("fileGroup")) : null;
    }

}

