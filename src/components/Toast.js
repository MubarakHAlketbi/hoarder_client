export class Toast extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.timeout = null;
    }

    static get observedAttributes() {
        return ['type', 'duration'];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    show(message, type = '', duration = 3000) {
        this.setAttribute('type', type);
        this.setAttribute('duration', duration);
        
        const messageElement = this.shadowRoot.querySelector('.toast-message');
        if (messageElement) {
            messageElement.textContent = message;
        }

        this.classList.remove('hidden');
        
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            this.hide();
        }, duration);
    }

    hide() {
        this.classList.add('hidden');
        clearTimeout(this.timeout);
    }

    render() {
        const type = this.getAttribute('type') || '';
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    bottom: var(--space-xl);
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 9999;
                    transition: all var(--transition-normal);
                    opacity: 1;
                    visibility: visible;
                }

                :host(.hidden) {
                    opacity: 0;
                    visibility: hidden;
                }

                .toast {
                    background: var(--toast-bg);
                    color: var(--toast-text);
                    padding: var(--space-md) var(--space-lg);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-lg);
                    font-size: var(--text-sm);
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                }

                .toast.error {
                    background: var(--error);
                    color: white;
                }

                .toast.success {
                    background: var(--success);
                    color: white;
                }

                .toast.warning {
                    background: var(--warning);
                    color: var(--text-dark);
                }

                .toast-icon {
                    font-size: var(--text-lg);
                }
            </style>

            <div class="toast ${type}">
                ${this.getIconForType(type)}
                <span class="toast-message"></span>
            </div>
        `;
    }

    getIconForType(type) {
        const icons = {
            error: '❌',
            success: '✅',
            warning: '⚠️',
            '': 'ℹ️'
        };

        return `<span class="toast-icon">${icons[type]}</span>`;
    }
}

customElements.define('toast-notification', Toast);

// Create a singleton instance for global toast notifications
let toastInstance = null;

export function showToast(message, type = '', duration = 3000) {
    if (!toastInstance) {
        toastInstance = document.createElement('toast-notification');
        document.body.appendChild(toastInstance);
    }
    toastInstance.show(message, type, duration);
}