package com.company.project.domain.mail;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QSentMail is a Querydsl query type for SentMail
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSentMail extends EntityPathBase<SentMail> {

    private static final long serialVersionUID = -1268577265L;

    public static final QSentMail sentMail = new QSentMail("sentMail");

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath dsptchPerson = createString("dsptchPerson");

    public final StringPath emailCn = createString("emailCn");

    public final StringPath mssageId = createString("mssageId");

    public final StringPath recptnPerson = createString("recptnPerson");

    public final StringPath sj = createString("sj");

    public final StringPath sndngDe = createString("sndngDe");

    public final StringPath sndngResultCode = createString("sndngResultCode");

    public QSentMail(String variable) {
        super(SentMail.class, forVariable(variable));
    }

    public QSentMail(Path<? extends SentMail> path) {
        super(path.getType(), path.getMetadata());
    }

    public QSentMail(PathMetadata metadata) {
        super(SentMail.class, metadata);
    }

}