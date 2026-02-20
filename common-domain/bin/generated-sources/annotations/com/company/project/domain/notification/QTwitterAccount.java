package com.company.project.domain.notification;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QTwitterAccount is a Querydsl query type for TwitterAccount
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QTwitterAccount extends EntityPathBase<TwitterAccount> {

    private static final long serialVersionUID = 199420966L;

    public static final QTwitterAccount twitterAccount = new QTwitterAccount("twitterAccount");

    public final StringPath cnsmrKey = createString("cnsmrKey");

    public final StringPath cnsmrSecret = createString("cnsmrSecret");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath userId = createString("userId");

    public QTwitterAccount(String variable) {
        super(TwitterAccount.class, forVariable(variable));
    }

    public QTwitterAccount(Path<? extends TwitterAccount> path) {
        super(path.getType(), path.getMetadata());
    }

    public QTwitterAccount(PathMetadata metadata) {
        super(TwitterAccount.class, metadata);
    }

}

