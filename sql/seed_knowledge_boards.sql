-- Knowledge Hub Board Seeding Script (Final Polish)
-- Target Tables: NBBSMASTER, NBBSMASTEROPTN

-- 1. FAQ Board (BBSMSTR_BBBBBBBBBBBB)
INSERT INTO public.nbbsmaster (
    bbs_id, bbs_nm, bbs_intrcn, bbs_ty_code, reply_posbl_at, 
    file_atch_posbl_at, atch_posbl_file_number, atch_posbl_file_size, 
    use_at, tmplat_id, frst_register_id, frst_regist_pnttm
) VALUES (
    'BBSMSTR_BBBBBBBBBBBB', '자주 묻는 질문(FAQ)', '지식 허브 FAQ 게시판', 'BBST06', 'N', 
    'Y', 3, 5242880, 
    'Y', 'TMPLT_FAQ', 'SYSTEM', CURRENT_TIMESTAMP
) ON CONFLICT (bbs_id) DO UPDATE SET
    bbs_nm = EXCLUDED.bbs_nm,
    bbs_ty_code = EXCLUDED.bbs_ty_code,
    tmplat_id = EXCLUDED.tmplat_id;

-- 2. Q&A Board (BBSMSTR_DDDDDDDDDDDD)
INSERT INTO public.nbbsmaster (
    bbs_id, bbs_nm, bbs_intrcn, bbs_ty_code, reply_posbl_at, 
    file_atch_posbl_at, atch_posbl_file_number, atch_posbl_file_size, 
    use_at, tmplat_id, frst_register_id, frst_regist_pnttm
) VALUES (
    'BBSMSTR_DDDDDDDDDDDD', '질의응답(Q&A)', '지식 허브 Q&A 게시판', 'BBST04', 'Y', 
    'Y', 3, 5242880, 
    'Y', 'TMPLT_QNA', 'SYSTEM', CURRENT_TIMESTAMP
) ON CONFLICT (bbs_id) DO UPDATE SET
    bbs_nm = EXCLUDED.bbs_nm,
    bbs_ty_code = EXCLUDED.bbs_ty_code,
    tmplat_id = EXCLUDED.tmplat_id;

-- 3. Wiki Board (BBSMSTR_EEEEEEEEEEEE)
INSERT INTO public.nbbsmaster (
    bbs_id, bbs_nm, bbs_intrcn, bbs_ty_code, reply_posbl_at, 
    file_atch_posbl_at, atch_posbl_file_number, atch_posbl_file_size, 
    use_at, tmplat_id, frst_register_id, frst_regist_pnttm
) VALUES (
    'BBSMSTR_EEEEEEEEEEEE', '엔터프라이즈 위키', '지식 허브 위키 게시판', 'BBST07', 'N', 
    'Y', 5, 10485760, 
    'Y', 'TMPLT_WIKI', 'SYSTEM', CURRENT_TIMESTAMP
) ON CONFLICT (bbs_id) DO UPDATE SET
    bbs_nm = EXCLUDED.bbs_nm,
    bbs_ty_code = EXCLUDED.bbs_ty_code,
    tmplat_id = EXCLUDED.tmplat_id;

-- 4. Community Board (BBSMSTR_CCCCCCCCCCCC)
INSERT INTO public.nbbsmaster (
    bbs_id, bbs_nm, bbs_intrcn, bbs_ty_code, reply_posbl_at, 
    file_atch_posbl_at, atch_posbl_file_number, atch_posbl_file_size, 
    use_at, tmplat_id, frst_register_id, frst_regist_pnttm
) VALUES (
    'BBSMSTR_CCCCCCCCCCCC', '자유게시판', '지식 허브 자유 커뮤니티', 'BBST01', 'Y', 
    'Y', 10, 20971520, 
    'Y', 'TMPLAT_BOARD_DEFAULT', 'SYSTEM', CURRENT_TIMESTAMP
) ON CONFLICT (bbs_id) DO UPDATE SET
    bbs_nm = EXCLUDED.bbs_nm,
    bbs_ty_code = EXCLUDED.bbs_ty_code;

-- Options for Q&A (Enable Answer function)
INSERT INTO public.nbbsmasteroptn (
    bbs_id, answer_at, stsfdg_at, frst_register_id, frst_regist_pnttm
) VALUES (
    'BBSMSTR_DDDDDDDDDDDD', 'Y', 'Y', 'SYSTEM', CURRENT_TIMESTAMP
) ON CONFLICT (bbs_id) DO UPDATE SET 
    answer_at = 'Y', 
    stsfdg_at = 'Y';
