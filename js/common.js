/* ==========================================
   공통 JavaScript (common.js)
   ========================================== */

/**
 * 계산기 플랫폼 공통 클래스
 */
class CalculatorPlatform {
    constructor() {
        this.init();
    }

    init() {
        this.setupAccessibility();
        this.setupAnalytics();
        this.setupErrorHandling();
        this.setupPerformanceOptimization();
    }

    /**
     * 접근성 설정
     */
    setupAccessibility() {
        // 키보드 네비게이션 지원
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });

        // 스킵 네비게이션
        const skipNav = document.querySelector('.skip-nav');
        if (skipNav) {
            skipNav.addEventListener('focus', () => {
                skipNav.style.left = '0';
            });
            skipNav.addEventListener('blur', () => {
                skipNav.style.left = '-9999px';
            });
        }
    }

    /**
     * 분석 도구 설정
     */
    setupAnalytics() {
        // Google Analytics 이벤트 추적
        this.trackEvent = (eventName, category, label, value) => {
            if (typeof gtag !== 'undefined') {
                gtag('event', eventName, {
                    'event_category': category,
                    'event_label': label,
                    'value': value
                });
            }
        };

        // 페이지 뷰 추적
        this.trackPageView = (title, location) => {
            if (typeof gtag !== 'undefined') {
                gtag('event', 'page_view', {
                    'page_title': title,
                    'page_location': location || window.location.href
                });
            }
        };
    }

    /**
     * 에러 핸들링 설정
     */
    setupErrorHandling() {
        window.addEventListener('error', (e) => {
            console.error('JavaScript Error:', e.error);
            this.trackEvent('javascript_error', 'error', e.error.message);
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled Promise Rejection:', e.reason);
            this.trackEvent('promise_rejection', 'error', e.reason);
        });
    }

    /**
     * 성능 최적화 설정
     */
    setupPerformanceOptimization() {
        // 스크롤 복원 방지 (SPA 최적화)
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }

        // 이미지 레이지 로딩 (필요시)
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }
}

/**
 * 공통 유틸리티 함수들
 */
class CalculatorUtils {
    /**
     * 날짜 유효성 검증
     */
    static validateDate(dateString) {
        if (!dateString) return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    /**
     * 두 날짜 사이의 차이 계산 (일 단위)
     */
    static getDaysDifference(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * 날짜 포맷팅 (한국어)
     */
    static formatDateKorean(date) {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}년 ${month}월 ${day}일`;
    }

    /**
     * 날짜 포맷팅 (ISO)
     */
    static formatDateISO(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }

    /**
     * 숫자 포맷팅 (천 단위 구분자)
     */
    static formatNumber(number, decimals = 0) {
        if (typeof number !== 'number') return '0';
        return number.toLocaleString('ko-KR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * 통화 포맷팅
     */
    static formatCurrency(amount) {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(amount);
    }

    /**
     * 디바운스 함수
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 쓰로틀 함수
     */
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 로컬 스토리지 안전 사용
     */
    static setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('localStorage not available:', e);
            return false;
        }
    }

    static getLocalStorage(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.warn('localStorage read error:', e);
            return null;
        }
    }

    /**
     * 세션 스토리지 안전 사용
     */
    static setSessionStorage(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('sessionStorage not available:', e);
            return false;
        }
    }

    static getSessionStorage(key) {
        try {
            const item = sessionStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.warn('sessionStorage read error:', e);
            return null;
        }
    }
}

/**
 * 공통 UI 컴포넌트 클래스
 */
class UIComponents {
    /**
     * 토스트 메시지 표시
     */
    static showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // 토스트 스타일
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateY(-20px)',
            transition: 'all 0.3s ease',
            maxWidth: '300px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        });

        // 타입별 색상
        const colors = {
            success: '#38a169',
            error: '#e53e3e',
            warning: '#d69e2e',
            info: '#3182ce'
        };
        toast.style.background = colors[type] || colors.info;

        document.body.appendChild(toast);

        // 애니메이션
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);

        // 자동 제거
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    /**
     * 로딩 스피너 표시/숨김
     */
    static showLoading(container) {
        const loading = document.createElement('div');
        loading.className = 'loading-spinner';
        loading.innerHTML = `
            <div class="spinner"></div>
            <p>계산 중...</p>
        `;
        
        Object.assign(loading.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#667eea',
            fontSize: '14px'
        });

        // 스피너 CSS
        const spinnerStyle = document.createElement('style');
        spinnerStyle.textContent = `
            .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #e2e8f0;
                border-top: 4px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(spinnerStyle);

        if (container) {
            container.style.position = 'relative';
            container.appendChild(loading);
        }

        return loading;
    }

    static hideLoading(container) {
        const loading = container?.querySelector('.loading-spinner');
        if (loading) {
            loading.remove();
        }
    }

    /**
     * 확인 다이얼로그
     */
    static confirm(message, onConfirm, onCancel) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const modal = document.createElement('div');
        modal.className = 'modal-confirm';
        modal.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        `;

        modal.innerHTML = `
            <p style="margin-bottom: 20px; color: #2d3748; font-size: 16px; line-height: 1.5;">${message}</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="btn-confirm" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">확인</button>
                <button class="btn-cancel" style="padding: 10px 20px; background: #a0aec0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">취소</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // 이벤트 핸들러
        modal.querySelector('.btn-confirm').onclick = () => {
            document.body.removeChild(overlay);
            if (onConfirm) onConfirm();
        };

        modal.querySelector('.btn-cancel').onclick = () => {
            document.body.removeChild(overlay);
            if (onCancel) onCancel();
        };

        overlay.onclick = (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                if (onCancel) onCancel();
            }
        };
    }
}

/**
 * 폼 검증 클래스
 */
class FormValidator {
    constructor(form) {
        this.form = form;
        this.rules = {};
        this.messages = {};
    }

    /**
     * 검증 규칙 추가
     */
    addRule(fieldName, rule, message) {
        this.rules[fieldName] = rule;
        this.messages[fieldName] = message;
        return this;
    }

    /**
     * 폼 검증 실행
     */
    validate() {
        const errors = {};
        
        for (const [fieldName, rule] of Object.entries(this.rules)) {
            const field = this.form.querySelector(`[name="${fieldName}"]`);
            if (!field) continue;

            const value = field.value.trim();
            const isValid = typeof rule === 'function' ? rule(value, field) : true;

            if (!isValid) {
                errors[fieldName] = this.messages[fieldName];
                this.showFieldError(field, this.messages[fieldName]);
            } else {
                this.clearFieldError(field);
            }
        }

        return Object.keys(errors).length === 0;
    }

    /**
     * 필드별 에러 표시
     */
    showFieldError(field, message) {
        field.classList.add('error');
        
        let errorElement = field.parentNode.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            errorElement.style.cssText = `
                color: #e53e3e;
                font-size: 12px;
                margin-top: 5px;
            `;
            field.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }

    /**
     * 필드별 에러 제거
     */
    clearFieldError(field) {
        field.classList.remove('error');
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    /**
     * 모든 에러 제거
     */
    clearAllErrors() {
        this.form.querySelectorAll('.error').forEach(field => {
            this.clearFieldError(field);
        });
    }
}

// 전역 인스턴스 생성
const calculatorPlatform = new CalculatorPlatform();

// 전역 함수로 노출
window.CalculatorUtils = CalculatorUtils;
window.UIComponents = UIComponents;
window.FormValidator = FormValidator;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 기본 접근성 개선
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
            const label = input.parentNode.querySelector('label');
            if (label) {
                input.setAttribute('aria-labelledby', label.id || 'label-' + Date.now());
            }
        }
    });

    // 결과 영역에 live region 설정
    document.querySelectorAll('.result-container').forEach(container => {
        if (!container.getAttribute('aria-live')) {
            container.setAttribute('aria-live', 'polite');
        }
    });
});