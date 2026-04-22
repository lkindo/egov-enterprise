CREATE TABLE IF NOT EXISTS nindvdlpge (
    pge_id character varying(20) NOT NULL,
    pge_nm character varying(255) NOT NULL,
    pge_dc character varying(1000),
    emplyr_id character varying(20) NOT NULL,
    frst_register_id character varying(20),
    frst_regist_pnttm timestamp without time zone,
    last_updusr_id character varying(20),
    last_updt_pnttm timestamp without time zone,
    CONSTRAINT nindvdlpge_pkey PRIMARY KEY (pge_id)
);
