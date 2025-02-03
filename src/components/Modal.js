export class Modal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
        this._previouslyFocused = null;
    }

    static get observedAttributes() {
        return ['title', 'size'];
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    disconnectedCallback() {
        this.removeEventListeners();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown);
        this.shadowRoot.addEventListener('click', this.handleClickOutside);
        
        // Trap focus within modal
        const focusableElements = this.getFocusableElements();
        if (focusableElements.length) {
            this._previouslyFocused = document.activeElement;
            focusableElements[0].focus();
        }
    }

    removeEventListeners() {
        document.removeEventListener('keydown', this.handleKeyDown);
        this.shadowRoot.removeEventListener('click', this.handleClickOutside);
        
        if (this._previouslyFocused) {
            this._previouslyFocused.focus();
            this._previouslyFocused = null;
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Escape') {
            this.close();
            return;
        }

        if (e.key === 'Tab') {
            const focusableElements = this.getFocusableElements();
            const firstFocusable = focusableElements[0];
            const lastFocusable = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        }
    }

    handleClickOutside(e) {
        if (e.target.classList.contains('modal-overlay')) {
            this.close();
        }
    }

    getFocusableElements() {
        return Array.from(this.shadowRoot.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ));
    }

    show() {
        this.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.classList.add('hidden');
        document.body.style.overflow = '';
        this.dispatchEvent(new CustomEvent('modal-close'));
    }

    render() {
        const title = this.getAttribute('title') || '';
        const size = this.getAttribute('size') || 'medium';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                :host(.hidden) {
                    display: none;
                }

                .modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                }

                .modal-container {
                    position: relative;
                    background: var(--modal-bg);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-lg);
                    max-height: 90vh;
                    max-width: 90vw;
                    display: flex;
                    flex-direction: column;
                    z-index: 1;
                }

                .modal-container.small { width: 400px; }
                .modal-container.medium { width: 600px; }
                .modal-container.large { width: 800px; }

                .modal-header {
                    padding: var(--space-lg);
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .modal-title {
                    font-size: var(--text-lg);
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0;
                }

                .modal-close {
                    background: none;
                    border: none;
                    font-size: var(--text-lg);
                    cursor: pointer;
                    padding: var(--space-sm);
                    color: var(--text-secondary);
                    transition: color var(--transition-normal);
                }

                .modal-close:hover {
                    color: var(--text-primary);
                }

                .modal-content {
                    padding: var(--space-lg);
                    overflow-y: auto;
                }

                .modal-footer {
                    padding: var(--space-lg);
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    justify-content: flex-end;
                    gap: var(--space-md);
                }

                ::slotted(button) {
                    padding: var(--space-sm) var(--space-lg);
                    border-radius: var(--radius-md);
                    border: none;
                    cursor: pointer;
                    font-size: var(--text-sm);
                    transition: all var(--transition-normal);
                }

                ::slotted(button.primary) {
                    background: var(--primary);
                    color: white;
                }

                ::slotted(button.secondary) {
                    background: var(--secondary);
                    color: var(--text-primary);
                }
            </style>

            <div class="modal-overlay"></div>
            <div class="modal-container ${size}">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button type="button" class="modal-close" aria-label="Close">✕</button>
                </div>
                <div class="modal-content">
                    <slot></slot>
                </div>
                <div class="modal-footer">
                    <slot name="footer"></slot>
                </div>
            </div>
        `;

        // Add close button handler
        this.shadowRoot.querySelector('.modal-close')
            .addEventListener('click', () => this.close());
    }
}

customElements.define('modal-dialog', Modal);