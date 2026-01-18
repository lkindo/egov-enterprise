/**
 * eGovFrame Common Validation JavaScript Library
 * Spring Modules Validation을 대체하는 클라이언트사이드 검증 라이브러리
 */

const EgovValidation = {
    
    // 에러 메시지 설정
    messages: {
        required: '{0}은(는) 필수입력 항목입니다.',
        maxlength: '{0}은(는) {1}자를 초과할 수 없습니다.',
        minlength: '{0}은(는) {1}자 이상이어야 합니다.',
        integer: '{0}은(는) 숫자여야 합니다.',
        email: '{0}은(는) 올바른 이메일 형식이 아닙니다.',
        password1: '패스워드는 8~20자 이내여야 합니다.',
        password2: '패스워드에 특수문자를 사용할 수 없습니다.',
        password3: '연속된 문자나 순차적인 문자 4개 이상 사용할 수 없습니다.',
        password4: '반복문자나 숫자 연속 4개 이상 사용할 수 없습니다.',
        pwdCheckComb3: '영문자, 숫자, 특수문자의 최소 3가지 조합이어야 합니다.',
        pwdCheckComb4: '영대문자, 영소문자, 숫자, 특수문자의 최소 4가지 조합이어야 합니다.',
        pwdCheckSeries: '연속된 3개 이상의 문자나 숫자를 사용할 수 없습니다.',
        pwdCheckRepeat: '반복된 3개 이상의 문자나 숫자를 사용할 수 없습니다.',
        english: '{0}은(는) 영문자만 입력 가능합니다.'
    },
    
    // 기본 validation 규칙들
    rules: {
        // 필수입력 검사
        required: function(value) {
            return value !== null && value !== undefined && 
                   (typeof value === 'string' ? value.trim().length > 0 : true);
        },
        
        // 최대 길이 검사
        maxlength: function(value, max) {
            if (!value) return true;
            return value.length <= parseInt(max);
        },
        
        // 최소 길이 검사
        minlength: function(value, min) {
            if (!value) return true;
            return value.length >= parseInt(min);
        },
        
        // 숫자 검사
        integer: function(value) {
            if (!value) return true;
            return /^\d+$/.test(value);
        },
        
        // 이메일 검사
        email: function(value) {
            if (!value) return true;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value);
        },
        
        // 영문자만 허용
        english: function(value) {
            if (!value) return true;
            return /^[a-zA-Z]+$/.test(value);
        },
        
        // 패스워드 길이 검사 (8~20자)
        password1: function(value) {
            if (!value) return true;
            return value.length >= 8 && value.length <= 20;
        },
        
        // 패스워드 특수문자 제한
        password2: function(value) {
            if (!value) return true;
            // 특수문자 체크 (ASCII 33-47, 58-64, 91-96, 123-126)
            for (let i = 0; i < value.length; i++) {
                const ch = value.charCodeAt(i);
                if ((ch >= 33 && ch <= 47) || (ch >= 58 && ch <= 64) || 
                    (ch >= 91 && ch <= 96) || (ch >= 123 && ch <= 126)) {
                    return false;
                }
            }
            return true;
        },
        
        // 연속된 문자/순차적 문자 4개 이상 금지
        password3: function(value) {
            if (!value) return true;
            let cnt = 0, cnt2 = 1, cnt3 = 1;
            let temp = "";
            
            for (let i = 0; i < value.length; i++) {
                const ch = value.charAt(i);
                if (i > 0) {
                    const prevCh = value.charAt(i-1);
                    if (ch.charCodeAt(0) - prevCh.charCodeAt(0) === 1) {
                        cnt2++;
                        if (cnt2 >= 4) return false;
                    } else {
                        cnt2 = 1;
                    }
                    
                    if (ch.charCodeAt(0) - prevCh.charCodeAt(0) === -1) {
                        cnt3++;
                        if (cnt3 >= 4) return false;
                    } else {
                        cnt3 = 1;
                    }
                }
            }
            return true;
        },
        
        // 반복문자/숫자 연속 4개 이상 금지
        password4: function(value) {
            if (!value) return true;
            for (let i = 0; i < value.length - 3; i++) {
                if (value.charAt(i) === value.charAt(i+1) && 
                    value.charAt(i) === value.charAt(i+2) && 
                    value.charAt(i) === value.charAt(i+3)) {
                    return false;
                }
            }
            return true;
        },
        
        // 3가지 조합 (영문자, 숫자, 특수문자)
        pwdCheckComb3: function(value) {
            if (!value) return true;
            let hasAlpha = /[a-zA-Z]/.test(value);
            let hasNum = /\d/.test(value);
            let hasSpecial = /[~!@#$%^&*?]/.test(value);
            
            let count = 0;
            if (hasAlpha) count++;
            if (hasNum) count++;
            if (hasSpecial) count++;
            
            return count >= 3;
        },
        
        // 4가지 조합 (영대문자, 영소문자, 숫자, 특수문자)
        pwdCheckComb4: function(value) {
            if (!value) return true;
            let hasUpper = /[A-Z]/.test(value);
            let hasLower = /[a-z]/.test(value);
            let hasNum = /\d/.test(value);
            let hasSpecial = /[~!@#$%^&*?]/.test(value);
            
            let count = 0;
            if (hasUpper) count++;
            if (hasLower) count++;
            if (hasNum) count++;
            if (hasSpecial) count++;
            
            return count >= 4;
        },
        
        // 연속된 3개 이상의 문자나 숫자 금지
        pwdCheckSeries: function(value) {
            if (!value) return true;
            for (let i = 0; i < value.length - 2; i++) {
                const ch1 = value.charCodeAt(i);
                const ch2 = value.charCodeAt(i+1);
                const ch3 = value.charCodeAt(i+2);
                
                if ((ch2 - ch1 === 1 && ch3 - ch2 === 1) || 
                    (ch1 - ch2 === 1 && ch2 - ch3 === 1)) {
                    return false;
                }
            }
            return true;
        },
        
        // 반복된 3개 이상의 문자나 숫자 금지
        pwdCheckRepeat: function(value) {
            if (!value) return true;
            for (let i = 0; i < value.length - 2; i++) {
                if (value.charAt(i) === value.charAt(i+1) && 
                    value.charAt(i) === value.charAt(i+2)) {
                    return false;
                }
            }
            return true;
        }
    },
    
    // 폼 검증 함수
    validateForm: function(formElement, validationRules) {
        const errors = [];
        let firstErrorField = null;
        
        for (const fieldName in validationRules) {
            const field = formElement.elements[fieldName];
            if (!field) continue;
            
            const fieldRules = validationRules[fieldName];
            const fieldValue = this.getFieldValue(field);
            const fieldLabel = fieldRules.label || fieldName;
            
            // 각 규칙별로 검증
            for (const ruleName in fieldRules.rules) {
                if (ruleName === 'label') continue;
                
                const ruleValue = fieldRules.rules[ruleName];
                const ruleFunction = this.rules[ruleName];
                
                if (ruleFunction) {
                    let isValid = false;
                    
                    if (ruleValue === true) {
                        // 매개변수가 없는 규칙
                        isValid = ruleFunction(fieldValue);
                    } else {
                        // 매개변수가 있는 규칙
                        isValid = ruleFunction(fieldValue, ruleValue);
                    }
                    
                    if (!isValid) {
                        const errorMsg = this.formatMessage(this.messages[ruleName], fieldLabel, ruleValue);
                        errors.push(errorMsg);
                        
                        if (!firstErrorField) {
                            firstErrorField = field;
                        }
                        break; // 첫 번째 에러만 표시
                    }
                }
            }
        }
        
        if (errors.length > 0) {
            alert(errors.join('\n'));
            if (firstErrorField) {
                firstErrorField.focus();
            }
            return false;
        }
        
        return true;
    },
    
    // 필드 값 가져오기
    getFieldValue: function(field) {
        if (!field) return '';
        
        if (field.type === 'checkbox' || field.type === 'radio') {
            if (field.length) {
                // 배열인 경우
                for (let i = 0; i < field.length; i++) {
                    if (field[i].checked) {
                        return field[i].value;
                    }
                }
                return '';
            } else {
                return field.checked ? field.value : '';
            }
        } else if (field.type === 'select-one') {
            return field.selectedIndex >= 0 ? field.options[field.selectedIndex].value : '';
        } else if (field.type === 'select-multiple') {
            const values = [];
            for (let i = 0; i < field.options.length; i++) {
                if (field.options[i].selected) {
                    values.push(field.options[i].value);
                }
            }
            return values.join(',');
        } else {
            return field.value || '';
        }
    },
    
    // 메시지 포맷팅
    formatMessage: function(template, ...args) {
        return template.replace(/{(\d+)}/g, function(match, index) {
            return args[index] !== undefined ? args[index] : match;
        });
    },
    
    // 문자열 trim 유틸리티
    trim: function(str) {
        return str ? str.replace(/^\s+|\s+$/g, '') : '';
    }
};

// 전역 함수로 노출 (기존 코드 호환성을 위해)
window.EgovValidation = EgovValidation;

// 기존 Spring Modules validation 함수들을 대체하는 래퍼 함수들
function validateArticleVO(form) {
    const rules = {
        nttSj: {
            label: '제목',
            rules: {
                required: true,
                maxlength: 1200
            }
        },
        nttCn: {
            label: '내용',
            rules: {
                required: true
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

function validateBoardMasterVO(form) {
    const rules = {
        bbsNm: {
            label: '게시판명',
            rules: {
                required: true,
                maxlength: 120
            }
        },
        bbsIntrcn: {
            label: '게시판소개',
            rules: {
                required: true,
                maxlength: 2000
            }
        },
        bbsTyCode: {
            label: '게시판유형',
            rules: {
                required: true
            }
        },
        replyPosblAt: {
            label: '답글가능여부',
            rules: {
                required: true
            }
        },
        fileAtchPosblAt: {
            label: '파일첨부가능여부',
            rules: {
                required: true
            }
        },
        useAt: {
            label: '사용여부',
            rules: {
                required: true
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

function validateFormComment(form) {
    const rules = {
        comment: {
            label: '댓글',
            rules: {
                required: true,
                maxlength: 500
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

// RSS 관리 validation
function validateRssManage(form) {
    const rules = {
        trgetSvcNm: {
            label: '대상서비스명',
            rules: {
                required: true,
                maxlength: 255
            }
        },
        trgetSvcTable: {
            label: '대상서비스TABLE',
            rules: {
                required: true,
                maxlength: 255,
                english: true
            }
        },
        trgetSvcListCo: {
            label: '대상서비스목록개수',
            rules: {
                required: true,
                maxlength: 5,
                integer: true
            }
        },
        hderTitle: {
            label: '헤더TITLE',
            rules: {
                required: true,
                maxlength: 255
            }
        },
        hderLink: {
            label: '헤더LINK',
            rules: {
                required: true,
                maxlength: 255
            }
        },
        hderDescription: {
            label: '헤더DESCRIPTION',
            rules: {
                required: true,
                maxlength: 4000
            }
        },
        bdtTitle: {
            label: '본문TITLE',
            rules: {
                required: true,
                maxlength: 255
            }
        },
        bdtLink: {
            label: '본문LINK',
            rules: {
                required: true,
                maxlength: 255
            }
        },
        bdtDescription: {
            label: '본문DESCRIPTION',
            rules: {
                required: true,
                maxlength: 4000
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

// 배너 validation
function validateBanner(form) {
    const rules = {
        bannerNm: {
            label: '배너명',
            rules: {
                required: true,
                maxlength: 30
            }
        },
        linkUrl: {
            label: '링크URL',
            rules: {
                required: true
            }
        },
        sortOrdr: {
            label: '정렬순서',
            rules: {
                required: true,
                maxlength: 100,
                integer: true
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

// 주소록 validation
function validateAdbk(form) {
    const rules = {
        adbkNm: {
            label: '주소록명',
            rules: {
                required: true,
                maxlength: 50
            }
        },
        othbcScope: {
            label: '공개범위',
            rules: {
                required: true
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

// 템플릿 정보 validation
function validateTemplateInf(form) {
    const rules = {
        tmplatNm: {
            label: '템플릿명',
            rules: {
                required: true,
                maxlength: 50
            }
        },
        tmplatCours: {
            label: '템플릿경로',
            rules: {
                required: true,
                maxlength: 200
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

// 만족도조사 validation
function validateSatisfaction(form) {
    const rules = {
        qestnrTmplatId: {
            label: '설문템플릿',
            rules: {
                required: true
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

// 커뮤니티 마스터 validation
function validateCommuMasterVO(form) {
    const rules = {
        cmmntyNm: {
            label: '커뮤니티명',
            rules: {
                required: true,
                maxlength: 100
            }
        },
        cmmntyIntrcn: {
            label: '커뮤니티소개',
            rules: {
                required: true,
                maxlength: 2000
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

// 일정관리 validation
function validateIndvdlSchdulManageVO(form) {
    const rules = {
        schdulNm: {
            label: '일정명',
            rules: {
                required: true,
                maxlength: 100
            }
        },
        schdulCn: {
            label: '일정내용',
            rules: {
                required: true,
                maxlength: 2000
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

// SMS 정보 validation
function validateSms(form) {
    const rules = {
        trnsmitTelno: {
            label: '발신전화번호',
            rules: {
                required: true,
                maxlength: 20
            }
        },
        recptnTelno: {
            label: '수신전화번호',
            rules: {
                required: true,
                maxlength: 20
            }
        },
        trnsmitCn: {
            label: '전송내용',
            rules: {
                required: true,
                maxlength: 2000
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

// 이메일 전송 validation
function validateSndngMailVO(form) {
    const rules = {
        dsptchPerson: {
            label: '발신자',
            rules: {
                required: true,
                maxlength: 100
            }
        },
        recptnPerson: {
            label: '수신자',
            rules: {
                required: true,
                maxlength: 500
            }
        },
        sj: {
            label: '제목',
            rules: {
                required: true,
                maxlength: 200
            }
        },
        emailCn: {
            label: '내용',
            rules: {
                required: true
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

// 명함 관리 validation
function validateNameCard(form) {
    const rules = {
        ncrdNm: {
            label: '명함명',
            rules: {
                required: true,
                maxlength: 50
            }
        },
        cmpnyNm: {
            label: '회사명',
            rules: {
                required: true,
                maxlength: 100
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

// 시스템 모니터링 validation
function validateFileSysMntrngVO(form) {
    const rules = {
        logicNm: {
            label: '논리명',
            rules: {
                required: true,
                maxlength: 50
            }
        },
        sysNm: {
            label: '시스템명',
            rules: {
                required: true,
                maxlength: 50
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

// 네트워크 서비스 모니터링 validation
function validateNtwrkSvcMntrngVO(form) {
    const rules = {
        logicNm: {
            label: '논리명',
            rules: {
                required: true,
                maxlength: 50
            }
        },
        sysNm: {
            label: '시스템명',
            rules: {
                required: true,
                maxlength: 50
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

// 로그인 정책 validation
function validateLoginPolicy(form) {
    const rules = {
        lmttAt: {
            label: '제한여부',
            rules: {
                required: true
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

// 게시판 사용정보 validation
function validateBoardUseInf(form) {
    const rules = {
        bbsNm: {
            label: '게시판명',
            rules: {
                required: true,
                maxlength: 50
            }
        },
        trgetId: {
            label: '대상ID',
            rules: {
                required: true
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
}

// 댓글 validation
function validateArticleCommentVO(form) {
    const rules = {
        comment: {
            label: '댓글',
            rules: {
                required: true,
                maxlength: 1000
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
} 

// FAQ validation
function validateFaqVO(form) {
    const rules = {
        qestnSj: {
            label: '질문제목',
            rules: {
                required: true,
                maxlength: 70
            }
        },
        qestnCn: {
            label: '질문내용',
            rules: {
                required: true
            }
        },
        answerCn: {
            label: '답변내용',
            rules: {
                required: true
            }
        }
    };
    return EgovValidation.validateForm(form, rules);
} 