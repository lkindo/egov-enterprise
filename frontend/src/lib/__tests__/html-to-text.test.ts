import { describe, expect, it } from 'vitest';
import { htmlToSemanticPlainText } from '../html-to-text';

describe('rich text extraction uses a parser without executing markup', () => {
  it('preserves readable boundaries and decoded text', () => {
    expect(htmlToSemanticPlainText('<p>A&nbsp;&amp; B</p><div>C<br>D</div>')).toBe('A & B\nC\nD');
  });

  it('drops non-readable content and event handlers from malformed markup', () => {
    expect(htmlToSemanticPlainText('<script>privateScript()</script><style>secretStyle</style><template>hidden</template><p>visible<img src=x onerror=alert(1)></p>')).toBe('visible');
    expect(htmlToSemanticPlainText('<p>&nbsp;</p>')).toBe('');
  });
});
