-- Navigation Route & Label Fix Script
-- Fixes Top-level menus having NULL modern_route and updates Knowledge Hub menu labels.

-- 1. Community & Content (커뮤니티 및 콘텐츠)
UPDATE public.nmenuinfo 
SET modern_route = '/admin/community/boards/master' 
WHERE menu_no = 2000000;

-- 2. Information Section & User Support (정보섹션 및 사용자지원)
UPDATE public.nmenuinfo 
SET modern_route = '/admin/notifications' 
WHERE menu_no = 2030000;

-- 3. System Management Center (시스템 관리 센터)
UPDATE public.nmenuinfo 
SET modern_route = '/admin/user/manage' 
WHERE menu_no = 9000000;

-- 4. Personal Work Hub (개인 업무 허브)
UPDATE public.nmenuinfo 
SET modern_route = '/admin/work-hub' 
WHERE menu_no = 1000000;

-- 5. Business Intelligence & Ops (비즈니스 운영 및 자산)
UPDATE public.nmenuinfo 
SET modern_route = '/admin/operation/rewards' 
WHERE menu_no = 6000000;

-- 6. Knowledge Hub Sub-menu Labels & Routes
-- Rename 'Help' to 'Enterprise Wiki'
UPDATE public.nmenuinfo 
SET menu_nm = '엔터프라이즈 위키', 
    modern_route = '/admin/help/faq?tab=WIKI' 
WHERE menu_no = 2040000;

-- Ensure FAQ route
UPDATE public.nmenuinfo 
SET menu_nm = '자주 묻는 질문(FAQ)', 
    modern_route = '/admin/help/faq?tab=FAQ' 
WHERE menu_no = 2060000;

-- Ensure Q&A route
UPDATE public.nmenuinfo 
SET menu_nm = '질의응답(Q&A)', 
    modern_route = '/admin/help/faq?tab=QNA' 
WHERE menu_no = 2070000;
