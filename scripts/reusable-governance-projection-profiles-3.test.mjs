// 시작 구성·직접 선택마다 생성물 거버넌스 투영을 실제로 해 보는 시험(구성마다 2~7분)을 파일 넷에 나눠 함께 돌린다. 이 파일은
// 구성 목록(compositionProfiles)에서 차례를 4로 나눈 나머지가 2인 구성을 맡는다. 준비물과 시험 본문은 reusable-governance-projection.test-helpers.mjs 에 있다.
import { registerProfileProjectionTests } from './reusable-governance-projection.test-helpers.mjs';

registerProfileProjectionTests(3);
