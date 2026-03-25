const fs = require('fs');

let code = fs.readFileSync('frontend/src/app/components/layout/sidebar.tsx', 'utf8');

// 1. Add useQuery and useQueryClient imports
code = code.replace(
  "import { useLayout } from '@/contexts/LayoutContext';",
  "import { useLayout } from '@/contexts/LayoutContext';\nimport { useQuery, useQueryClient } from '@tanstack/react-query';"
);

// 2. Modify NavItem to handle isOpen logic
code = code.replace(
  'const [isOpen, setIsOpen] = useState(false);',
  'const [isOpen, setIsOpen] = useState(false);\n  const [isMounted, setIsMounted] = useState(false);'
);

code = code.replace(
  /useEffect\(\(\) => \{\n    if \(isActive && hasChildren\) \{\n      setIsOpen\(true\);\n    \}\n  \}, \[isActive, hasChildren\]\);/g,
  'useEffect(() => {\n    setIsMounted(true);\n    if (isActive && hasChildren) {\n      setIsOpen(true);\n    }\n  }, [isActive, hasChildren]);'
);

// 3. Update the NavItem return early return for client mount
code = code.replace(
  'return (\n    <div className="w-full relative">',
  'if (!isMounted) return null;\n\n  return (\n    <div className="w-full relative">'
);

// 4. Refactor Sidebar component to use React Query
const sidebarComponentRegex = /export function Sidebar\(\{ initialMenus = \[\] \}: \{ initialMenus\?: any\[\] \}\) \{\n  const \[menus, setMenus\] = useState<MenuItem\[\]>\(\[\]\);\n  const \[topMenus, setTopMenus\] = useState<any\[\]>\(initialMenus\);\n  const \[loading, setLoading\] = useState\(false\);\n  const \{ isSidebarOpen, setSidebarOpen, activeMenuNo, setActiveMenuNo \} = useLayout\(\);\n\n  useEffect\(\(\) => \{\n    menuService\.getHeadMenus\(\)\.then\(res => setTopMenus\(res \|\| \[\]\)\);\n  \}, \[\]\);\n\n  useEffect\(\(\) => \{\n    if \(!activeMenuNo && topMenus\.length > 0\) \{\n      setActiveMenuNo\(topMenus\[0\]\.menuNo\);\n      return;\n    \}\n\n    async function loadMenus\(\) \{\n      if \(!activeMenuNo\) return;\n\n      const activeTop = topMenus\.find\(m => m\.menuNo === activeMenuNo\);\n      if \(activeTop\?\.children && activeTop\.children\.length > 0\) \{\n        setMenus\(activeTop\.children\);\n        return;\n      \}\n\n      try \{\n        setLoading\(true\);\n        const leftList = await menuService\.getLeftMenus\(activeMenuNo\);\n        setMenus\(leftList\);\n      \} catch \(error\) \{\n        console\.error\('Sidebar: Failed to load left menus', error\);\n        setMenus\(\[\]\);\n      \} finally \{\n        setLoading\(false\);\n      \}\n    \}\n    loadMenus\(\);\n  \}, \[activeMenuNo, topMenus, setActiveMenuNo\]\);/m;

const newSidebarLogic = `export function Sidebar({ initialMenus = [] }: { initialMenus?: any[] }) {
  const { isSidebarOpen, setSidebarOpen, activeMenuNo, setActiveMenuNo } = useLayout();
  const queryClient = useQueryClient();

  // Head Menus (Top Domains) Query
  const { data: topMenus = initialMenus } = useQuery({
    queryKey: ['menus', 'head'],
    queryFn: () => menuService.getHeadMenus(),
    initialData: initialMenus,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Default activeMenuNo setting
  useEffect(() => {
    if (!activeMenuNo && topMenus.length > 0) {
      setActiveMenuNo(topMenus[0].menuNo);
    }
  }, [activeMenuNo, topMenus, setActiveMenuNo]);

  // Left Menus (Sub Menus) Query based on activeMenuNo
  const { data: menus = [], isLoading: loading } = useQuery({
    queryKey: ['menus', 'left', activeMenuNo],
    queryFn: async () => {
      if (!activeMenuNo) return [];
      
      // Check if it's already in the topMenus children (SSR pre-fetched data)
      const activeTop = topMenus.find(m => m.menuNo === activeMenuNo);
      if (activeTop?.children && activeTop.children.length > 0) {
        return activeTop.children;
      }
      
      return await menuService.getLeftMenus(activeMenuNo);
    },
    enabled: !!activeMenuNo, // Only run if activeMenuNo exists
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });`;

code = code.replace(sidebarComponentRegex, newSidebarLogic);

fs.writeFileSync('frontend/src/app/components/layout/sidebar.tsx', code, 'utf8');
console.log('Sidebar successfully updated to use React Query');
