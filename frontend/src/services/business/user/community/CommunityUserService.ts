import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { CommunityVO, CommunitySearchParams } from '@/types/business/community';
import type { components } from '@/types/generated-api';
import { requireCommunityPage, toCommunityListQuery } from '@/services/business/community/community-contract';
import {
    getCommunities_1Operation,
    getCommunity_1Operation,
    getCommunityBoardsOperation,
    getMyMembershipOperation,
    joinCommunityOperation,
    leaveCommunityOperation,
} from '@/types/generated-operations';

/**
 * 현재 사용자의 커뮤니티 멤버십. NONE=신청 가능, REQUESTED=승인 대기, MEMBER=회원,
 * WITHDRAWN=탈퇴(다시 신청 가능), UNKNOWN=어휘 밖 상태(신청 불가).
 */
export type CommunityMembership = {
    cmntySn: number;
    status: NonNullable<components['schemas']['CommunityMembershipDto']['status']>;
    joinYmd: string | null;
};

/** 커뮤니티에 귀속된 게시판 한 건 — 승인된 회원만 받는다(서버가 판정). */
export type CommunityBoard = {
    bbsId: string;
    bbsTtl: string | null;
    bbsExpln: string | null;
};

/**
 * 커뮤니티 사용자 서비스
 * path: /api/v1/communities
 */
class CommunityUserService extends UserService {
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
     * 커뮤니티 귀속 게시판 목록 (2026-09-08 PD-CMTY-001) — 회원 자격이 처음으로 여는 기능.
     *
     * <p>인가는 서버가 판정한다. 회원이 아니면 403 이며 화면은 그 사실을 안내로 바꾼다.
     * `bbsId` 가 없는 행은 링크를 만들 수 없으므로 계약 위반으로 본다.
     */
    async getCommunityBoards(cmntySn: number): Promise<CommunityBoard[]> {
        const response = await this.executeGenerated(getCommunityBoardsOperation, {
            path: { cmntySn },
        });
        if (!Array.isArray(response)) {
            throw new Error('커뮤니티 게시판 응답이 필수 계약과 일치하지 않습니다.');
        }
        return response.map((board) => {
            if (typeof board?.bbsId !== 'string' || board.bbsId.length === 0) {
                throw new Error('커뮤니티 게시판 응답에 게시판 ID 가 없습니다.');
            }
            return { bbsId: board.bbsId, bbsTtl: board.bbsTtl ?? null, bbsExpln: board.bbsExpln ?? null };
        });
    }

    /**
     * 커뮤니티 가입 신청
     */
    async joinCommunity(cmntySn: number): Promise<void> {
        return this.executeGenerated(joinCommunityOperation, {
            path: { cmntySn },
        });
    }

    /**
     * 커뮤니티 탈퇴 (2026-09-25) — 대상은 언제나 현재 사용자다(서버가 principal 로 고정한다).
     * 회원 전용 게시판 접근이 즉시 끊기고, 다시 가입하려면 새로 신청해 승인을 받아야 한다.
     */
    async leaveCommunity(cmntySn: number): Promise<void> {
        return this.executeGenerated(leaveCommunityOperation, {
            path: { cmntySn },
        });
    }

}

export const communityUserService = new CommunityUserService();
