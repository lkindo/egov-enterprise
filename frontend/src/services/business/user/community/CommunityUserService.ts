import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { CommunityVO, CommunitySearchParams } from '@/types/business/community';
import type { components, operations } from '@/types/generated-api';
import {
    getCommunities_1Operation,
    getCommunity_1Operation,
    getMyMembershipOperation,
    joinCommunityOperation,
} from '@/types/generated-operations';

/** 현재 사용자의 커뮤니티 멤버십. NONE=신청 가능, REQUESTED=승인 대기, MEMBER=회원, UNKNOWN=어휘 밖 상태(신청 불가). */
export type CommunityMembership = {
    cmntySn: number;
    status: NonNullable<components['schemas']['CommunityMembershipDto']['status']>;
    joinYmd: string | null;
};

type CommunityListQuery = NonNullable<operations['getCommunities_1']['parameters']['query']>;

function toCommunityListQuery(params: CommunitySearchParams): CommunityListQuery {
    const raw = params as Record<string, unknown>;
    const page = params.page
        ?? (params.pageIndex === undefined ? undefined : Math.max(0, params.pageIndex - 1))
        ?? (params.pageNo === undefined ? undefined : Math.max(0, params.pageNo - 1));
    const size = typeof params.size === 'number'
        ? params.size
        : typeof params.pageUnit === 'number'
            ? params.pageUnit
            : typeof raw.pageSize === 'number'
                ? raw.pageSize
                : undefined;
    const searchCnd = typeof raw.searchCnd === 'string' ? raw.searchCnd : params.searchCondition;
    const searchWrd = typeof raw.searchWrd === 'string' ? raw.searchWrd : params.searchKeyword;
    const sort = Array.isArray(raw.sort) && raw.sort.every((item) => typeof item === 'string')
        ? raw.sort as string[]
        : undefined;

    return {
        ...(page === undefined ? {} : { page }),
        ...(size === undefined ? {} : { size }),
        ...(searchCnd === undefined ? {} : { searchCnd }),
        ...(searchWrd === undefined ? {} : { searchWrd }),
        ...(sort === undefined ? {} : { sort }),
    };
}

function requireCommunityPage(
    response: components['schemas']['PageResponseCommunityDto'],
): PageResponse<CommunityVO> {
    if (
        !Array.isArray(response.list)
        || typeof response.total !== 'number'
        || typeof response.page !== 'number'
        || typeof response.size !== 'number'
        || typeof response.totalPage !== 'number'
    ) {
        throw new Error('커뮤니티 페이지 응답이 필수 계약과 일치하지 않습니다.');
    }
    return response as unknown as PageResponse<CommunityVO>;
}

/**
 * 커뮤니티 사용자 서비스
 * path: /api/v1/communities
 */
class CommunityUserService extends UserService {
    constructor() {
        super('communities');
    }

    /**
     * 커뮤니티 목록 조회
     */
    async getCommunityList(params: CommunitySearchParams): Promise<PageResponse<CommunityVO>> {
        const response = await this.executeGenerated(getCommunities_1Operation, {
            query: toCommunityListQuery(params),
        });
        return requireCommunityPage(response);
    }

    /**
     * 커뮤니티 상세 조회
     */
    async getCommunity(cmntySn: number): Promise<CommunityVO> {
        return this.executeGenerated(getCommunity_1Operation, {
            path: { cmntySn },
        }) as Promise<CommunityVO>;
    }

    /**
     * 내 멤버십 상태 (2026-09-06 DEC-OPS-043) — 상세 화면이 가입 버튼의 상태를 정하는 근거.
     */
    async getMyMembership(cmntySn: number): Promise<CommunityMembership> {
        const response = await this.executeGenerated(getMyMembershipOperation, {
            path: { cmntySn },
        });
        if (typeof response.cmntySn !== 'number' || typeof response.status !== 'string') {
            throw new Error('커뮤니티 멤버십 응답이 필수 계약과 일치하지 않습니다.');
        }
        return { cmntySn: response.cmntySn, status: response.status, joinYmd: response.joinYmd ?? null };
    }

    /**
     * 커뮤니티 가입 신청
     */
    async joinCommunity(cmntySn: number): Promise<void> {
        return this.executeGenerated(joinCommunityOperation, {
            path: { cmntySn },
        });
    }

}

export const communityUserService = new CommunityUserService();
