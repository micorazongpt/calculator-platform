/* ==========================================
   재사용 가능한 UI 컴포넌트 라이브러리 (ui-components.js)
   ========================================== */

/**
 * 기본 컴포넌트 베이스 클래스
 */
class BaseComponent {
    constructor(element, options = {}) {
        this.element = element;
        this.options = { ...this.getDefaultOptions(), ...options };
        this.isDestroyed = false;
        
        this.init();
    }

    getDefaultOptions() {
        return {};
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // 하위 클래스에서 구현
    }

    destroy() {
        if (this.isDestroyed) return;
        
        this.unbindEvents();
        this.isDestroyed = true;
    }

    unbindEvents() {
        // 하위 클래스에서 구현
    }
}

/**
 * 날짜 입력 컴포넌트
 */
class DateInput extends BaseComponent {
    getDefaultOptions() {
        return {
            required: false,
            min: null,
            max: null,
            format: 'YYYY-MM-DD',
            placeholder: '날짜를 선택하세요',
            validateOnChange: true,
            errorMessage: '올바른 날짜를 입력해주세요'
        };
    }

    init() {
        super.init();
        this.setupInput();
        this.setupValidation();
    }

    setupInput() {
        if (!this.element.type) {
            this.element.type = 'date';
        }
        
        if (this.options.required) {
            this.element.required = true;
        }
        
        if (this.options.min) {
            this.element.min = this.options.min;
        }
        
        if (this.options.max) {
            this.element.max = this.options.max;
        }
        
        if (this.options.placeholder) {
            this.element.placeholder = this.options.placeholder;
        }
    }

    setupValidation() {
        this.errorElement = this.createErrorElement();
    }

    createErrorElement() {
        const error = document.createElement('div');
        error.className = 'field-error';
        error.style.cssText = `
            color: #e53e3e;
            font-size: 12px;
            margin-top: 5px;
            display: none;
        `;
        this.element.parentNode.insertBefore(error, this.element.nextSibling);
        return error;
    }

    bindEvents() {
        this.handleChange = this.handleChange.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        
        this.element.addEventListener('change', this.handleChange);
        this.element.addEventListener('blur', this.handleBlur);
    }

    unbindEvents() {
        this.element.removeEventListener('change', this.handleChange);
        this.element.removeEventListener('blur', this.handleBlur);
    }

    handleChange() {
        if (this.options.validateOnChange) {
            this.validate();
        }
        this.triggerCustomEvent('datechange', { value: this.getValue() });
    }

    handleBlur() {
        this.validate();
    }

    validate() {
        const value = this.getValue();
        const isValid = this.isValid(value);
        
        this.toggleError(!isValid);
        this.triggerCustomEvent('validated', { isValid, value });
        
        return isValid;
    }

    isValid(value) {
        if (!value && this.options.required) {
            return false;
        }
        
        if (value) {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                return false;
            }
            
            if (this.options.min && date < new Date(this.options.min)) {
                return false;
            }
            
            if (this.options.max && date > new Date(this.options.max)) {
                return false;
            }
        }
        
        return true;
    }

    toggleError(show) {
        if (show) {
            this.element.classList.add('error');
            this.errorElement.textContent = this.options.errorMessage;
            this.errorElement.style.display = 'block';
        } else {
            this.element.classList.remove('error');
            this.errorElement.style.display = 'none';
        }
    }

    getValue() {
        return this.element.value;
    }

    setValue(value) {
        this.element.value = value;
        this.validate();
    }

    triggerCustomEvent(eventName, detail) {
        this.element.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
}

/**
 * 계산 버튼 컴포넌트
 */
class CalculateButton extends BaseComponent {
    getDefaultOptions() {
        return {
            loadingText: '계산 중...',
            successText: '계산 완료!',
            errorText: '다시 시도',
            resetDelay: 2000,
            variant: 'primary' // primary, secondary, danger
        };
    }

    init() {
        super.init();
        this.originalText = this.element.textContent;
        this.setupButton();
    }

    setupButton() {
        this.element.classList.add('calc-btn', this.options.variant);
        this.element.type = 'button';
    }

    bindEvents() {
        this.handleClick = this.handleClick.bind(this);
        this.element.addEventListener('click', this.handleClick);
    }

    unbindEvents() {
        this.element.removeEventListener('click', this.handleClick);
    }

    handleClick(event) {
        if (this.isLoading || this.element.disabled) {
            event.preventDefault();
            return;
        }
        
        this.triggerCustomEvent('calculate', { button: this.element });
    }

    setLoading(isLoading = true) {
        this.isLoading = isLoading;
        
        if (isLoading) {
            this.element.disabled = true;
            this.element.textContent = this.options.loadingText;
            this.element.classList.add('loading');
        } else {
            this.element.disabled = false;
            this.element.textContent = this.originalText;
            this.element.classList.remove('loading');
        }
    }

    setSuccess() {
        this.element.textContent = this.options.successText;
        this.element.classList.add('success');
        
        setTimeout(() => {
            if (!this.isDestroyed) {
                this.reset();
            }
        }, this.options.resetDelay);
    }

    setError() {
        this.element.textContent = this.options.errorText;
        this.element.classList.add('error');
        
        setTimeout(() => {
            if (!this.isDestroyed) {
                this.reset();
            }
        }, this.options.resetDelay);
    }

    reset() {
        this.element.textContent = this.originalText;
        this.element.classList.remove('loading', 'success', 'error');
        this.element.disabled = false;
        this.isLoading = false;
    }

    triggerCustomEvent(eventName, detail) {
        this.element.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
}

/**
 * 결과 카드 컴포넌트
 */
class ResultCard extends BaseComponent {
    getDefaultOptions() {
        return {
            title: '',
            value: '',
            subValue: '',
            variant: 'default', // default, success, warning, danger
            animationDelay: 0,
            formatValue: true
        };
    }

    init() {
        super.init();
        this.createCard();
    }

    createCard() {
        this.element.className = `result-card ${this.options.variant}`;
        
        this.titleElement = document.createElement('h3');
        this.titleElement.textContent = this.options.title;
        
        this.valueElement = document.createElement('div');
        this.valueElement.className = 'value';
        
        this.subValueElement = document.createElement('div');
        this.subValueElement.className = 'sub-value';
        
        this.element.appendChild(this.titleElement);
        this.element.appendChild(this.valueElement);
        this.element.appendChild(this.subValueElement);
        
        // 초기값 설정
        this.updateValue(this.options.value, this.options.subValue);
        
        // 애니메이션
        if (this.options.animationDelay > 0) {
            this.element.style.opacity = '0';
            this.element.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                this.element.style.transition = 'all 0.6s ease';
                this.element.style.opacity = '1';
                this.element.style.transform = 'translateY(0)';
            }, this.options.animationDelay);
        }
    }

    updateValue(value, subValue = '') {
        const formattedValue = this.options.formatValue ? this.formatValue(value) : value;
        
        this.valueElement.textContent = formattedValue;
        this.subValueElement.textContent = subValue;
        
        // 접근성
        this.element.setAttribute('aria-label', 
            `${this.options.title}: ${formattedValue} ${subValue}`.trim());
    }

    updateTitle(title) {
        this.options.title = title;
        this.titleElement.textContent = title;
    }

    setVariant(variant) {
        this.element.classList.remove(this.options.variant);
        this.options.variant = variant;
        this.element.classList.add(variant);
    }

    formatValue(value) {
        if (typeof value === 'number') {
            return CalculatorUtils.formatNumber(value, 2);
        }
        return value;
    }

    animate(animationType = 'pulse') {
        this.element.classList.add(`animate-${animationType}`);
        
        setTimeout(() => {
            this.element.classList.remove(`animate-${animationType}`);
        }, 1000);
    }
}

/**
 * 진행률 바 컴포넌트
 */
class ProgressBar extends BaseComponent {
    getDefaultOptions() {
        return {
            min: 0,
            max: 100,
            value: 0,
            showLabel: true,
            labelFormat: '{value}%',
            variant: 'normal', // normal, warning, danger
            animated: true
        };
    }

    init() {
        super.init();
        this.createProgressBar();
    }

    createProgressBar() {
        this.element.className = 'usage-progress';
        
        this.progressBar = document.createElement('div');
        this.progressBar.className = `usage-progress-bar ${this.options.variant}`;
        
        if (this.options.showLabel) {
            this.label = document.createElement('div');
            this.label.className = 'progress-label';
            this.label.style.cssText = `
                text-align: center;
                font-size: 12px;
                margin-top: 5px;
                color: #4a5568;
            `;
            this.element.appendChild(this.label);
        }
        
        this.element.appendChild(this.progressBar);
        this.updateProgress(this.options.value);
    }

    updateProgress(value, animated = true) {
        const clampedValue = Math.max(this.options.min, Math.min(this.options.max, value));
        const percentage = ((clampedValue - this.options.min) / (this.options.max - this.options.min)) * 100;
        
        if (animated && this.options.animated) {
            this.progressBar.style.transition = 'width 0.6s ease';
        } else {
            this.progressBar.style.transition = 'none';
        }
        
        this.progressBar.style.width = `${percentage}%`;
        
        if (this.label) {
            const labelText = this.options.labelFormat
                .replace('{value}', clampedValue)
                .replace('{percentage}', Math.round(percentage));
            this.label.textContent = labelText;
        }
        
        // 접근성
        this.element.setAttribute('aria-valuenow', clampedValue);
        this.element.setAttribute('aria-valuemin', this.options.min);
        this.element.setAttribute('aria-valuemax', this.options.max);
        
        // 변형 자동 변경
        this.autoUpdateVariant(percentage);
    }

    autoUpdateVariant(percentage) {
        let newVariant = 'normal';
        
        if (percentage >= 100) {
            newVariant = 'danger';
        } else if (percentage >= 80) {
            newVariant = 'warning';
        }
        
        if (newVariant !== this.options.variant) {
            this.setVariant(newVariant);
        }
    }

    setVariant(variant) {
        this.progressBar.classList.remove(`usage-progress-bar`, this.options.variant);
        this.options.variant = variant;
        this.progressBar.classList.add(`usage-progress-bar`, variant);
    }
}

/**
 * 툴팁 컴포넌트
 */
class Tooltip extends BaseComponent {
    getDefaultOptions() {
        return {
            content: '',
            position: 'top', // top, bottom, left, right
            trigger: 'hover', // hover, click, manual
            delay: 0,
            duration: 0, // 0 = 무제한
            className: ''
        };
    }

    init() {
        super.init();
        this.createTooltip();
        this.isVisible = false;
    }

    createTooltip() {
        this.element.classList.add('tooltip');
        
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = `tooltip-content ${this.options.className}`;
        this.tooltipElement.style.cssText = `
            position: absolute;
            background: #2d3748;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            pointer-events: none;
        `;
        
        this.tooltipElement.textContent = this.options.content;
        document.body.appendChild(this.tooltipElement);
        
        this.positionTooltip();
    }

    bindEvents() {
        if (this.options.trigger === 'hover') {
            this.element.addEventListener('mouseenter', () => this.show());
            this.element.addEventListener('mouseleave', () => this.hide());
        } else if (this.options.trigger === 'click') {
            this.element.addEventListener('click', () => this.toggle());
        }
    }

    show() {
        if (this.isVisible) return;
        
        clearTimeout(this.hideTimeout);
        
        const showTooltip = () => {
            this.positionTooltip();
            this.tooltipElement.style.opacity = '1';
            this.tooltipElement.style.visibility = 'visible';
            this.isVisible = true;
            
            if (this.options.duration > 0) {
                this.hideTimeout = setTimeout(() => this.hide(), this.options.duration);
            }
        };
        
        if (this.options.delay > 0) {
            this.showTimeout = setTimeout(showTooltip, this.options.delay);
        } else {
            showTooltip();
        }
    }

    hide() {
        if (!this.isVisible) return;
        
        clearTimeout(this.showTimeout);
        clearTimeout(this.hideTimeout);
        
        this.tooltipElement.style.opacity = '0';
        this.tooltipElement.style.visibility = 'hidden';
        this.isVisible = false;
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    positionTooltip() {
        const rect = this.element.getBoundingClientRect();
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        
        let top, left;
        
        switch (this.options.position) {
            case 'top':
                top = rect.top - tooltipRect.height - 8;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = rect.bottom + 8;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - 8;
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + 8;
                break;
        }
        
        this.tooltipElement.style.top = `${top + window.scrollY}px`;
        this.tooltipElement.style.left = `${left + window.scrollX}px`;
    }

    updateContent(content) {
        this.options.content = content;
        this.tooltipElement.textContent = content;
    }

    destroy() {
        super.destroy();
        if (this.tooltipElement && this.tooltipElement.parentNode) {
            this.tooltipElement.parentNode.removeChild(this.tooltipElement);
        }
    }
}

/**
 * 알림 배너 컴포넌트
 */
class NotificationBanner extends BaseComponent {
    getDefaultOptions() {
        return {
            type: 'info', // info, success, warning, error
            message: '',
            dismissible: true,
            autoHide: true,
            duration: 5000,
            position: 'top' // top, bottom
        };
    }

    init() {
        super.init();
        this.createBanner();
        this.show();
    }

    createBanner() {
        this.element.className = `notification-banner notification-${this.options.type}`;
        this.element.style.cssText = `
            position: fixed;
            left: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transform: translateY(-100%);
            transition: transform 0.3s ease;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        `;
        
        // 위치 설정
        if (this.options.position === 'top') {
            this.element.style.top = '20px';
        } else {
            this.element.style.bottom = '20px';
            this.element.style.transform = 'translateY(100%)';
        }
        
        // 타입별 색상
        const colors = {
            success: '#38a169',
            error: '#e53e3e',
            warning: '#d69e2e',
            info: '#3182ce'
        };
        this.element.style.background = colors[this.options.type];
        
        // 메시지
        const messageElement = document.createElement('span');
        messageElement.textContent = this.options.message;
        this.element.appendChild(messageElement);
        
        // 닫기 버튼
        if (this.options.dismissible) {
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '×';
            closeButton.style.cssText = `
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                margin-left: 15px;
                padding: 0;
            `;
            closeButton.addEventListener('click', () => this.hide());
            this.element.appendChild(closeButton);
        }
        
        document.body.appendChild(this.element);
    }

    show() {
        setTimeout(() => {
            this.element.style.transform = 'translateY(0)';
        }, 10);
        
        if (this.options.autoHide && this.options.duration > 0) {
            setTimeout(() => this.hide(), this.options.duration);
        }
    }

    hide() {
        const translateY = this.options.position === 'top' ? '-100%' : '100%';
        this.element.style.transform = `translateY(${translateY})`;
        
        setTimeout(() => {
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }, 300);
    }
}

/**
 * 컴포넌트 팩토리
 */
class ComponentFactory {
    static components = {
        'date-input': DateInput,
        'calculate-button': CalculateButton,
        'result-card': ResultCard,
        'progress-bar': ProgressBar,
        'tooltip': Tooltip,
        'notification-banner': NotificationBanner
    };
    
    static create(type, element, options = {}) {
        const ComponentClass = this.components[type];
        if (!ComponentClass) {
            throw new Error(`Unknown component type: ${type}`);
        }
        
        return new ComponentClass(element, options);
    }
    
    static register(type, ComponentClass) {
        this.components[type] = ComponentClass;
    }
    
    static autoInit(container = document) {
        // 데이터 속성을 통한 자동 초기화
        container.querySelectorAll('[data-component]').forEach(element => {
            const type = element.dataset.component;
            const options = element.dataset.options ? 
                JSON.parse(element.dataset.options) : {};
            
            try {
                this.create(type, element, options);
            } catch (error) {
                console.warn(`Failed to initialize component: ${type}`, error);
            }
        });
    }
}

// 전역 노출
window.ComponentFactory = ComponentFactory;
window.DateInput = DateInput;
window.CalculateButton = CalculateButton;
window.ResultCard = ResultCard;
window.ProgressBar = ProgressBar;
window.Tooltip = Tooltip;
window.NotificationBanner = NotificationBanner;

// DOM 로드 시 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
    ComponentFactory.autoInit();
});

// CSS 애니메이션 추가
const componentStyles = document.createElement('style');
componentStyles.textContent = `
    .animate-pulse {
        animation: pulse 1s ease-in-out;
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    
    .animate-bounce {
        animation: bounce 1s ease-in-out;
    }
    
    @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
    }
    
    .calc-btn.loading {
        position: relative;
        pointer-events: none;
    }
    
    .calc-btn.loading::after {
        content: '';
        position: absolute;
        width: 16px;
        height: 16px;
        margin: auto;
        border: 2px solid transparent;
        border-top-color: currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }
`;
document.head.appendChild(componentStyles);