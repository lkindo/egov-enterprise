          <StatCard
            title="湲以묒씤 결재"
            value={pendingCount.toString().padStart(2, '0')}
            description="현재 湲以묒씤 결재 요청?낅땲님
            icon={<Bell size={24} />}
            trend={pendingCount > 0 ? 10 : 0}
            color="purple"
          />

