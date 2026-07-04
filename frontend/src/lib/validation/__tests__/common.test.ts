import { describe, it, expect, vi } from 'vitest';
import { commonSchemas, handleFormError } from '../common';

describe('commonSchemas Validation', () => {
  describe('requiredString', () => {
    const schema = commonSchemas.requiredString('이름');
    it('should pass with valid string', () => {
      const result = schema.safeParse('홍길동');
      expect(result.success).toBe(true);
    });
    it('should fail with empty string', () => {
      const result = schema.safeParse('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('이름은(는) 필수 입력 항목입니다.');
      }
    });
  });

  describe('email', () => {
    const schema = commonSchemas.email;
    it('should pass with valid email', () => {
      expect(schema.safeParse('user@example.com').success).toBe(true);
    });
    it('should fail with invalid email', () => {
      expect(schema.safeParse('invalid-email').success).toBe(false);
    });
  });

  describe('userId', () => {
    const schema = commonSchemas.userId;
    it('should pass with valid id', () => {
      expect(schema.safeParse('user123').success).toBe(true);
    });
    it('should fail if too short', () => {
      expect(schema.safeParse('user').success).toBe(false);
    });
    it('should fail if too long', () => {
      expect(schema.safeParse('a'.repeat(21)).success).toBe(false);
    });
    it('should fail with special characters', () => {
      expect(schema.safeParse('user_123').success).toBe(false);
    });
  });

  describe('password', () => {
    const schema = commonSchemas.password;
    it('should pass with valid password', () => {
      expect(schema.safeParse('Pass123!').success).toBe(true);
    });
    it('should fail if no special char', () => {
      expect(schema.safeParse('Password123').success).toBe(false);
    });
  });

  describe('phone', () => {
    const schema = commonSchemas.phone;
    it('should pass with valid phone numbers', () => {
      expect(schema.safeParse('010-1234-5678').success).toBe(true);
      expect(schema.safeParse('01012345678').success).toBe(true);
    });
    it('should fail with invalid phone numbers', () => {
      expect(schema.safeParse('02-123-4567').success).toBe(false);
    });
  });

  describe('code', () => {
    const schema = commonSchemas.code;
    it('should pass with uppercase, digits and underscore', () => {
      expect(schema.safeParse('COMMON_CODE_01').success).toBe(true);
    });
    it('should fail with lowercase', () => {
      expect(schema.safeParse('common_code').success).toBe(false);
    });
  });

  describe('useAt', () => {
    const schema = commonSchemas.useAt;
    it('should pass with Y or N', () => {
      expect(schema.safeParse('Y').success).toBe(true);
      expect(schema.safeParse('N').success).toBe(true);
    });
    it('should fail with other values', () => {
      expect(schema.safeParse('Invalid').success).toBe(false);
    });
  });
});

describe('handleFormError Helper', () => {
  it('should call toast.error with first error message', () => {
    const mockToast = { error: vi.fn() };
    const errors = {
      email: { message: '이메일 형식이 올바르지 않습니다.' },
      password: { message: '비밀번호 규칙을 확인하세요.' }
    };
    
    handleFormError(errors, mockToast);
    expect(mockToast.error).toHaveBeenCalledWith('이메일 형식이 올바르지 않습니다.');
  });

  it('should call toast.error with default message if message is missing', () => {
    const mockToast = { error: vi.fn() };
    const errors = {
      something: {}
    };
    
    handleFormError(errors, mockToast);
    expect(mockToast.error).toHaveBeenCalledWith('입력 항목을 확인해주세요.');
  });
});
