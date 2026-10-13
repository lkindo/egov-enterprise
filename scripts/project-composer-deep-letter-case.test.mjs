// 정밀 점검 계약(project-composer-deep.test.mjs)에서 가장 오래 걸리는 시험 가운데 하나(약 4분)를 따로 둔다 — node 는 한
// 파일의 시험을 차례로 돌리고 파일끼리는 함께 돌리므로, 나눈 만큼 운영 계약 전체 실행이 짧아진다. 준비물은 함께 쓴다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compositionDeepPlan, directoryIgnoresCase } from './project-composer-deep.mjs';
import { normalize } from './reusable-source-tree.mjs';
import { root, catalog, files, compose, codes, caseSensitiveDirectory } from './project-composer-deep.test-helpers.mjs';

/*
 * 생성기는 생성물 폴더에서 파일이 있는지 본다. 대소문자 구분은 폴더마다 다를 수 있고, 생성기가 만드는 폴더는 가장 가까운 기존 상위 폴더의
 * 구분을 물려받는다. 그래서 정밀 점검은 원본 체크아웃이 아니라 그 폴더에 묻는다. Git 목록의 이름이 디스크 이름과 대소문자만 다르면
 * 가리는 출력 폴더에서는 선택한 기능의 소스가 없는 것이 된다.
 */
test('letter case is judged in the folder the generator will write to, not in the checkout', t => {
  const mailService = 'business-app/src/main/java/nuri/business/service/mail/MailService.java';
  const listed = files.map(file => (normalize(file) === mailService ? mailService.toLowerCase() : file));
  const mail = compose({ domains: ['mail'] });
  for (const sensitive of [false, true]) {
    const output = sensitive ? caseSensitiveDirectory('composer-deep-case-') : mkdtempSync(join(tmpdir(), 'composer-deep-case-'));
    t.after(() => rmSync(output, { recursive: true, force: true, maxRetries: 5 }));
    writeFileSync(join(output, 'Probe.txt'), 'x');
    const outputIgnoresCase = existsSync(join(output, 'pROBE.TXT'));
    // 대소문자만 다른 두 이름이 함께 있으면 그 쌍으로는 묻지 않는다(가리는 폴더에서만 둘이 따로 있다).
    if (!outputIgnoresCase) for (const [name, text] of [['pROBE.TXT', 'y'], ['Zeta.txt', 'z']]) writeFileSync(join(output, name), text);
    const outputParent = join(output, 'build', 'reusable-base', 'source');
    assert.equal(directoryIgnoresCase(outputParent), outputIgnoresCase, 'the nearest existing folder answers for the folders the generator creates');
    const deep = compositionDeepPlan({ root, catalog, composition: mail, files: listed, outputParent });
    if (outputIgnoresCase && existsSync(join(root, mailService.toLowerCase()))) {
      assert.deepEqual(deep.blockers, [], 'a folder that ignores case finds the listed lower-case name');
    } else {
      assert.deepEqual(codes(deep), ['SOURCE_SURVIVAL'], 'a case-sensitive output folder holds only the listed name');
      assert.deepEqual(deep.blockers[0].files, [mailService]);
    }
  }
});
