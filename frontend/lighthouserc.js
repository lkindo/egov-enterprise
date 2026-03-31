module.exports = {
  ci: {
    collect: {
      // Lighthouse 가 크롤링할 URL 목록
      url: [
        'http://localhost:3001/login',
        'http://localhost:3001/admin',
        'http://localhost:3001/admin/users',
        'http://localhost:3001/admin/menus',
        'http://localhost:3001/admin/common-codes',
        'http://localhost:3001/admin/boards',
        'http://localhost:3001/admin/statistics',
      ],
      // 각 URL 별 크롤링 깊이
      numberOfRuns: 3,
      // 모바일 에뮬레이션
      settings: {
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        // Core Web Vitals 측정
        skipAudits: ['uses-rel-preconnect', 'uses-rel-preload'],
      },
    },
    upload: {
      // 결과 업로드 설정 (LHCI 서버 또는 temporary public storage)
      target: 'temporary-public-storage',
    },
    assert: {
      // 성능 기준치 설정
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        
        // Core Web Vitals 개별 기준
        'first-contentful-paint': ['warn', { maxNumericValue: 1500 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        
        // 특정 감사 항목 무시 (프로젝트 특성에 따라)
        'uses-long-cache-ttl': 'off', // 정적 자산 캐싱은 CI 환경에서 항상 낮음
      },
    },
  },
};
