// 시작 구성·직접 선택마다 생성물 거버넌스 투영을 실제로 해 보는 시험(구성마다 2~7분)을 파일 넷에 나눠 함께 돌린다. 이 파일은
// core 를 혼자 맡는다(core 는 core 전용 변이 시험이 더해져 구성 가운데 가장 길다). 준비물과 시험 본문은 reusable-governance-projection.test-helpers.mjs 에 있다.
import { registerProfileProjectionTests } from './reusable-governance-projection.test-helpers.mjs';

registerProfileProjectionTests(1);
