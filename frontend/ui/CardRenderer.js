/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/ui/CardRenderer.js */
async function getActionDetailsHtml(entry, context) {
    const { pluginUIService } = context;
    const actionConfig = entry.actionConfig;
    const pluginId = actionConfig?.pluginId;

    if (!pluginId || pluginId === 'none') return "";

    await pluginUIService.loadPluginFrontendModule(pluginId);
    const detailRenderer = pluginUIService.getActionDisplayDetailsRenderer(pluginId);
    
    if (detailRenderer) {
        try {
            const detailsArray = detailRenderer(actionConfig.settings, context);
            return detailsArray.map(detail => {
                const isMdi = detail.iconType === 'mdi' || detail.icon?.startsWith('mdi-');
                const iconClass = `card-detail-icon ${isMdi ? `mdi ${detail.icon}` : 'material-icons'}`;
                const iconContent = isMdi ? '' : detail.icon || '';
                const iconHtml = detail.icon ? `<span class="${iconClass}">${iconContent}</span>` : '';
                return `<div class="card-detail-line">${iconHtml}<span class="card-detail-value ${detail.allowWrap ? 'allow-wrap' : ''}">${detail.value}</span></div>`;
            }).join('');
        } catch (renderError) {
            console.warn(`[Dashboard] Error rendering details for plugin '${pluginId}':`, renderError);
        }
    }
    return "";
}

export class CardRenderer {
    #cardContainer;
    #dashboardManager;
    #context;

    constructor(cardContainer, dashboardManager) {
        this.#cardContainer = cardContainer;
        this.#dashboardManager = dashboardManager;
        this.#context = this.#dashboardManager.getContext();
        this.#cardContainer.addEventListener('click', this.#handleCardClick);
    }

    #handleCardClick = (event) => {
        const card = (event.target).closest('.card-item');
        const gestureName = card?.dataset.gestureName;

        if (gestureName) {
            this.#context.services.pubsub.publish(this.#context.shared.constants.UI_EVENTS.REQUEST_EDIT_CONFIG, gestureName);
            this.#dashboardManager.toggleDashboard(false);
        }
    };

    async render() {
        const { coreStateManager, services: { translationService }, uiComponents } = this.#context;
        const { getGestureDisplayInfo } = this.#context.shared.services.actionDisplayUtils;
        if (!coreStateManager) return;

        this.#cardContainer.innerHTML = '';
        const state = coreStateManager.getState();
        const configs = state.gestureConfigs;
        
        const filteredConfigs = configs.filter(c => (c.gesture || c.pose) !== this.#dashboardManager.getPointerGestureName());

        if (!filteredConfigs || filteredConfigs.length === 0) {
            this.#renderEmptyState();
            return;
        }
        
        for (const config of filteredConfigs) {
            const name = config.gesture || config.pose;
            const { formattedName, category } = getGestureDisplayInfo(name, state.customGestureMetadataList);
            const gestureDisplayName = category === 'BUILT_IN_HAND' ? translationService.translate(formattedName, { defaultValue: formattedName }) : formattedName;

            const pluginId = config.actionConfig?.pluginId;
            const actionTypeDisplay = pluginId && pluginId !== 'none'
                ? translationService.translate(this.#context.pluginUIService.getPluginManifest(pluginId)?.nameKey, { defaultValue: pluginId })
                : translationService.translate('actionTypeNone');

            const cardTitle = actionTypeDisplay;
            const footerText = gestureDisplayName;
            const detailsHtml = await getActionDetailsHtml(config, this.#context);

            const card = uiComponents.createCardElement({
                ...this.#context.shared.services.actionDisplayUtils.getGestureCategoryIconDetails(category),
                title: cardTitle,
                detailsHtml: detailsHtml,
                footerConfig: { mainText: footerText },
                itemClasses: 'config-item min-h-[150px]',
                datasetAttributes: { gestureName: name },
                titleAttribute: translationService.translate('editTooltip', { item: name }),
                translate: translationService.translate,
            });
            this.#cardContainer.appendChild(card);
        }
    }
    
    #renderEmptyState() {
        const { services: { translationService }, uiComponents } = this.#context;
        const emptyStateDiv = document.createElement('div');
        emptyStateDiv.className = 'col-span-full flex flex-col items-center justify-center text-center gap-4 p-8 text-text-secondary dark:text-dark-text-secondary';

        const message = document.createElement('p');
        message.className = 'text-base max-w-sm';
        message.textContent = translationService.translate('dashboardEmptyMessage');
        
        const button = document.createElement('button');
        button.className = 'btn btn-primary';
        uiComponents.setIcon(button, 'UI_TUNE');
        button.append(translationService.translate('dashboardEmptyButton'));
        button.addEventListener('click', () => {
            this.#dashboardManager.toggleDashboard(false);
            this.#context.uiController?.sidebarManager.toggleConfigSidebar(true);
        });

        emptyStateDiv.append(message, button);
        this.#cardContainer.appendChild(emptyStateDiv);
    }
}